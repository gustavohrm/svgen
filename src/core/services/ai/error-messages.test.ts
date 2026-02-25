import { describe, expect, it } from "vitest";
import { mapGenerationErrorToUserMessage } from "./error-messages";

describe("mapGenerationErrorToUserMessage", () => {
  it("maps timeout errors to actionable guidance", () => {
    const message = mapGenerationErrorToUserMessage(
      new Error("Request to https://api.test timed out after 30000ms."),
      { providerId: "open-router" },
    );

    expect(message).toContain("timed out");
    expect(message).toContain("fewer variations");
  });

  it("maps rate limit errors", () => {
    const message = mapGenerationErrorToUserMessage(
      new Error("OpenRouter API error: 429 Too Many Requests - rate limit exceeded"),
      { providerId: "open-router" },
    );

    expect(message).toContain("Rate limit reached");
  });

  it("maps high-demand Gemini errors with provider-specific guidance", () => {
    const message = mapGenerationErrorToUserMessage(
      new Error("GCP API error: 503 Service Unavailable - model is overloaded"),
      { providerId: "gcp" },
    );

    expect(message).toContain("Google Gemini model");
    expect(message).toContain("high demand");
  });

  it("maps authentication errors", () => {
    const message = mapGenerationErrorToUserMessage(
      new Error("GCP API error: 401 Unauthorized - invalid api key"),
      { providerId: "gcp" },
    );

    expect(message).toContain("Authentication failed");
  });
});
