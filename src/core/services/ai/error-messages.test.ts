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

  it("maps quota and billing errors", () => {
    const message = mapGenerationErrorToUserMessage(
      new Error("OpenRouter API error: quota exceeded due to billing limit"),
      { providerId: "open-router" },
    );

    expect(message.toLowerCase()).toContain("quota");
    expect(message.toLowerCase()).toContain("billing");
  });

  it("maps model-not-found and unsupported-model errors", () => {
    const message = mapGenerationErrorToUserMessage(
      new Error("GCP API error: model not found and unsupported model"),
      { providerId: "gcp" },
    );

    expect(message.toLowerCase()).toContain("model");
    expect(message.toLowerCase()).toContain("supported");
  });

  it("maps network failures", () => {
    const message = mapGenerationErrorToUserMessage(
      new Error("Failed to fetch due to network error"),
      {
        providerId: "open-router",
      },
    );

    expect(message.toLowerCase()).toContain("network");
  });

  it("maps safety and content-policy failures", () => {
    const message = mapGenerationErrorToUserMessage(
      new Error("Request blocked by content policy safety filters"),
      {
        providerId: "open-router",
      },
    );

    expect(message.toLowerCase()).toContain("content policy");
    expect(message.toLowerCase()).toContain("safety");
  });

  it("uses generic provider wording for non-gcp high-demand errors", () => {
    const message = mapGenerationErrorToUserMessage(
      new Error("OpenRouter API error: service temporarily unavailable due to high demand"),
      {
        providerId: "open-router",
      },
    );

    expect(message).toContain("the selected model");
    expect(message).toContain("high demand");
  });

  it("returns a safe generic message for unmatched errors", () => {
    const message = mapGenerationErrorToUserMessage(
      new Error("Internal stack trace: provider runtime panic at providers/foo.ts:123"),
      { providerId: "open-router" },
    );

    expect(message).toBe("Failed to generate SVG. Please try again.");
  });

  it("returns default generic message when error is undefined", () => {
    const message = mapGenerationErrorToUserMessage(undefined, {
      providerId: "gcp",
    });

    expect(message).toBe("Failed to generate SVG. Please try again.");
  });
});
