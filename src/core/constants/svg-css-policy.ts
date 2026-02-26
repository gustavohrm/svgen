export const SVG_CSS_POLICY_PROFILE = "sandboxed-permissive" as const;

export const SVG_CSS_ALLOWED_AT_RULES = ["@keyframes", "@media", "@supports"] as const;

export const SVG_CSS_ALLOWED_PROPERTIES = [
  "animation",
  "animation-name",
  "animation-duration",
  "animation-delay",
  "animation-timing-function",
  "animation-iteration-count",
  "animation-direction",
  "animation-fill-mode",
  "animation-play-state",
  "transform",
  "transform-origin",
  "transform-box",
  "opacity",
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "color",
  "color-interpolation",
  "color-interpolation-filters",
  "stop-color",
  "stop-opacity",
  "flood-color",
  "flood-opacity",
  "lighting-color",
  "filter",
  "clip-path",
  "mask",
  "paint-order",
  "vector-effect",
  "mix-blend-mode",
  "isolation",
  "display",
  "visibility",
  "pointer-events",
  "font-size",
  "font-family",
  "font-weight",
  "font-style",
  "letter-spacing",
  "word-spacing",
  "text-anchor",
  "dominant-baseline",
  "x",
  "y",
  "width",
  "height",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
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

export const SVG_CSS_SAFETY_RULE_HINTS = [
  "No @import.",
  "No javascript: URLs.",
  "No expression() or executable legacy bindings.",
  "Only local fragment URLs in url(...), e.g. url(#gradient).",
  'Use <style> blocks (optional type="text/css").',
] as const;

/**
 * Produce a prompt-friendly list of allowed SVG CSS properties with an appended guidance note.
 *
 * @returns A string of allowed properties joined by ", " followed by ", plus other standard CSS properties and custom properties (--tokens)."
 */
export function formatSvgCssAllowedPropertiesForPrompt(): string {
  return `${SVG_CSS_ALLOWED_PROPERTIES.join(", ")}, plus other standard CSS properties and custom properties (--tokens).`;
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
  return SVG_CSS_SAFETY_RULE_HINTS.join(" ");
}
