import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoogleCloudProvider } from "./google-cloud";

describe("GoogleCloudProvider", () => {
  let provider: GoogleCloudProvider;

  beforeEach(() => {
    provider = new GoogleCloudProvider();
    vi.clearAllMocks();
    global.fetch = vi.fn();
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
            parts: [{ text: "The result is: <svg>gcp-test</svg>" }],
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
    });

    expect(result).toEqual(["<svg>gcp-test</svg>"]);
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
