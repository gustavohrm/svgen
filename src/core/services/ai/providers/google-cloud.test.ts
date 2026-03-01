import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoogleCloudProvider } from "./google-cloud";

describe("GoogleCloudProvider", () => {
  let provider: GoogleCloudProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    provider = new GoogleCloudProvider();
  });

  it("should fetch and filter models by supportedGenerationMethods", async () => {
    const mockData = {
      models: [
        {
          name: "models/gemini-1.5-pro",
          supportedGenerationMethods: ["generateContent"],
        },
        {
          name: "models/gemini-1.5-flash",
          supportedGenerationMethods: ["generateContent"],
        },
        {
          name: "models/embedding-001",
          supportedGenerationMethods: ["embedContent"], // Should be filtered out
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const models = await provider.fetchModels("test-key");
    expect(models).toContain("gemini-1.5-pro");
    expect(models).toContain("gemini-1.5-flash");
    expect(models).not.toContain("embedding-001");
  });

  it("should generate and extract SVG", async () => {
    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  svgs: ["<svg>gcp-test-1</svg>", "<svg>gcp-test-2</svg>"],
                }),
              },
            ],
          },
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await provider.generate({
      prompt: "test",
      systemPrompt: "test",
      model: "test-model",
      apiKey: "test-key",
      count: 2,
      temperature: 0.3,
    });

    expect(result.svgs).toEqual(["<svg>gcp-test-1</svg>", "<svg>gcp-test-2</svg>"]);

    const fetchCall = (global.fetch as any).mock.calls[0];
    const payload = JSON.parse(fetchCall[1].body);
    expect(payload.generationConfig.temperature).toBe(0.3);
    expect(payload.generationConfig.responseMimeType).toBe("application/json");
  });

  it("should accumulate parsed variations across multiple candidates", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      svgs: ["<svg>candidate-1</svg>"],
                    }),
                  },
                ],
              },
            },
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      svgs: ["<svg>candidate-2</svg>"],
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 220,
            candidatesTokenCount: 80,
            totalTokenCount: 300,
          },
        }),
    });

    const result = await provider.generate({
      prompt: "test",
      systemPrompt: "test",
      model: "test-model",
      apiKey: "test-key",
      count: 2,
    });

    expect(result.svgs).toEqual(["<svg>candidate-1</svg>", "<svg>candidate-2</svg>"]);
    expect(result.usage).toEqual({ inputTokens: 220, outputTokens: 80, totalTokens: 300 });
  });

  it("should retry without structured output when model does not support schema", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: () => Promise.resolve("responseSchema is not supported for this model"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        svgs: ["<svg>fallback</svg>"],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
      });

    const result = await provider.generate({
      prompt: "test",
      systemPrompt: "test",
      model: "test-model",
      apiKey: "test-key",
      count: 1,
    });

    expect(result.svgs).toEqual(["<svg>fallback</svg>"]);
    expect((global.fetch as any).mock.calls).toHaveLength(2);

    const firstPayload = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(firstPayload.generationConfig.responseSchema).toBeDefined();

    const secondPayload = JSON.parse((global.fetch as any).mock.calls[1][1].body);
    expect(secondPayload.generationConfig.responseSchema).toBeUndefined();
  });

  it("should throw error if no API key is provided", async () => {
    await expect(
      provider.generate({
        prompt: "test",
        systemPrompt: "test",
        model: "test",
        apiKey: "",
      }),
    ).rejects.toThrow("GCP (Gemini) API key is required");
  });
});
