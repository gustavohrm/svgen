import { describe, expect, it, vi } from "vitest";
import { FetchGoogleCloudClient } from "./clients";

describe("FetchGoogleCloudClient", () => {
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
