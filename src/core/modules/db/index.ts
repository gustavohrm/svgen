import { AiProviderId } from "../../types/index";
import {
  DEFAULT_COLOR_PALETTE_ID,
  isColorPaletteId,
  type ColorPaletteId,
} from "../../constants/color-palettes";
import { createId } from "../../utils/id";

export interface UsageCounters {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestCount: number;
}

export interface UsageProviderSnapshot extends UsageCounters {
  models: Record<string, UsageCounters>;
}

export interface UsageSnapshot extends UsageCounters {
  providers: Partial<Record<AiProviderId, UsageProviderSnapshot>>;
  updatedAt?: number;
}

export interface ApiKeyItem {
  id: string;
  providerId: AiProviderId;
  name: string;
  value: string;
  createdAt: number;
  selectedModels: string[];
  availableModels?: string[];
}

export interface AppSettings {
  apiKeys: ApiKeyItem[];
  activeKeys: Record<string, string>;
  variations: number;
  temperature: number;
  systemPrompt: string;
  colorPaletteId: ColorPaletteId;
  lastSelectedModel?: string;
  lastSelectedProviderId?: string;
  usage: UsageSnapshot;
}

function createEmptyUsageCounters(): UsageCounters {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    requestCount: 0,
  };
}

function createEmptyUsageSnapshot(): UsageSnapshot {
  return {
    ...createEmptyUsageCounters(),
    providers: {},
    updatedAt: undefined,
  };
}

const defaultSettings: AppSettings = {
  apiKeys: [],
  activeKeys: {},
  variations: 4,
  temperature: 0.7,
  systemPrompt: "",
  colorPaletteId: DEFAULT_COLOR_PALETTE_ID,
  lastSelectedModel: undefined,
  lastSelectedProviderId: undefined,
  usage: createEmptyUsageSnapshot(),
};

