import DOMPurify from "dompurify";

const ALLOWED_SVG_TAGS = [
  "svg",
  "g",
  "defs",
  "desc",
  "title",
  "symbol",
  "use",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "textPath",
  "clipPath",
  "mask",
  "pattern",
  "marker",
  "linearGradient",
  "radialGradient",
  "stop",
  "image",
  "filter",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
] as const;

const ALLOWED_SVG_ATTRS = [
  "id",
  "class",
  "xmlns",
  "xmlns:xlink",
  "viewBox",
  "width",
  "height",
  "x",
  "y",
  "x1",
  "x2",
  "y1",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "d",
  "points",
  "transform",
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-opacity",
  "opacity",
  "color",
  "style",
  "font-size",
  "font-family",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
  "letter-spacing",
  "word-spacing",
  "paint-order",
  "vector-effect",
  "preserveAspectRatio",
  "href",
  "xlink:href",
  "filter",
  "clip-path",
  "mask",
  "marker-start",
  "marker-mid",
  "marker-end",
  "gradientUnits",
  "gradientTransform",
  "offset",
  "stop-color",
  "stop-opacity",
  "patternUnits",
  "patternContentUnits",
  "patternTransform",
  "result",
  "in",
  "in2",
  "type",
  "values",
  "operator",
  "k1",
  "k2",
  "k3",
  "k4",
  "stdDeviation",
  "dx",
  "dy",
  "flood-color",
  "flood-opacity",
  "amplitude",
  "exponent",
  "intercept",
  "slope",
  "surfaceScale",
  "specularConstant",
  "specularExponent",
  "lighting-color",
  "seed",
  "numOctaves",
  "baseFrequency",
  "targetX",
  "targetY",
  "edgeMode",
  "kernelMatrix",
  "divisor",
  "bias",
  "kernelUnitLength",
  "order",
  "scale",
] as const;

const BLOCKED_TAG_PATTERN = /<\s*\/?\s*(script|foreignObject)\b/i;
const INLINE_EVENT_PATTERN = /\son[a-z][\w:-]*\s*=/i;

export function sanitizeSvgMarkup(rawSvg: string): string | null {
  const source = rawSvg.trim();
  if (!source) {
    return null;
  }

  if (BLOCKED_TAG_PATTERN.test(source) || INLINE_EVENT_PATTERN.test(source)) {
    return null;
  }

  const sanitized = DOMPurify.sanitize(source, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ALLOWED_TAGS: [...ALLOWED_SVG_TAGS],
    ALLOWED_ATTR: [...ALLOWED_SVG_ATTRS],
    FORBID_TAGS: ["script", "foreignObject"],
  });

  if (typeof sanitized !== "string" || !sanitized.trim()) {
    return null;
  }

  const documentNode = new DOMParser().parseFromString(sanitized, "image/svg+xml");
  const root = documentNode.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "svg") {
    return null;
  }

  if (documentNode.querySelector("parsererror, script, foreignObject")) {
    return null;
  }

  const allElements = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const element of allElements) {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name.toLowerCase().startsWith("on")) {
        return null;
      }
    }
  }

  return root.outerHTML;
}
