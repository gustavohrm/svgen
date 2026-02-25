import type { AiProviderId } from "../../types/index";

interface ErrorMappingContext {
  providerId?: AiProviderId;
}

/**
 * Extracts a user-facing message from an unknown error value.
 *
 * @param error - The value to extract a message from; may be an Error, string, null, or other types.
 * @returns The `message` property if `error` is an `Error`; otherwise the stringified `error`, using an empty string for `null` or `undefined`.
 */
function getErrorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error ?? "");
}

/**
 * Checks whether any of the provided substrings appear within the given text.
 *
 * @param text - The text to search
 * @param fragments - Substrings to look for in `text`
 * @returns `true` if at least one fragment is found in `text`, `false` otherwise
 */
function includesAny(text: string, fragments: string[]): boolean {
  return fragments.some((fragment) => text.includes(fragment));
}

/**
 * Map a raw generation error to a concise, user-facing message.
 *
 * @param error - The original error value produced during generation.
 * @param context - Optional context influencing message selection; when `context.providerId` is `"gcp"`, messages may reference Google Gemini specifically.
 * @returns A human-readable message describing the likely cause and suggested next steps.
 */
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
