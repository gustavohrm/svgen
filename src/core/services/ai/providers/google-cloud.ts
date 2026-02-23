import {
  AiProvider,
  ProviderGenerateOptions,
  ProviderConfigField,
  AiProviderId,
} from "../../../types/index";
import { extractSvgFromResult } from "../../../utils/svg-parser";

interface GCPApiModel {
  name: string;
  supportedGenerationMethods: string[];
}

export class GoogleCloudProvider implements AiProvider {
  id: AiProviderId = "gcp";
  name = "Google Cloud (Gemini)";
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
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );
      if (!res.ok) throw new Error("Failed to fetch GCP models");
      const data = (await res.json()) as { models: GCPApiModel[] };
      // Only include models that support generateContent (text/chat models)
      return data.models
        .filter((m) => m.supportedGenerationMethods.includes("generateContent"))
        .map((m) => m.name.replace("models/", ""));
    } catch (error: unknown) {
      console.error("Failed to fetch GCP models:", error);
      return [];
    }
  }

  async generate(options: ProviderGenerateOptions): Promise<string> {
    const { prompt, systemPrompt, model, apiKey } = options;

    if (!apiKey) {
      throw new Error("GCP (Gemini) API key is required");
    }

    const payload = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`GCP API error: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return extractSvgFromResult(result);
  }
}
