import { AiProvider, ProviderGenerateOptions } from "../../../types/index";

export class OpenRouterProvider implements AiProvider {
  id = "openrouter";
  name = "OpenRouter";

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
