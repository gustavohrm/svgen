import { z } from "zod";
import { DOMParser as XmldomParser, XMLSerializer as XmldomSerializer } from "@xmldom/xmldom";
import { extractSvgFromResult } from "../../utils/svg-parser";
import { normalizePositiveInt } from "../../utils/number";

/**
 * Build a Zod schema that validates an object containing exactly `requestedCount` non-empty SVG strings.
 *
 * @param requestedCount - Desired number of SVG entries; will be normalized to a positive integer before use.
 * @returns A Zod strict object schema with a `svgs` property: an array of non-empty strings whose length equals the normalized count.
 */
function buildSvgVariationsPayloadSchema(requestedCount: number) {
  const normalizedCount = normalizePositiveInt(requestedCount);

  return z.strictObject({
    svgs: z.array(z.string().min(1)).length(normalizedCount),
  });
}

function buildPartialSvgVariationsPayloadSchema() {
  return z.object({
    svgs: z.array(z.unknown()).min(1),
  });
}

const CODE_FENCE_REGEX = /```(?:json)?\s*([\s\S]*?)\s*```/i;
const SVG_MARKUP_REGEX = /^<svg[\s\S]*<\/svg>$/i;

/**
 * Note: When parsing with "text/html", xmldom places elements in the XHTML namespace
 * (http://www.w3.org/1999/xhtml). Downstream namespace-sensitive code or XPath queries
 * may need to account for this.
 */
function parseHtmlFragment(text: string): Element | null {
  if (typeof DOMParser === "undefined" || typeof window === "undefined") {
    try {
      const doc = new XmldomParser({
        locator: {},
        errorHandler: () => {}, // Suppress console output for parsing errors
      }).parseFromString(text, "text/html");

      const body = doc.getElementsByTagName("body")[0];
      if (body) {
        return body as Element;
      }

      const docElement = doc.documentElement;
      if (!docElement) return null;

      if (docElement.tagName?.toLowerCase() === "svg") {
        const wrapper = doc.createElement("body");
        wrapper.appendChild(docElement);
        return wrapper as Element;
      }

      return docElement as Element;
    } catch {
      return null;
    }
  }

  try {
    const parsed = new DOMParser().parseFromString(text, "text/html");
    return parsed.body || parsed.documentElement || null;
  } catch {
    return null;
  }
}

/**
 * Determines whether the given string contains exactly one standalone SVG document with no other content.
 *
 * @param input - The text to inspect for a single SVG document
 * @returns `true` if `input` contains one `<svg>...</svg>` block and no non-whitespace characters before or after it, `false` otherwise
 */
function isSingleSvgDocument(input: string): boolean {
  const parsedBody = parseHtmlFragment(input);
  if (!parsedBody) {
    return false;
  }

  let topLevelSvgCount = 0;

  for (const node of Array.from(parsedBody.childNodes)) {
    if (node.nodeType === 3) {
      // Node.TEXT_NODE === 3
      if (node.textContent?.trim() !== "") {
        return false;
      }
    } else if (node.nodeType === 1) {
      // Node.ELEMENT_NODE === 1
      const tagName = (node as Element).tagName?.toLowerCase();
      if (tagName !== "svg") {
        return false;
      }

      topLevelSvgCount += 1;
    } else {
      return false;
    }
  }

  return topLevelSvgCount === 1;
}

/**
 * Builds a JSON Schema that requires an object containing an `svgs` array with exactly the requested number of SVG strings.
 *
 * @param requestedCount - Desired number of SVG variations; will be normalized to a positive integer
 * @returns A JSON Schema object that enforces an object with a `svgs` property: an array of strings with `minItems` and `maxItems` equal to the normalized count, and no additional properties
 */
export function buildSvgVariationsJsonSchema(requestedCount: number) {
  const normalizedCount = normalizePositiveInt(requestedCount);

  return {
    type: "object",
    additionalProperties: false,
    required: ["svgs"],
    properties: {
      svgs: {
        type: "array",
        minItems: normalizedCount,
        maxItems: normalizedCount,
        items: {
          type: "string",
        },
      },
    },
  } as const;
}

/**
 * Build a GCP-style JSON schema that requires an object with a fixed-length `svgs` array.
 *
 * @param requestedCount - Desired number of SVG entries; will be normalized to an integer >= 1
 * @returns A schema object (GCP/Discovery-style) whose `svgs` property is an array of strings with both minItems and maxItems equal to the normalized count
 */
export function buildGcpSvgVariationsSchema(requestedCount: number) {
  const normalizedCount = normalizePositiveInt(requestedCount);

  return {
    type: "OBJECT",
    required: ["svgs"],
    properties: {
      svgs: {
        type: "ARRAY",
        minItems: normalizedCount,
        maxItems: normalizedCount,
        items: {
          type: "STRING",
        },
      },
    },
  } as const;
}

