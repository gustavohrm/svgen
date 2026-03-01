import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenRouterProvider } from "./open-router";
import { FetchOpenRouterClient } from "./clients";

describe("OpenRouterProvider", () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    provider = new OpenRouterProvider();
  });

  it("should fetch and filter models", async () => {
    const mockData = {
      data: [
        { id: "openai/gpt-3.5-turbo" },
        { id: "google/gemini-pro-1.5" },
        { id: "openai/dall-e-3" }, // Should be filtered out
        { id: "stabilityai/stable-diffusion-xl" }, // Should be filtered out
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const models = await provider.fetchModels("test-api-key");
    expect(models).toContain("openai/gpt-3.5-turbo");
    expect(models).toContain("google/gemini-pro-1.5");
    expect(models).not.toContain("openai/dall-e-3");
    expect(models).not.toContain("stabilityai/stable-diffusion-xl");
  });

  it("should generate and extract SVG", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              svgs: ["<svg>test-1</svg>", "<svg>test-2</svg>"],
            }),
          },
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await provider.generate({
      prompt: "test prompt",
      systemPrompt: "test system prompt",
      model: "test-model",
      apiKey: "test-key",
      count: 2,
      temperature: 1.1,
    });

    expect(result.svgs).toEqual(["<svg>test-1</svg>", "<svg>test-2</svg>"]);

    const fetchCall = (global.fetch as any).mock.calls[0];
    const payload = JSON.parse(fetchCall[1].body);
    expect(payload.temperature).toBe(1.1);
    expect(payload.response_format.type).toBe("json_schema");
  });

  it("should accumulate parsed variations across multiple responses", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  svgs: ["<svg>from-choice-1</svg>"],
                }),
              },
            },
            {
              message: {
                content: JSON.stringify({
                  svgs: ["<svg>from-choice-2</svg>"],
                }),
              },
            },
          ],
          usage: {
            prompt_tokens: 120,
            completion_tokens: 45,
            total_tokens: 165,
          },
        }),
    });

    const result = await provider.generate({
      prompt: "test prompt",
      systemPrompt: "test system prompt",
      model: "test-model",
      apiKey: "test-key",
      count: 2,
    });

    expect(result.svgs).toEqual(["<svg>from-choice-1</svg>", "<svg>from-choice-2</svg>"]);
    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 45, totalTokens: 165 });
  });

  it("should fall back to plain prompt when structured output is unsupported", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: () => Promise.resolve("response_format json_schema is not supported for this model"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    svgs: ["<svg>fallback</svg>"],
                  }),
                },
              },
            ],
          }),
      });

    const result = await provider.generate({
      prompt: "test prompt",
      systemPrompt: "test system prompt",
      model: "test-model",
      apiKey: "test-key",
      count: 1,
    });

    expect(result.svgs).toEqual(["<svg>fallback</svg>"]);
    expect((global.fetch as any).mock.calls).toHaveLength(2);

    const firstPayload = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(firstPayload.response_format).toBeDefined();

    const secondPayload = JSON.parse((global.fetch as any).mock.calls[1][1].body);
    expect(secondPayload.response_format).toBeUndefined();
  });

  it("should retry fallback request when fallback generation times out", async () => {
    const fastRetryProvider = new OpenRouterProvider(
      new FetchOpenRouterClient(global.fetch as typeof fetch, {
        generationTimeoutRetries: 1,
        retryDelayMs: 0,
      }),
    );

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: () => Promise.resolve("response_format json_schema is not supported for this model"),
      })
      .mockRejectedValueOnce(
        new Error(
          "Request to https://openrouter.ai/api/v1/chat/completions timed out after 120000ms.",
        ),
      )
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    svgs: ["<svg>fallback-timeout-retry</svg>"],
                  }),
                },
              },
            ],
          }),
      });

    const result = await fastRetryProvider.generate({
      prompt: "test prompt",
      systemPrompt: "test system prompt",
      model: "test-model",
      apiKey: "test-key",
      count: 1,
    });

    expect(result.svgs).toEqual(["<svg>fallback-timeout-retry</svg>"]);
    expect((global.fetch as any).mock.calls).toHaveLength(3);
  });

  it("should throw error when generation fails", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: () => Promise.resolve("API Down"),
    });

    await expect(
      provider.generate({
        prompt: "test",
        systemPrompt: "test",
        model: "test",
        apiKey: "test",
      }),
    ).rejects.toThrow("OpenRouter API error: 500 Internal Server Error - API Down");
  });
});
