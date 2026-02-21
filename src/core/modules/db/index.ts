export interface ApiKeyItem {
  id: string; // unique identifier (e.g., timestamp or uuid)
  providerId: string;
  name: string;
  value: string;
  createdAt: number;
  selectedModels: string[]; // List of models the user wants to see for this key
  availableModels?: string[]; // All fetched models for this key
}

export interface AppSettings {
  apiKeys: ApiKeyItem[];
  activeKeyId: string | null;
  variations: number;
}

const defaultSettings: AppSettings = {
  apiKeys: [],
  activeKeyId: null,
  variations: 1,
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
          const oldRecord = parsed.apiKeys as any;

          if (!Array.isArray(parsed.apiKeys)) {
            parsed.apiKeys = [];
            // Migrate from Record<string, string> -> Array<ApiKeyItem>
            if (oldRecord && typeof oldRecord === "object") {
              for (const [providerId, value] of Object.entries<string>(oldRecord)) {
                if (value && typeof value === "string") {
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
          const oldRecord = parsed.apiKeys as any;
          const newApiKeys: ApiKeyItem[] = [];

          for (const [providerId, value] of Object.entries<string>(oldRecord)) {
            if (value && typeof value === "string") {
              const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
              newApiKeys.push({
                id,
                providerId,
                name: `${providerId} key`,
                value,
                createdAt: Date.now(),
                selectedModels: [],
              });
              if (parsed.selectedProvider === providerId) {
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

        // Ensure activeKeyId is valid
        if (
          merged.apiKeys.length > 0 &&
          (!merged.activeKeyId ||
            !merged.apiKeys.find((k: ApiKeyItem) => k.id === merged.activeKeyId))
        ) {
          merged.activeKeyId = merged.apiKeys[0].id;
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
