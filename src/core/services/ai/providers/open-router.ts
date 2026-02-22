import {
  AiProvider,
  ProviderGenerateOptions,
  ProviderConfigField,
  AiProviderId,
} from "../../../types/index";

export class OpenRouterProvider implements AiProvider {
  id: AiProviderId = "open-router";
  name = "OpenRouter";

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
      const data = await res.json();
      // Filter for models that likely support text/chat
      // OpenRouter models usually have 'id'. Some might be image models (like dall-e-3).
      // We can filter out known image models or check for specific properties.
      return data.data
        .filter((m: any) => {
          const id = m.id.toLowerCase();
          // Exclude known image-only models
          return !id.includes("dall-e") && !id.includes("stable-diffusion") && !id.includes("flux");
        })
        .map((m: any) => m.id);
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  async generate(options: ProviderGenerateOptions): Promise<string> {
    const { prompt, systemPrompt, model, apiKey } = options;

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
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`OpenRouter API error: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    const result = data.choices[0]?.message?.content || "";
    return this.extractResult(result);
  }

  private extractResult(text: string): string {
    const start = text.indexOf("<svg");
    const end = text.lastIndexOf("</svg>");
    if (start !== -1 && end !== -1) {
      return text.substring(start, end + 6);
    }
    return text;
  }
}
