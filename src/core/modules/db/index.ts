export interface AppSettings {
  apiKeys: Record<string, string>;
  selectedProvider: string;
  selectedModel: string;
  variations: number;
}

const defaultSettings: AppSettings = {
  apiKeys: {},
  selectedProvider: "openrouter",
  selectedModel: "anthropic/claude-3.5-sonnet",
  variations: 1,
};

export const db = {
  getSettings(): AppSettings {
    const saved = localStorage.getItem("svgen_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.openRouterKey || parsed.gcpKey) {
          parsed.apiKeys = parsed.apiKeys || {};
          if (parsed.openRouterKey) {
            parsed.apiKeys["openrouter"] = parsed.openRouterKey;
            delete parsed.openRouterKey;
          }
          if (parsed.gcpKey) {
            parsed.apiKeys["gcp"] = parsed.gcpKey;
            delete parsed.gcpKey;
          }
          localStorage.setItem("svgen_settings", JSON.stringify(parsed));
        }
        return { ...defaultSettings, ...parsed };
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
