import { AiProvider, ProviderGenerateOptions } from "../../../types/index";

export class GoogleCloudProvider implements AiProvider {
  id = "gcp";
  name = "Google Cloud (Gemini)";

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
