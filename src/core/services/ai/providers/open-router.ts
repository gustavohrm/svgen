import {
  AiProvider,
  ProviderGenerateOptions,
  ProviderConfigField,
  AiProviderId,
} from "../../../types/index";
import { extractSvgFromResult } from "../../../utils/svg-parser";
import { FetchOpenRouterClient, OpenRouterClient } from "./clients";

export class OpenRouterProvider implements AiProvider {
  constructor(private readonly client: OpenRouterClient = new FetchOpenRouterClient()) {}

  id: AiProviderId = "open-router";
  name = "OpenRouter";
  icon = "/assets/open-router.svg";

  configFields: ProviderConfigField[] = [
    {
      id: "apiKey",
      label: "OpenRouter API Key",
      placeholder: "sk-or-v1-...",
      type: "password",
    },
  ];

  async fetchModels(apiKey: string): Promise<string[]> {
    try {
      const models = await this.client.fetchModels(apiKey);
      // Filter for models that likely support text/chat
      // OpenRouter models usually have 'id'. Some might be image models (like dall-e-3).
      // We can filter out known image models or check for specific properties.
      return models.filter((m) => {
        const id = m.toLowerCase();
        // Exclude known image-only models
        return !id.includes("dall-e") && !id.includes("stable-diffusion") && !id.includes("flux");
      });
    } catch (error: unknown) {
      console.error("Failed to fetch OpenRouter models:", error);
      return [];
    }
  }

  async generate(options: ProviderGenerateOptions): Promise<string[]> {
    const { prompt, systemPrompt, model, apiKey, count = 1, temperature } = options;

    if (!apiKey) {
      throw new Error("OpenRouter API key is required");
    }

    const choices = await this.client.generate({
      prompt,
      systemPrompt,
      model,
      apiKey,
      count,
      temperature,
      appOrigin: typeof window === "undefined" ? "http://localhost" : window.location.origin,
      appName: "SVGen",
    });

    return choices.map((choice) => extractSvgFromResult(choice));
  }
}