export const SVG_VARIATIONS_JSON_SCHEMA = buildSvgVariationsJsonSchema(1);
export const GCP_SVG_VARIATIONS_SCHEMA = buildGcpSvgVariationsSchema(1);

/**
 * Extracts and validates SVG markup from an input string.
 *
 * @param svg - Input text that may contain an SVG document or surrounding content
 * @returns The trimmed SVG markup if it begins with `<svg` and ends with `</svg>`, `null` otherwise
 */
function normalizeSvgMarkup(svg: string): string | null {
  const trimmedInput = svg.trim();
  const extracted = extractSvgFromResult(trimmedInput).trim();

  if (!isSingleSvgDocument(extracted)) {
    return null;
  }

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
function parseJsonCandidate(text: string): unknown {
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
 * Extracts and returns exactly the requested number of normalized SVG markup strings from a text payload containing a JSON `svgs` array.
 *
 * @param text - Text that may contain a JSON payload with an `svgs` array (plain JSON, code-fenced JSON, or embedded JSON).
 * @param requestedCount - Exact number of SVG strings to require and return.
 * @returns A normalized SVG array with exactly `requestedCount` entries; an empty array if payload/schema/content validation fails.
 */
function parseSvgVariationsFromText(text: string, requestedCount: number): string[] {
  const normalizedCount = normalizePositiveInt(requestedCount);
  const parsedJson = parseJsonCandidate(text);
  if (parsedJson === undefined) {
    return [];
  }

  const parsedPayload = buildSvgVariationsPayloadSchema(normalizedCount).safeParse(parsedJson);
  if (!parsedPayload.success) {
    return [];
  }

  const normalizedSvgs = normalizeStructuredSvgArray(parsedPayload.data.svgs);
  if (!normalizedSvgs || normalizedSvgs.length !== normalizedCount) {
    return [];
  }

  return normalizedSvgs;
}

/**
 * Extracts normalized SVG markup strings from a structured JSON payload that may contain a partial subset of requested variations.
 *
 * @param text - Text that may contain a JSON payload with an `svgs` array.
 * @param requestedCount - Target number of SVG strings to return.
 * Invalid SVG entries are discarded in this partial mode.
 *
 * @returns A normalized, deduplicated SVG array truncated to `requestedCount`, or an empty array if validation fails.
 */
function parsePartialSvgVariationsFromText(text: string, requestedCount: number): string[] {
  const normalizedCount = normalizePositiveInt(requestedCount);
  const parsedJson = parseJsonCandidate(text);
  if (parsedJson === undefined) {
    return [];
  }

  const parsedPayload = buildPartialSvgVariationsPayloadSchema().safeParse(parsedJson);
  if (!parsedPayload.success) {
    return [];
  }

  const validStringSvgs = parsedPayload.data.svgs.filter(
    (item): item is string => typeof item === "string",
  );
  const normalizedSvgs = normalizeStructuredSvgArrayBestEffort(validStringSvgs);
  return normalizedSvgs.slice(0, normalizedCount);
}

/**
 * Normalize and deduplicate an array of SVG strings, preserving first-occurrence order.
 *
 * @param svgs - Array of SVG strings to normalize and deduplicate
 * @returns An array of unique, normalized SVG markup strings in their original first-occurrence order, or `null` if any input cannot be normalized
 */
function normalizeStructuredSvgArray(svgs: string[]): string[] | null {
  const normalizedSvgs: string[] = [];
  const uniqueSvgs = new Set<string>();

  for (const svg of svgs) {
    const normalized = normalizeSvgMarkup(svg);
    if (!normalized) {
      return null;
    }

    if (uniqueSvgs.has(normalized)) {
      continue;
    }

    uniqueSvgs.add(normalized);
    normalizedSvgs.push(normalized);
  }

  return normalizedSvgs;
}

function normalizeStructuredSvgArrayBestEffort(svgs: string[]): string[] {
  const normalizedSvgs: string[] = [];
  const uniqueSvgs = new Set<string>();

  for (const svg of svgs) {
    const normalized = normalizeSvgMarkup(svg);
    if (!normalized || uniqueSvgs.has(normalized)) {
      continue;
    }

    uniqueSvgs.add(normalized);
    normalizedSvgs.push(normalized);
  }

  return normalizedSvgs;
}

function extractSvgDocumentsFromText(text: string): string[] {
  const parsedBody = parseHtmlFragment(text);
  if (!parsedBody) {
    return [];
  }

  const normalizedSvgs: string[] = [];
  const uniqueSvgs = new Set<string>();

  const svgElements = Array.from(parsedBody.getElementsByTagName("svg"));

  for (const node of svgElements) {
    const element = node as Element;

    let isNested = false;
    let parent = element.parentNode;
    while (parent && parent.nodeType === 1) {
      // Node.ELEMENT_NODE
      if ((parent as Element).tagName?.toLowerCase() === "svg") {
        isNested = true;
        break;
      }
      parent = parent.parentNode;
    }
    if (isNested) {
      continue;
    }

    const html =
      typeof element.outerHTML === "string"
        ? element.outerHTML
        : new XmldomSerializer().serializeToString(element);

    const normalized = normalizeSvgMarkup(html);
    if (!normalized || uniqueSvgs.has(normalized)) {
      continue;
    }

    uniqueSvgs.add(normalized);
    normalizedSvgs.push(normalized);
  }

  return normalizedSvgs;
}

function getCanonicalSvg(svg: string): string {
  const parsed = parseHtmlFragment(svg);
  if (!parsed) {
    return svg;
  }
  const elements =
    parsed.tagName?.toLowerCase() === "svg"
      ? [parsed]
      : Array.from(parsed.getElementsByTagName("svg"));
  if (elements.length === 0) {
    return svg;
  }
  const element = elements[0];
  return typeof element.outerHTML === "string"
    ? element.outerHTML
    : new XmldomSerializer().serializeToString(element);
}

/**
 * Parse and return up to `requestedCount` normalized SVG markups from model responses.
 *
 * Tries a primary flow that parses each response as a structured JSON payload with an `svgs` array,
 * enforcing exact array length and validating each SVG document. If no single response satisfies the
 * exact-count contract, it accumulates partial structured payloads (including oversized arrays and
 * payloads that include additional top-level fields) across responses until the requested unique count
 * is met. If still underfilled, it falls back to extracting raw SVG documents directly from responses
 * and combines those with structured results. If at least one valid SVG is found, returns the best-effort
 * partial list; throws only when no valid SVG document can be recovered. The `requestedCount` is coerced
 * to a positive integer.
 *
 * @param responses - Array of textual model responses to search for SVG variations
 * @param requestedCount - Target number of SVGs; coerced to a positive integer
 * @returns An array containing up to `requestedCount` normalized SVG markup strings
 * @throws Error if no valid SVG document can be recovered from the responses
 */
export function parseSvgVariationsFromResponses(
  responses: string[],
  requestedCount: number,
): string[] {
  const normalizedCount = normalizePositiveInt(requestedCount);

  for (const response of responses) {
    const parsed = parseSvgVariationsFromText(response, normalizedCount);
    if (parsed.length === normalizedCount) {
      return parsed;
    }
  }

  const accumulatedStructuredSvgs = new Set<string>();
  const structuredPayloadResponseIndexes = new Set<number>();
  for (const [index, response] of responses.entries()) {
    const parsedPartial = parsePartialSvgVariationsFromText(response, normalizedCount);
    if (parsedPartial.length > 0) {
      structuredPayloadResponseIndexes.add(index);
    }

    for (const svg of parsedPartial) {
      const canonical = getCanonicalSvg(svg);
      accumulatedStructuredSvgs.add(canonical);
      if (accumulatedStructuredSvgs.size >= normalizedCount) {
        return [...accumulatedStructuredSvgs].slice(0, normalizedCount);
      }
    }
  }

  const fallbackSvgs = new Set<string>();
  const canonicalSeen = new Set<string>();

  for (const svg of accumulatedStructuredSvgs) {
    fallbackSvgs.add(svg);
    canonicalSeen.add(getCanonicalSvg(svg));
  }

  for (const response of responses) {
    const normalized = normalizeSvgMarkup(response);
    if (normalized) {
      const canonical = getCanonicalSvg(normalized);
      if (!canonicalSeen.has(canonical)) {
        fallbackSvgs.add(normalized);
        canonicalSeen.add(canonical);
      }
    }

    if (fallbackSvgs.size < normalizedCount) {
      const extractedSvgs = extractSvgDocumentsFromText(response);
      for (const svg of extractedSvgs) {
        const canonical = getCanonicalSvg(svg);
        if (!canonicalSeen.has(canonical)) {
          fallbackSvgs.add(svg);
          canonicalSeen.add(canonical);
        }
        if (fallbackSvgs.size >= normalizedCount) {
          break;
        }
      }
    }

    if (fallbackSvgs.size >= normalizedCount) {
      break;
    }
  }

  if (fallbackSvgs.size === normalizedCount) {
    return [...fallbackSvgs].slice(0, normalizedCount);
  }

  if (fallbackSvgs.size > 0) {
    return [...fallbackSvgs];
  }

  const responseContext =
    responses
      .flatMap((response, index) => {
        const trimmed = response.trim();
        if (trimmed === "") {
          return [];
        }

        return [`[${index}] ${trimmed.slice(0, 300)}`];
      })
      .join(" | ") || "no response content";

  throw new Error(
    `Model returned an invalid variations payload. Could not parse any valid SVG documents from structured JSON under 'svgs' or raw SVG fallback responses. Response context: ${responseContext}`,
  );
}
