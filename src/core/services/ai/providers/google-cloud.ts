import {
  AiProvider,
  ProviderGenerateOptions,
  ProviderConfigField,
  AiProviderId,
} from "../../../types/index";
import { FetchGoogleCloudClient, GoogleCloudClient } from "./clients";
import { parseSvgVariationsFromResponses } from "../structured-output";

export class GoogleCloudProvider implements AiProvider {
  constructor(private readonly client: GoogleCloudClient = new FetchGoogleCloudClient()) {}

  id: AiProviderId = "gcp";
  name = "Google";
  icon = "/assets/google.svg";

  configFields: ProviderConfigField[] = [
    {
      id: "apiKey",
      label: "GCP API Key",
      placeholder: "AIzaSy...",
      type: "password",
    },
  ];

  async fetchModels(apiKey: string): Promise<string[]> {
    if (!apiKey) return [];
    try {
      return this.client.fetchModels(apiKey);
    } catch (error: unknown) {
      console.error("Failed to fetch GCP models:", error);
      return [];
    }
  }

  async generate(options: ProviderGenerateOptions): Promise<string[]> {
    const { prompt, systemPrompt, model, apiKey, count = 1, temperature } = options;

    if (!apiKey) {
      throw new Error("GCP (Gemini) API key is required");
    }

    const responses = await this.client.generate({
      prompt,
      systemPrompt,
      model,
      apiKey,
      temperature,
    });

    return parseSvgVariationsFromResponses(responses, count);
  }
}
