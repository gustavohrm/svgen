import { z } from "zod";
import { GCP_SVG_VARIATIONS_SCHEMA, SVG_VARIATIONS_JSON_SCHEMA } from "../structured-output";

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
    temperature?: number;
  }): Promise<string[]>;
}

/**
 * Detects whether a 4xx HTTP error indicates the API does not support structured output.
 *
 * @param status - The HTTP response status code
 * @param errorText - The response body or error message text
 * @returns `true` if the status is between 400 and 499 and the error text suggests structured-output fields (e.g., `response_format`, `json_schema`, `responseMimeType`) are unsupported or invalid, `false` otherwise.
 */
function isStructuredOutputUnsupportedError(status: number, errorText: string): boolean {
  if (status < 400 || status >= 500) {
    return false;
  }

  const normalized = errorText.toLowerCase();
  const indicatesStructuredOutputIssue =
    normalized.includes("response_format") ||
    normalized.includes("json_schema") ||
    normalized.includes("response schema") ||
    normalized.includes("responseschema") ||
    normalized.includes("responsemime") ||
    normalized.includes("responsemimetype") ||
    normalized.includes("structured output");
  const indicatesUnsupported =
    normalized.includes("not support") ||
    normalized.includes("unsupported") ||
    normalized.includes("not available") ||
    normalized.includes("not recognized") ||
    normalized.includes("unrecognized") ||
    normalized.includes("unknown") ||
    normalized.includes("unknown field") ||
    normalized.includes("invalid");

  return indicatesStructuredOutputIssue && indicatesUnsupported;
}

/**
 * Extracts and concatenates text parts from a Google Cloud generate candidate's content.
 *
 * Iterates candidate.content.parts, keeps only string `text` values, and joins them with newline characters. Returns an empty string if no text parts are present.
 *
 * @param candidate - The candidate object returned by Google Cloud Generate which may include `content.parts` with optional `text` fields.
 * @returns The concatenated text parts separated by `\n`, or an empty string if none.
 */
function parseGoogleCandidateText(candidate: {
  content?: {
    parts?: Array<{ text?: string }>;
  };
}): string {
  const parts = candidate.content?.parts ?? [];
  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .filter((text) => text.length > 0)
    .join("\n");
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
    temperature?: number;
    appOrigin: string;
    appName: string;
  }): Promise<string[]> {
    const endpoint = "https://openrouter.ai/api/v1/chat/completions";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`,
      "HTTP-Referer": options.appOrigin,
      "X-Title": options.appName,
    };

    const baseBody = {
      model: options.model,
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.prompt },
      ],
      temperature: options.temperature,
    };

    const structuredBody = {
      ...baseBody,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "svg_variations",
          strict: true,
          schema: SVG_VARIATIONS_JSON_SCHEMA,
        },
      },
    };

    let response = await this.fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(structuredBody),
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (!isStructuredOutputUnsupportedError(response.status, errorText)) {
        throw new Error(
          `OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      response = await this.fetchImpl(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(baseBody),
      });

      if (!response.ok) {
        const fallbackErrorText = await response.text();
        throw new Error(
          `OpenRouter API error: ${response.status} ${response.statusText} - ${fallbackErrorText}`,
        );
      }
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
    temperature?: number;
  }): Promise<string[]> {
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${options.apiKey}`;

    const baseGenerationConfig = {
      temperature: options.temperature,
    };

    const structuredPayload = {
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
        ...baseGenerationConfig,
        responseMimeType: "application/json",
        responseSchema: GCP_SVG_VARIATIONS_SCHEMA,
      },
    };

    const fallbackPayload = {
      system_instruction: structuredPayload.system_instruction,
      contents: structuredPayload.contents,
      generationConfig: baseGenerationConfig,
    };

    let response = await this.fetchImpl(generateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(structuredPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();

      if (!isStructuredOutputUnsupportedError(response.status, errorText)) {
        throw new Error(`GCP API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      response = await this.fetchImpl(generateUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fallbackPayload),
      });

      if (!response.ok) {
        const fallbackErrorText = await response.text();
        throw new Error(
          `GCP API error: ${response.status} ${response.statusText} - ${fallbackErrorText}`,
        );
      }
    }

    const parsed = gcpGenerateResponseSchema.parse(await response.json());
    return parsed.candidates.map((candidate) => parseGoogleCandidateText(candidate));
  }
}
