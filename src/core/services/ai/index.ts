import { OpenRouterProvider } from "./providers/open-router";
import { GoogleCloudProvider } from "./providers/google-cloud";
import { GenerateOptions } from "../../types/index";
import { db } from "../../modules/db/index";

export const aiService = {
  async generate(options: Omit<GenerateOptions, "apiKey">): Promise<string> {
    const settings = db.getSettings();
    let apiKey = "";

    if (settings.selectedProvider === "openrouter") {
      apiKey = settings.openRouterKey;
      if (!apiKey) throw new Error("OpenRouter API key is missing. Please set it in settings.");
      const provider = new OpenRouterProvider();
      return provider.generate({ ...options, apiKey });
    } else {
      apiKey = settings.gcpKey;
      if (!apiKey) throw new Error("GCP (Gemini) API key is missing. Please set it in settings.");
      const provider = new GoogleCloudProvider();
      return provider.generate({ ...options, apiKey });
    }
  },

  async generateMultiple(
    options: Omit<GenerateOptions, "apiKey">,
    count: number,
  ): Promise<string[]> {
    // Generate them in parallel
    const promises = Array.from({ length: count }).map(() => this.generate(options));
    return Promise.all(promises);
  },
};
