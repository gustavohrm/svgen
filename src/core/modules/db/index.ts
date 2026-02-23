import { AiProviderId } from "../../types/index";

export interface ApiKeyItem {
  id: string; // unique identifier (e.g., timestamp or uuid)
  providerId: AiProviderId;
  name: string;
  value: string;
  createdAt: number;
  selectedModels: string[]; // List of models the user wants to see for this key
  availableModels?: string[]; // All fetched models for this key
}

export interface AppSettings {
  apiKeys: ApiKeyItem[];
  activeKeys: Record<string, string>; // providerId -> active keyId mapping
  variations: number;
  lastSelectedModel?: string;
  lastSelectedProviderId?: string;
}

const defaultSettings: AppSettings = {
  apiKeys: [],
  activeKeys: {},
  variations: 1,
  lastSelectedModel: undefined,
  lastSelectedProviderId: undefined,
};

export const db = {
  getSettings(): AppSettings {
    const saved = localStorage.getItem("svgen_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        // Handle migration from very old format
        if (parsed.openRouterKey || parsed.gcpKey) {
          parsed.apiKeys = parsed.apiKeys || (Array.isArray(parsed.apiKeys) ? parsed.apiKeys : []);
          const oldRecord = parsed.apiKeys as Record<string, unknown>;

          if (!Array.isArray(parsed.apiKeys)) {
            parsed.apiKeys = [];
            // Migrate from Record<string, string> -> Array<ApiKeyItem>
            if (oldRecord && typeof oldRecord === "object") {
              for (const [pId, value] of Object.entries(oldRecord)) {
                if (value && typeof value === "string") {
                  const providerId = (pId === "openrouter" ? "open-router" : pId) as AiProviderId;
                  parsed.apiKeys.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    providerId,
                    name: `Legacy ${providerId} key`,
                    value,
                    createdAt: Date.now(),
                    selectedModels: [],
                  });
                }
              }
            }
          }
          delete parsed.openRouterKey;
          delete parsed.gcpKey;
        }

        // Migrate from mid-level format
        if (parsed.apiKeys && !Array.isArray(parsed.apiKeys)) {
          const oldRecord = parsed.apiKeys as Record<string, unknown>;
          const newApiKeys: ApiKeyItem[] = [];

          for (const [pId, value] of Object.entries(oldRecord)) {
            if (value && typeof value === "string") {
              const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
              const providerId = (pId === "openrouter" ? "open-router" : pId) as AiProviderId;
              newApiKeys.push({
                id,
                providerId,
                name: `${providerId} key`,
                value,
                createdAt: Date.now(),
                selectedModels: [],
              });
              if (parsed.selectedProvider === pId) {
                parsed.activeKeyId = id;
              }
            }
          }
          parsed.apiKeys = newApiKeys;
        }

        // Cleanup old fields
        delete parsed.selectedProvider;
        delete parsed.selectedModel;

        const merged = { ...defaultSettings, ...parsed };

        if (!merged.activeKeys) {
          merged.activeKeys = {};
        }

        // Migrate older activeKeyId if it exists
        const oldParsed = parsed as { activeKeyId?: string };
        if (oldParsed.activeKeyId) {
          const oldActiveKey = merged.apiKeys.find(
            (k: ApiKeyItem) => k.id === oldParsed.activeKeyId,
          );
          if (oldActiveKey) {
            merged.activeKeys[oldActiveKey.providerId] = oldActiveKey.id;
          }
          delete oldParsed.activeKeyId;
        }

        // Auto-assign first key for any provider that doesn't have an active one
        for (const key of merged.apiKeys) {
          if (!merged.activeKeys[key.providerId]) {
            merged.activeKeys[key.providerId] = key.id;
          }
        }

        return merged;
      } catch (e) {
        return defaultSettings;
      }
    }
    return defaultSettings;
  },

  saveSettings(settings: Partial<AppSettings>) {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem("svgen_settings", JSON.stringify(updated));
    return updated;
  },
};
