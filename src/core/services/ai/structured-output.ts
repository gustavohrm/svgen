import { z } from "zod";
import { extractSvgFromResult } from "../../utils/svg-parser";
import { normalizePositiveInt } from "../../utils/number";

const svgVariationsPayloadSchema = z.strictObject({
  svgs: z.array(z.string().min(1)).min(1),
});

const CODE_FENCE_REGEX = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
const SVG_MARKUP_REGEX = /^<svg[\s\S]*<\/svg>$/i;

export const SVG_VARIATIONS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["svgs"],
  properties: {
    svgs: {
      type: "array",
      minItems: 1,
      items: {
        type: "string",
      },
    },
  },
} as const;

export const GCP_SVG_VARIATIONS_SCHEMA = {
  type: "OBJECT",
  additionalProperties: false,
  required: ["svgs"],
  properties: {
    svgs: {
      type: "ARRAY",
      minItems: 1,
      items: {
        type: "STRING",
      },
    },
  },
} as const;

/**
 * Extracts and validates SVG markup from an input string.
 *
 * @param svg - Input text that may contain an SVG document or surrounding content
 * @returns The trimmed SVG markup if it begins with `<svg` and ends with `</svg>`, `null` otherwise
 */
function normalizeSvgMarkup(svg: string): string | null {
  const extracted = extractSvgFromResult(svg).trim();
  if (!SVG_MARKUP_REGEX.test(extracted)) {
    return null;
  }

  return extracted;
}

/**
 * Extracts and parses a JSON value from a text blob.
 *
 * Attempts several extraction strategies (full text, fenced code block content, and an embedded object literal)
 * and returns the first successfully parsed JSON value. If the parsed value is a JSON-encoded string, that string
 * is parsed again and the resulting value is returned.
 *
 * @param text - The input text to search for a JSON payload
 * @returns The parsed JSON value if parsing succeeds, or `undefined` if no valid JSON is found
 */
function parseJsonCandidate(text: string): unknown | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const candidates: string[] = [trimmed];

  const codeFenceMatch = trimmed.match(CODE_FENCE_REGEX);
  if (codeFenceMatch?.[1]) {
    candidates.push(codeFenceMatch[1].trim());
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    candidates.push(trimmed.slice(start, end + 1));
  }

  const uniqueCandidates = [...new Set(candidates)];

  for (const candidate of uniqueCandidates) {
    try {
      let parsed = JSON.parse(candidate) as unknown;
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed) as unknown;
      }

      return parsed;
    } catch {}
  }

  return undefined;
}

/**
 * Extracts and returns up to the requested number of unique, normalized SVG markup strings found in a text payload containing a JSON `svgs` array.
 *
 * @param text - Text that may contain a JSON payload with an `svgs` array (plain JSON, code-fenced JSON, or embedded JSON).
 * @param requestedCount - Maximum number of SVG strings to return.
 * @returns An array of unique, normalized SVG markup strings, limited to `requestedCount`; an empty array if no valid SVGs are found.
 */
function parseSvgVariationsFromText(text: string, requestedCount: number): string[] {
  const parsedJson = parseJsonCandidate(text);
  if (!parsedJson) {
    return [];
  }

  const parsedPayload = svgVariationsPayloadSchema.safeParse(parsedJson);
  if (!parsedPayload.success) {
    return [];
  }

  const uniqueSvgs = new Set<string>();
  for (const svg of parsedPayload.data.svgs) {
    const normalized = normalizeSvgMarkup(svg);
    if (normalized) {
      uniqueSvgs.add(normalized);
    }
  }

  return [...uniqueSvgs].slice(0, requestedCount);
}

/**
 * Aggregate and return up to `requestedCount` unique, normalized SVG markups found across multiple model responses.
 *
 * Tries a primary flow that parses each response as a structured JSON payload with an `svgs` array, validating and normalizing each SVG and collecting unique results across responses until the requested count is reached. If that yields no valid SVGs, falls back to extracting and normalizing raw SVG markup directly from each response. The `requestedCount` is coerced to a positive integer.
 *
 * @param responses - Array of textual model responses to search for SVG variations
 * @param requestedCount - Maximum number of unique SVGs to return; coerced to a positive integer
 * @returns An array of up to `requestedCount` unique, normalized SVG markup strings
 * @throws Error if no valid SVG variations can be extracted from any response
 */
export function parseSvgVariationsFromResponses(
  responses: string[],
  requestedCount: number,
): string[] {
  const normalizedCount = normalizePositiveInt(requestedCount);
  const parsedSvgs = new Set<string>();

  for (const response of responses) {
    const parsed = parseSvgVariationsFromText(response, normalizedCount);
    for (const svg of parsed) {
      parsedSvgs.add(svg);
      if (parsedSvgs.size >= normalizedCount) {
        return [...parsedSvgs].slice(0, normalizedCount);
      }
    }
  }

  const parsedResults = [...parsedSvgs].slice(0, normalizedCount);
  if (parsedResults.length > 0) {
    return parsedResults;
  }

  const fallbackSvgs = new Set<string>();
  for (const response of responses) {
    const normalized = normalizeSvgMarkup(response);
    if (normalized) {
      fallbackSvgs.add(normalized);
    }
  }

  const fallbackResults = [...fallbackSvgs].slice(0, normalizedCount);
  if (fallbackResults.length > 0) {
    return fallbackResults;
  }

  throw new Error(
    "Model returned an invalid variations payload. Expected JSON with an 'svgs' array of SVG strings.",
  );
}
