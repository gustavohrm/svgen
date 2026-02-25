import { z } from "zod";
import { extractSvgFromResult } from "../../utils/svg-parser";
import { normalizePositiveInt } from "../../utils/number";

const svgVariationsPayloadSchema = z
  .object({
    svgs: z.array(z.string().min(1)).min(1),
  })
  .strict();

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

function normalizeSvgMarkup(svg: string): string | null {
  const extracted = extractSvgFromResult(svg).trim();
  if (!SVG_MARKUP_REGEX.test(extracted)) {
    return null;
  }

  return extracted;
}

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

  return [...uniqueSvgs].slice(0, normalizePositiveInt(requestedCount));
}

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
