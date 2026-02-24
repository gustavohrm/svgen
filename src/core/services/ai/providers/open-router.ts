import {
  AiProvider,
  ProviderGenerateOptions,
  ProviderConfigField,
  AiProviderId,
} from "../../../types/index";
import { extractSvgFromResult } from "../../../utils/svg-parser";

interface OpenRouterApiModel {
  id: string;
}

export class OpenRouterProvider implements AiProvider {
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
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch OpenRouter models");
      const data = (await res.json()) as { data: OpenRouterApiModel[] };
      // Filter for models that likely support text/chat
      // OpenRouter models usually have 'id'. Some might be image models (like dall-e-3).
      // We can filter out known image models or check for specific properties.
      return data.data
        .filter((m) => {
          const id = m.id.toLowerCase();
          // Exclude known image-only models
          return !id.includes("dall-e") && !id.includes("stable-diffusion") && !id.includes("flux");
        })
        .map((m) => m.id);
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

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "SVGen",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        n: count,
        temperature,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenRouter API error: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    const choices = data.choices || [];
    return choices.map((choice: any) => extractSvgFromResult(choice.message?.content || ""));
  }
}