interface LegacySettingsPayload {
  activeKeyId?: string;
  selectedProvider?: string;
  selectedModel?: string;
  openRouterKey?: string;
  gcpKey?: string;
  apiKeys?: unknown;
  activeKeys?: Record<string, string>;
  usage?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toLegacyProviderId(rawProviderId: string): AiProviderId {
  return (rawProviderId === "openrouter" ? "open-router" : rawProviderId) as AiProviderId;
}

function cloneApiKeyItem(key: ApiKeyItem): ApiKeyItem {
  return {
    ...key,
    selectedModels: [...(key.selectedModels || [])],
    availableModels: key.availableModels ? [...key.availableModels] : undefined,
  };
}

function cloneSettings(settings: AppSettings): AppSettings {
  const providers = Object.fromEntries(
    Object.entries(settings.usage.providers).map(([providerId, providerUsage]) => [
      providerId,
      {
        ...providerUsage,
        models: Object.fromEntries(
          Object.entries(providerUsage.models).map(([model, modelUsage]) => [
            model,
            { ...modelUsage },
          ]),
        ),
      },
    ]),
  ) as Partial<Record<AiProviderId, UsageProviderSnapshot>>;

  return {
    ...settings,
    apiKeys: settings.apiKeys.map((key) => cloneApiKeyItem(key)),
    activeKeys: { ...settings.activeKeys },
    usage: {
      ...settings.usage,
      providers,
    },
  };
}

function sanitizeUsageCounterValue(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

function normalizeUsageCounters(input: unknown): UsageCounters {
  if (!isRecord(input)) {
    return createEmptyUsageCounters();
  }

  return {
    inputTokens: sanitizeUsageCounterValue(input.inputTokens),
    outputTokens: sanitizeUsageCounterValue(input.outputTokens),
    totalTokens: sanitizeUsageCounterValue(input.totalTokens),
    requestCount: sanitizeUsageCounterValue(input.requestCount),
  };
}

function normalizeUsageSnapshot(input: unknown): UsageSnapshot {
  if (!isRecord(input)) {
    return createEmptyUsageSnapshot();
  }

  const baseCounters = normalizeUsageCounters(input);
  const normalizedProviders: Partial<Record<AiProviderId, UsageProviderSnapshot>> = {};
  const providersRaw = isRecord(input.providers) ? input.providers : {};

  for (const [providerId, providerRaw] of Object.entries(providersRaw)) {
    if (providerId !== "gcp" && providerId !== "open-router") {
      continue;
    }

    if (!isRecord(providerRaw)) {
      continue;
    }

    const providerCounters = normalizeUsageCounters(providerRaw);
    const modelsRaw = isRecord(providerRaw.models) ? providerRaw.models : {};
    const models: Record<string, UsageCounters> = {};

    for (const [model, modelUsage] of Object.entries(modelsRaw)) {
      if (!model) {
        continue;
      }

      models[model] = normalizeUsageCounters(modelUsage);
    }

    normalizedProviders[providerId as AiProviderId] = {
      ...providerCounters,
      models,
    };
  }

  const updatedAt = sanitizeUsageCounterValue(input.updatedAt);

  return {
    ...baseCounters,
    providers: normalizedProviders,
    updatedAt: updatedAt > 0 ? updatedAt : undefined,
  };
}

/**
 * Normalize a partial settings payload into a complete, validated AppSettings object.
 *
 * Converts and validates each setting field, ensuring types and value ranges are correct and
 * providing sensible defaults for missing or invalid fields.
 *
 * @param input - Partial settings to normalize
 * @returns A fully populated AppSettings where:
 *  - `apiKeys` is an array (cloned) or empty array
 *  - `activeKeys` contains only string key IDs
 *  - `variations` is an integer clamped to the range 1–4
 *  - `temperature` is clamped to the range 0.0–2.0 with one-decimal precision
 *  - `systemPrompt` is a string or the default prompt
 *  - `colorPaletteId` is validated and falls back to the default palette ID when invalid
 *  - `lastSelectedModel` and `lastSelectedProviderId` are strings or their default values
 */
function normalizeSettings(input: Partial<AppSettings>): AppSettings {
  return {
    apiKeys: Array.isArray(input.apiKeys) ? input.apiKeys.map((key) => cloneApiKeyItem(key)) : [],
    activeKeys: isRecord(input.activeKeys)
      ? Object.fromEntries(
          Object.entries(input.activeKeys).filter(([, keyId]) => typeof keyId === "string"),
        )
      : {},
    variations:
      typeof input.variations === "number" && Number.isFinite(input.variations)
        ? Math.max(1, Math.min(4, Math.round(input.variations)))
        : defaultSettings.variations,
    temperature:
      typeof input.temperature === "number" && Number.isFinite(input.temperature)
        ? Math.max(0, Math.min(2, Math.round(input.temperature * 10) / 10))
        : defaultSettings.temperature,
    systemPrompt:
      typeof input.systemPrompt === "string" ? input.systemPrompt : defaultSettings.systemPrompt,
    colorPaletteId: isColorPaletteId(input.colorPaletteId)
      ? input.colorPaletteId
      : defaultSettings.colorPaletteId,
    lastSelectedModel:
      typeof input.lastSelectedModel === "string"
        ? input.lastSelectedModel
        : defaultSettings.lastSelectedModel,
    lastSelectedProviderId:
      typeof input.lastSelectedProviderId === "string"
        ? input.lastSelectedProviderId
        : defaultSettings.lastSelectedProviderId,
    usage: normalizeUsageSnapshot(input.usage),
  };
}

export interface SettingsRepository {
  getSettings(): AppSettings;
  saveSettings(settings: Partial<AppSettings>, current?: AppSettings): AppSettings;
  setActiveKey(providerId: AiProviderId, keyId: string): AppSettings;
  toggleModelSelection(keyId: string, model: string, shouldSelect?: boolean): AppSettings;
  toggleModelSelections(
    updates: Array<{ keyId: string; model: string; shouldSelect?: boolean }>,
  ): AppSettings;
  setVariations(value: number): AppSettings;
  setTemperature(value: number): AppSettings;
  setSystemPrompt(value: string): AppSettings;
  setColorPaletteId(value: ColorPaletteId): AppSettings;
  recordUsage(usage: {
    providerId: AiProviderId;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  }): AppSettings;
}

export class BrowserSettingsRepository implements SettingsRepository {
  constructor(
    private readonly storage: Storage,
    private readonly storageKey: string = "svgen_settings",
  ) {}

  getSettings(): AppSettings {
    const saved = this.storage.getItem(this.storageKey);
    if (!saved) {
      return cloneSettings(defaultSettings);
    }

    try {
      const parsedUnknown = JSON.parse(saved) as unknown;
      if (!isRecord(parsedUnknown)) {
        throw new Error("Invalid settings payload in localStorage");
      }

      const parsed = parsedUnknown as LegacySettingsPayload & Record<string, unknown>;

      if (parsed.openRouterKey || parsed.gcpKey) {
        parsed.apiKeys = parsed.apiKeys || (Array.isArray(parsed.apiKeys) ? parsed.apiKeys : []);
        const oldRecord = parsed.apiKeys as Record<string, unknown>;

        if (!Array.isArray(parsed.apiKeys)) {
          parsed.apiKeys = [];
          if (oldRecord && typeof oldRecord === "object") {
            for (const [providerIdRaw, value] of Object.entries(oldRecord)) {
              if (typeof value !== "string" || !value) continue;

              const providerId = toLegacyProviderId(providerIdRaw);
              (parsed.apiKeys as ApiKeyItem[]).push({
                id: createId("key"),
                providerId,
                name: `Legacy ${providerId} key`,
                value,
                createdAt: Date.now(),
                selectedModels: [],
              });
            }
          }
        }

        delete parsed.openRouterKey;
        delete parsed.gcpKey;
      }

      if (parsed.apiKeys && !Array.isArray(parsed.apiKeys)) {
        const oldRecord = parsed.apiKeys as Record<string, unknown>;
        const newApiKeys: ApiKeyItem[] = [];

        for (const [providerIdRaw, value] of Object.entries(oldRecord)) {
          if (typeof value !== "string" || !value) continue;

          const id = createId("key");
          const providerId = toLegacyProviderId(providerIdRaw);
          newApiKeys.push({
            id,
            providerId,
            name: `${providerId} key`,
            value,
            createdAt: Date.now(),
            selectedModels: [],
          });

          if (parsed.selectedProvider === providerIdRaw) {
            parsed.activeKeyId = id;
          }
        }

        parsed.apiKeys = newApiKeys;
      }

      delete parsed.selectedProvider;
      delete parsed.selectedModel;

      const merged = normalizeSettings({ ...defaultSettings, ...(parsed as Partial<AppSettings>) });

      if (!merged.activeKeys) {
        merged.activeKeys = {};
      }

      if (parsed.activeKeyId) {
        const oldActiveKey = merged.apiKeys.find((key) => key.id === parsed.activeKeyId);
        if (oldActiveKey) {
          merged.activeKeys[oldActiveKey.providerId] = oldActiveKey.id;
        }
        delete parsed.activeKeyId;
      }

      for (const key of merged.apiKeys) {
        if (!merged.activeKeys[key.providerId]) {
          merged.activeKeys[key.providerId] = key.id;
        }
      }

      return cloneSettings(merged);
    } catch (error: unknown) {
      console.warn("Failed to parse settings, falling back to defaults", error);
      return cloneSettings(defaultSettings);
    }
  }

  saveSettings(settings: Partial<AppSettings>, current?: AppSettings): AppSettings {
    const base = current || this.getSettings();
    const updated = normalizeSettings({ ...base, ...settings });
    this.storage.setItem(this.storageKey, JSON.stringify(updated));
    return cloneSettings(updated);
  }

  setActiveKey(providerId: AiProviderId, keyId: string): AppSettings {
    const current = this.getSettings();
    const key = current.apiKeys.find((item) => item.id === keyId && item.providerId === providerId);
    if (!key) {
      return current;
    }

    return this.saveSettings(
      {
        activeKeys: {
          ...current.activeKeys,
          [providerId]: keyId,
        },
      },
      current,
    );
  }

  toggleModelSelection(keyId: string, model: string, shouldSelect?: boolean): AppSettings {
    return this.toggleModelSelections([{ keyId, model, shouldSelect }]);
  }

  toggleModelSelections(
    updates: Array<{ keyId: string; model: string; shouldSelect?: boolean }>,
  ): AppSettings {
    if (updates.length === 0) {
      return this.getSettings();
    }

    const current = this.getSettings();
    const groupedUpdates = new Map<string, Array<{ model: string; shouldSelect?: boolean }>>();

    for (const update of updates) {
      const modelUpdates = groupedUpdates.get(update.keyId) || [];
      modelUpdates.push({ model: update.model, shouldSelect: update.shouldSelect });
      groupedUpdates.set(update.keyId, modelUpdates);
    }

    const apiKeys = current.apiKeys.map((key) => {
      const keyUpdates = groupedUpdates.get(key.id);
      if (!keyUpdates) {
        return key;
      }

      const selected = new Set(key.selectedModels);
      let changed = false;

      for (const update of keyUpdates) {
        const hasModel = selected.has(update.model);
        const nextShouldSelect = update.shouldSelect ?? !hasModel;

        if (nextShouldSelect && !hasModel) {
          selected.add(update.model);
          changed = true;
        }

        if (!nextShouldSelect && hasModel) {
          selected.delete(update.model);
          changed = true;
        }
      }

      if (!changed) {
        return key;
      }

      return {
        ...key,
        selectedModels: [...selected],
      };
    });

    return this.saveSettings({ apiKeys }, current);
  }

  setVariations(value: number): AppSettings {
    return this.saveSettings({ variations: value });
  }

  setTemperature(value: number): AppSettings {
    return this.saveSettings({ temperature: value });
  }

  setSystemPrompt(value: string): AppSettings {
    return this.saveSettings({ systemPrompt: value });
  }

  setColorPaletteId(value: ColorPaletteId): AppSettings {
    return this.saveSettings({ colorPaletteId: value });
  }

  recordUsage(usage: {
    providerId: AiProviderId;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  }): AppSettings {
    const current = this.getSettings();
    const inputTokens = sanitizeUsageCounterValue(usage.inputTokens);
    const outputTokens = sanitizeUsageCounterValue(usage.outputTokens);
    const totalTokens =
      typeof usage.totalTokens === "number" && Number.isFinite(usage.totalTokens)
        ? Math.max(0, Math.trunc(usage.totalTokens))
        : inputTokens + outputTokens;
    const requestCount = 1;

    const providerUsage = current.usage.providers[usage.providerId] ?? {
      ...createEmptyUsageCounters(),
      models: {},
    };
    const modelUsage = providerUsage.models[usage.model] ?? createEmptyUsageCounters();

    const nextUsage: UsageSnapshot = {
      inputTokens: current.usage.inputTokens + inputTokens,
      outputTokens: current.usage.outputTokens + outputTokens,
      totalTokens: current.usage.totalTokens + totalTokens,
      requestCount: current.usage.requestCount + requestCount,
      updatedAt: Date.now(),
      providers: {
        ...current.usage.providers,
        [usage.providerId]: {
          inputTokens: providerUsage.inputTokens + inputTokens,
          outputTokens: providerUsage.outputTokens + outputTokens,
          totalTokens: providerUsage.totalTokens + totalTokens,
          requestCount: providerUsage.requestCount + requestCount,
          models: {
            ...providerUsage.models,
            [usage.model]: {
              inputTokens: modelUsage.inputTokens + inputTokens,
              outputTokens: modelUsage.outputTokens + outputTokens,
              totalTokens: modelUsage.totalTokens + totalTokens,
              requestCount: modelUsage.requestCount + requestCount,
            },
          },
        },
      },
    };

    return this.saveSettings({ usage: nextUsage }, current);
  }
}
