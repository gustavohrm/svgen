import { describe, expect, it, vi } from "vitest";
import { FetchGoogleCloudClient, FetchOpenRouterClient } from "./clients";

describe("FetchOpenRouterClient", () => {
  it("sends dynamic schema and consistency params", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({ svgs: ["<svg>ok</svg>"] }),
            },
          },
        ],
      }),
    } as Response);

    const client = new FetchOpenRouterClient(fetchMock);

    await client.generate({
      prompt: "test",
      systemPrompt: "test",
      model: "openai/gpt-4.1-mini",
      apiKey: "test-key",
      appOrigin: "http://localhost",
      appName: "SVGen",
      count: 3,
      topP: 0.82,
      maxOutputTokens: 4096,
    });

    const requestPayload = JSON.parse((fetchMock as any).mock.calls[0][1].body);
    expect(requestPayload.top_p).toBe(0.82);
    expect(requestPayload.max_tokens).toBe(4096);
    expect(requestPayload.response_format.json_schema.schema.properties.svgs.minItems).toBe(3);
    expect(requestPayload.response_format.json_schema.schema.properties.svgs.maxItems).toBe(3);
  });
});

describe("FetchGoogleCloudClient", () => {
  it("sends dynamic schema and consistency params", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify({ svgs: ["<svg>ok</svg>"] }) }],
            },
          },
        ],
      }),
    } as Response);

    const client = new FetchGoogleCloudClient(fetchMock);

    await client.generate({
      prompt: "test",
      systemPrompt: "test",
      model: "gemini-2.5-flash",
      apiKey: "test-key",
      count: 2,
      topP: 0.81,
      maxOutputTokens: 5000,
    });

    const requestPayload = JSON.parse((fetchMock as any).mock.calls[0][1].body);
    expect(requestPayload.generationConfig.topP).toBe(0.81);
    expect(requestPayload.generationConfig.maxOutputTokens).toBe(5000);
    expect(requestPayload.generationConfig.responseSchema.properties.svgs.minItems).toBe(2);
    expect(requestPayload.generationConfig.responseSchema.properties.svgs.maxItems).toBe(2);
  });

  it("retries once when generation times out", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("Request to https://example.test timed out after 50ms."))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ svgs: ["<svg>ok</svg>"] }) }],
              },
            },
          ],
        }),
      } as Response);

    const client = new FetchGoogleCloudClient(fetchMock, {
      generationTimeoutMs: 50,
      generationTimeoutRetries: 1,
      retryDelayMs: 0,
    });

    const result = await client.generate({
      prompt: "test",
      systemPrompt: "test",
      model: "gemini-2.5-flash",
      apiKey: "test-key",
    });

    expect(result).toEqual([JSON.stringify({ svgs: ["<svg>ok</svg>"] })]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry when generation fails for non-timeout errors", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("Network request failed unexpectedly."));

    const client = new FetchGoogleCloudClient(fetchMock, {
      generationTimeoutMs: 50,
      generationTimeoutRetries: 1,
      retryDelayMs: 0,
    });

    await expect(
      client.generate({
        prompt: "test",
        systemPrompt: "test",
        model: "gemini-2.5-flash",
        apiKey: "test-key",
      }),
    ).rejects.toThrow("Network request failed unexpectedly.");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
