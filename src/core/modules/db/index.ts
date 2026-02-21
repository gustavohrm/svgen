export interface AppSettings {
  openRouterKey: string;
  gcpKey: string;
  selectedProvider: "openrouter" | "gcp";
  selectedModel: string;
  variations: number;
}

const defaultSettings: AppSettings = {
  openRouterKey: "",
  gcpKey: "",
  selectedProvider: "openrouter",
  selectedModel: "anthropic/claude-3.5-sonnet",
  variations: 1,
};

export const db = {
  getSettings(): AppSettings {
    const saved = localStorage.getItem("svgen_settings");
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
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
