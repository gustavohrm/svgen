import { z } from "zod";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const openRouterModelsResponseSchema = z.object({
  data: z.array(
    z.object({
      id: z.string().min(1),
    }),
  ),
});

const openRouterMessagePartSchema = z.object({
  text: z.string().optional(),
});

const openRouterGenerateResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z
        .object({
          content: z.union([z.string(), z.array(openRouterMessagePartSchema)]).optional(),
        })
        .optional(),
    }),
  ),
});

const gcpModelsResponseSchema = z.object({
  models: z.array(
    z.object({
      name: z.string().min(1),
      supportedGenerationMethods: z.array(z.string()),
    }),
  ),
});

const gcpGenerateResponseSchema = z.object({
  candidates: z.array(
    z.object({
      content: z
        .object({
          parts: z.array(z.object({ text: z.string().optional() })).optional(),
        })
        .optional(),
    }),
  ),
});

function parseOpenRouterMessageContent(
  content: string | Array<{ text?: string }> | undefined,
): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .filter((text) => text.length > 0)
      .join("\n");
  }

  return "";
}

export interface OpenRouterClient {
  fetchModels(apiKey: string): Promise<string[]>;
  generate(options: {
    prompt: string;
    systemPrompt: string;
    model: string;
    apiKey: string;
    count: number;
    temperature?: number;
    appOrigin: string;
    appName: string;
  }): Promise<string[]>;
}

export interface GoogleCloudClient {
  fetchModels(apiKey: string): Promise<string[]>;
  generate(options: {
    prompt: string;
    systemPrompt: string;
    model: string;
    apiKey: string;
    count: number;
    temperature?: number;
  }): Promise<string[]>;
}

export class FetchOpenRouterClient implements OpenRouterClient {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  async fetchModels(apiKey: string): Promise<string[]> {
    const response = await this.fetchImpl("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch OpenRouter models");
    }

    const payload = openRouterModelsResponseSchema.parse(await response.json());
    return payload.data.map((model) => model.id);
  }

  async generate(options: {
    prompt: string;
    systemPrompt: string;
    model: string;
    apiKey: string;
    count: number;
    temperature?: number;
    appOrigin: string;
    appName: string;
  }): Promise<string[]> {
    const response = await this.fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey}`,
        "HTTP-Referer": options.appOrigin,
        "X-Title": options.appName,
      },
      body: JSON.stringify({
        model: options.model,
        messages: [
          { role: "system", content: options.systemPrompt },
          { role: "user", content: options.prompt },
        ],
        n: options.count,
        temperature: options.temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const payload = openRouterGenerateResponseSchema.parse(await response.json());
    return payload.choices.map((choice) => parseOpenRouterMessageContent(choice.message?.content));
  }
}

export class FetchGoogleCloudClient implements GoogleCloudClient {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  async fetchModels(apiKey: string): Promise<string[]> {
    const response = await this.fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch GCP models");
    }

    const payload = gcpModelsResponseSchema.parse(await response.json());
    return payload.models
      .filter((model) => model.supportedGenerationMethods.includes("generateContent"))
      .map((model) => model.name.replace("models/", ""));
  }

  async generate(options: {
    prompt: string;
    systemPrompt: string;
    model: string;
    apiKey: string;
    count: number;
    temperature?: number;
  }): Promise<string[]> {
    const payload = {
      system_instruction: {
        parts: [{ text: options.systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: options.prompt }],
        },
      ],
      generationConfig: {
        candidateCount: options.count,
        temperature: options.temperature,
      },
    };

    const response = await this.fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${options.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GCP API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const parsed = gcpGenerateResponseSchema.parse(await response.json());
    return parsed.candidates.map((candidate) => candidate.content?.parts?.[0]?.text ?? "");
  }
}
