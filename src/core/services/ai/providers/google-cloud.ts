import { AiProvider, ProviderGenerateOptions, ProviderConfigField } from "../../../types/index";

export class GoogleCloudProvider implements AiProvider {
  id = "gcp";
  name = "Google Cloud (Gemini)";

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
      const data = await res.json();
      return data.models.map((m: any) => m.name.replace("models/", ""));
    } catch (e) {
      console.error(e);
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
