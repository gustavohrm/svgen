import { AiProviderId } from "../../types/index";
import { createId } from "../../utils/id";

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
  lastSelectedModel?: string;
  lastSelectedProviderId?: string;
}

const defaultSettings: AppSettings = {
  apiKeys: [],
  activeKeys: {},
  variations: 4,
  temperature: 0.7,
  systemPrompt: "",
  lastSelectedModel: undefined,
  lastSelectedProviderId: undefined,
};

interface LegacySettingsPayload {
  activeKeyId?: string;
  selectedProvider?: string;
  selectedModel?: string;
  openRouterKey?: string;
  gcpKey?: string;
  apiKeys?: unknown;
  activeKeys?: Record<string, string>;
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
  return {
    ...settings,
    apiKeys: settings.apiKeys.map((key) => cloneApiKeyItem(key)),
    activeKeys: { ...settings.activeKeys },
  };
}

function normalizeSettings(input: Partial<AppSettings>): AppSettings {
  return {
    apiKeys: Array.isArray(input.apiKeys) ? input.apiKeys.map((key) => cloneApiKeyItem(key)) : [],
    activeKeys: isRecord(input.activeKeys)
      ? Object.fromEntries(
          Object.entries(input.activeKeys).filter(
            ([providerId, keyId]) => typeof providerId === "string" && typeof keyId === "string",
          ),
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
    lastSelectedModel:
      typeof input.lastSelectedModel === "string"
        ? input.lastSelectedModel
        : defaultSettings.lastSelectedModel,
    lastSelectedProviderId:
      typeof input.lastSelectedProviderId === "string"
        ? input.lastSelectedProviderId
        : defaultSettings.lastSelectedProviderId,
  };
}

export interface SettingsRepository {
  getSettings(): AppSettings;
  saveSettings(settings: Partial<AppSettings>): AppSettings;
  setActiveKey(providerId: AiProviderId, keyId: string): AppSettings;
  toggleModelSelection(keyId: string, model: string, shouldSelect?: boolean): AppSettings;
  toggleModelSelections(
    updates: Array<{ keyId: string; model: string; shouldSelect?: boolean }>,
  ): AppSettings;
  setVariations(value: number): AppSettings;
  setTemperature(value: number): AppSettings;
  setSystemPrompt(value: string): AppSettings;
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

  saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = normalizeSettings({ ...current, ...settings });
    this.storage.setItem(this.storageKey, JSON.stringify(updated));
    return cloneSettings(updated);
  }

  setActiveKey(providerId: AiProviderId, keyId: string): AppSettings {
    const current = this.getSettings();
    const key = current.apiKeys.find((item) => item.id === keyId && item.providerId === providerId);
    if (!key) {
      return current;
    }

    return this.saveSettings({
      activeKeys: {
        ...current.activeKeys,
        [providerId]: keyId,
      },
    });
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

    return this.saveSettings({ apiKeys });
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
}
