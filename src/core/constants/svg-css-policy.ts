export const SVG_CSS_POLICY_PROFILE = "sandboxed-permissive" as const;

export const SVG_CSS_ALLOWED_AT_RULES = ["@keyframes", "@media", "@supports", "@layer"] as const;

export const SVG_CSS_BLOCKED_PATTERN_SOURCES = [
  "@import\\b",
  "javascript\\s*:",
  "expression\\s*\\(",
  "behavior\\s*:",
  "-moz-binding\\b",
  "<\\/style\\b",
] as const;

export const SVG_CSS_BLOCKED_PROPERTIES = ["behavior", "-moz-binding"] as const;

export const SVG_CSS_MAX_STYLE_BLOCKS = 8;
export const SVG_CSS_MAX_STYLE_CHARS = 12_000;
export const SVG_CSS_MAX_STYLE_ATTRIBUTE_CHARS = 3_000;
export const SVG_CSS_MAX_SELECTOR_CHARS = 600;
export const SVG_CSS_MAX_VALUE_CHARS = 1_000;

export const SVG_CSS_URL_REFERENCE_RULE =
  "Only local fragment references are allowed: #id and url(#id)." as const;

// Keep entries lowercase: svg-sanitizer uses case-insensitive checks and
// normalizes tag names before enforcement.
export const SVG_BLOCKED_TAG_NAMES = [
  "script",
  "foreignobject",
  "animate",
  "animatemotion",
  "animatetransform",
  "set",
] as const;

export const SVG_CSS_ALLOWED_SELECTOR_HINTS = [
  "element",
  ".class",
  "#id",
  "descendant",
  "comma-separated",
  "pseudo-classes and pseudo-elements",
  "attribute selectors",
] as const;

export const SVG_BLOCKED_FEATURES = [
  "No <script> tags.",
  "No inline event handlers (on* attributes).",
  "No external URLs in href/xlink:href and sanitizer-checked URL reference attributes (filter, clip-path, mask, marker-start, marker-mid, marker-end).",
  "No external URLs in CSS url(...); local fragments only.",
  "No @import.",
  "No javascript: URLs.",
  "No expression() or executable legacy bindings (behavior, -moz-binding).",
  "No SMIL animation tags: <animate>, <animateMotion>, <animateTransform>, <set>.",
] as const;

export const SVG_CSS_CAPABILITY_CONTRACT = {
  profile: SVG_CSS_POLICY_PROFILE,
  allowedAtRules: SVG_CSS_ALLOWED_AT_RULES,
  blockedPatternSources: SVG_CSS_BLOCKED_PATTERN_SOURCES,
  blockedProperties: SVG_CSS_BLOCKED_PROPERTIES,
  styleLimits: {
    maxStyleBlocks: SVG_CSS_MAX_STYLE_BLOCKS,
    maxStyleChars: SVG_CSS_MAX_STYLE_CHARS,
    maxStyleAttributeChars: SVG_CSS_MAX_STYLE_ATTRIBUTE_CHARS,
    maxSelectorChars: SVG_CSS_MAX_SELECTOR_CHARS,
    maxValueChars: SVG_CSS_MAX_VALUE_CHARS,
  },
  urlRule: SVG_CSS_URL_REFERENCE_RULE,
  selectorHints: SVG_CSS_ALLOWED_SELECTOR_HINTS,
  blockedSvgTagNames: SVG_BLOCKED_TAG_NAMES,
  blockedFeatures: SVG_BLOCKED_FEATURES,
} as const;

/**
 * Produce a prompt-friendly statement for CSS property capability.
 *
 * @returns A statement describing standard CSS and custom property support with blocked-property exceptions.
 */
export function formatSvgCssAllowedPropertiesForPrompt(): string {
  return `Standard CSS properties and custom properties (--tokens), except blocked properties: ${SVG_CSS_BLOCKED_PROPERTIES.join(", ")}.`;
}

/**
 * Produce a comma-separated list of allowed CSS at-rule names for prompts.
 *
 * @returns A string containing the allowed at-rule names joined with ", " (e.g., "@keyframes, @media, @supports").
 */
export function formatSvgCssAllowedAtRulesForPrompt(): string {
  return SVG_CSS_ALLOWED_AT_RULES.join(", ");
}

export function formatSvgCssSelectorHintsForPrompt(): string {
  return SVG_CSS_ALLOWED_SELECTOR_HINTS.join(", ");
}

export function formatSvgCssSafetyRulesForPrompt(): string {
  return [
    ...SVG_BLOCKED_FEATURES,
    SVG_CSS_URL_REFERENCE_RULE,
    'Use <style> blocks (optional type="text/css").',
  ].join(" ");
}
