import type { AiProviderId } from "../../types/index";

interface ErrorMappingContext {
  providerId?: AiProviderId;
}

function getErrorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error ?? "");
}

function includesAny(text: string, fragments: string[]): boolean {
  return fragments.some((fragment) => text.includes(fragment));
}

export function mapGenerationErrorToUserMessage(
  error: unknown,
  context: ErrorMappingContext = {},
): string {
  const rawText = getErrorText(error);
  const normalized = rawText.toLowerCase();
  const providerName = context.providerId === "gcp" ? "Google Gemini" : "the selected model";

  if (includesAny(normalized, ["timed out", "timeout"])) {
    return "Generation took too long and timed out. Try fewer variations, a faster model, or a simpler prompt.";
  }

  if (
    normalized.includes("429") ||
    includesAny(normalized, ["rate limit", "too many requests", "rate_limit"]) ||
    normalized.includes("resource exhausted")
  ) {
    return "Rate limit reached. Wait a bit, then try again. If this keeps happening, switch to a faster/less busy model.";
  }

  if (
    includesAny(normalized, [
      "model is overloaded",
      "overloaded",
      "high demand",
      "service unavailable",
      "currently unavailable",
      "temporarily unavailable",
      "over capacity",
      "capacity",
      "unavailable",
    ])
  ) {
    if (context.providerId === "gcp") {
      return "This Google Gemini model is currently under high demand. Try again shortly or switch to another Gemini model.";
    }

    return `${providerName} is currently under high demand. Try again shortly or switch models.`;
  }

  if (
    normalized.includes("401") ||
    normalized.includes("403") ||
    includesAny(normalized, [
      "api key",
      "invalid key",
      "invalid api key",
      "unauthorized",
      "permission denied",
      "forbidden",
      "authentication",
    ])
  ) {
    return "Authentication failed for this provider. Check that your API key is valid and has the required permissions.";
  }

  if (
    includesAny(normalized, [
      "quota",
      "billing",
      "insufficient credits",
      "insufficient balance",
      "exceeded your current quota",
    ])
  ) {
    return "Your API quota or billing limit appears to be reached. Check your provider billing/quota settings and try again.";
  }

  if (
    includesAny(normalized, [
      "model not found",
      "does not exist",
      "unknown model",
      "unsupported model",
      "is not found",
    ])
  ) {
    return "The selected model is unavailable or no longer supported. Choose another model and try again.";
  }

  if (includesAny(normalized, ["failed to fetch", "networkerror", "network error", "econnreset"])) {
    return "Network error while contacting the AI provider. Check your connection and try again.";
  }

  if (includesAny(normalized, ["safety", "blocked", "policy violation", "content policy"])) {
    return "The provider blocked this request due to safety/content policy checks. Try a safer or more specific prompt.";
  }

  if (rawText.trim().length > 0) {
    return rawText;
  }

  return "Failed to generate SVG. Please try again.";
}
