import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenRouterProvider } from "./open-router";

describe("OpenRouterProvider", () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    provider = new OpenRouterProvider();
    vi.clearAllMocks();
    global.fetch = vi.fn();
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
            content: "Here is your SVG: <svg>test</svg>",
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
      temperature: 1.1,
    });

    expect(result).toEqual(["<svg>test</svg>"]);

    const fetchCall = (global.fetch as any).mock.calls[0];
    const payload = JSON.parse(fetchCall[1].body);
    expect(payload.temperature).toBe(1.1);
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
