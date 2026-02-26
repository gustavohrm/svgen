import DOMPurify from "dompurify";
import { SVG_CSS_ALLOWED_AT_RULES } from "../constants/svg-css-policy";

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

// Keep entries lowercase: BLOCKED_TAG_PATTERN uses case-insensitive matching and
// DOMPurify normalizes tag names internally.
const BLOCKED_TAG_NAMES = new Set<string>([
  "script",
  "foreignobject",
  "animate",
  "animatemotion",
  "animatetransform",
  "set",
]);
const BLOCKED_TAG_PATTERN = new RegExp(
  `<\\s*\\/?\\s*(?:${Array.from(BLOCKED_TAG_NAMES).map(escapeRegExp).join("|")})\\b`,
  "i",
);
const INLINE_EVENT_PATTERN = /\son[a-z][\w:-]*\s*=/i;
const STYLE_TAG_PATTERN = /<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi;
const STYLE_PLACEHOLDER_PREFIX = "__svgen_style_placeholder__";
const STYLE_PLACEHOLDER_FALLBACK_PREFIX = "fallback";
export const MAX_STYLE_BLOCKS = 4;
export const MAX_STYLE_CHARS = 5_000;
const MAX_STYLE_ATTR_CHARS = 1_500;
const DISALLOWED_CSS_PATTERN =
  /(?:@import\b|javascript\s*:|expression\s*\(|behavior\s*:|-moz-binding\b|<\/style\b)/i;
const STYLE_TAG_ALLOWED_ATTRS_PATTERN =
  /^\s*(?:type\s*=\s*(?:"text\/css"|'text\/css'|text\/css))?\s*$/i;
const URL_REFERENCE_ATTR_NAMES = new Set<string>([
  "href",
  "xlink:href",
  "filter",
  "clip-path",
  "mask",
  "marker-start",
  "marker-mid",
  "marker-end",
]);
const LOCAL_FRAGMENT_REFERENCE_PATTERN = /^#[-\w:.]+$/;
const LOCAL_FRAGMENT_URL_REFERENCE_PATTERN = /^url\s*\(\s*(['"]?)#[-\w:.]+\1\s*\)$/i;

const ALLOWED_CSS_AT_RULES = new Set<string>(
  SVG_CSS_ALLOWED_AT_RULES.map((rule) => normalizeCssAtRule(rule)).filter(
    (rule) => rule.length > 0,
  ),
);
const CSS_NESTED_RULE_AT_RULES = new Set<string>(["media", "supports"]);
const BLOCKED_CSS_PROPERTIES = new Set<string>(["behavior", "-moz-binding"]);

interface NodeCryptoModule {
  webcrypto?: Crypto;
  randomBytes?: (size: number) => Uint8Array;
}

interface NodeProcess {
  versions?: {
    node?: string;
  };
  getBuiltinModule?: (id: string) => unknown;
}

interface ExtractedStyleBlock {
  placeholderId: string;
  cssText: string;
}

interface StyleExtractionResult {
  svgWithoutStyles: string;
  styleBlocks: ExtractedStyleBlock[];
}

let stylePlaceholderFallbackCounter = 0;

export function sanitizeSvgMarkup(rawSvg: string): string | null {
  const source = rawSvg.trim();
  if (!source) {
    return null;
  }

  if (BLOCKED_TAG_PATTERN.test(source) || INLINE_EVENT_PATTERN.test(source)) {
    return null;
  }

  const styleExtraction = extractAndValidateStyleBlocks(source);
  if (!styleExtraction) {
    return null;
  }

  if (containsUnsafeUrlReferenceAttributes(styleExtraction.svgWithoutStyles)) {
    return null;
  }

  const sanitized = DOMPurify.sanitize(styleExtraction.svgWithoutStyles, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ALLOWED_TAGS: [...ALLOWED_SVG_TAGS],
    ALLOWED_ATTR: [...ALLOWED_SVG_ATTRS],
    FORBID_TAGS: Array.from(BLOCKED_TAG_NAMES),
  });

  if (typeof sanitized !== "string" || !sanitized.trim()) {
    return null;
  }

  const documentNode = new DOMParser().parseFromString(sanitized, "image/svg+xml");
  const root = documentNode.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "svg") {
    return null;
  }

  for (const styleElement of Array.from(documentNode.querySelectorAll("style"))) {
    styleElement.remove();
  }

  if (documentNode.querySelector("parsererror") || containsBlockedElements(root)) {
    return null;
  }

  const allElements = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const element of allElements) {
    for (const attribute of Array.from(element.attributes)) {
      const attrName = attribute.name.toLowerCase();
      if (attrName.startsWith("on")) {
        return null;
      }

      if (URL_REFERENCE_ATTR_NAMES.has(attrName)) {
        if (!isSafeUrlReferenceAttributeValue(attrName, attribute.value)) {
          return null;
        }
      }

      if (attrName === "style") {
        const sanitizedStyle = sanitizeStyleAttribute(attribute.value);
        if (sanitizedStyle === null) {
          return null;
        }

        if (sanitizedStyle === "") {
          element.removeAttribute("style");
          continue;
        }

        element.setAttribute("style", sanitizedStyle);
      }
    }
  }

  if (!reinsertStyleBlocks(documentNode, root, styleExtraction.styleBlocks)) {
    return null;
  }

  return root.outerHTML;
}

function containsBlockedElements(root: Element): boolean {
  const allElements = [root, ...Array.from(root.querySelectorAll("*"))];
  return allElements.some((element) => BLOCKED_TAG_NAMES.has(element.tagName.toLowerCase()));
}

function containsUnsafeUrlReferenceAttributes(svgMarkup: string): boolean {
  const parsedNode = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  const root = parsedNode.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "svg" || parsedNode.querySelector("parsererror")) {
    return false;
  }

  const allElements = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const element of allElements) {
    for (const attribute of Array.from(element.attributes)) {
      const attrName = attribute.name.toLowerCase();
      if (!URL_REFERENCE_ATTR_NAMES.has(attrName)) {
        continue;
      }

      if (!isSafeUrlReferenceAttributeValue(attrName, attribute.value)) {
        return true;
      }
    }
  }

  return false;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractAndValidateStyleBlocks(source: string): StyleExtractionResult | null {
  const styleBlocks: ExtractedStyleBlock[] = [];
  const existingDescIds = collectDescIds(source);
  let hasInvalidStyle = false;

  const svgWithoutStyles = source.replace(
    STYLE_TAG_PATTERN,
    (_fullTag: string, attrsRaw: string, cssRaw: string) => {
      if (hasInvalidStyle) {
        return "";
      }

      if (!isAllowedStyleTagAttributes(attrsRaw)) {
        hasInvalidStyle = true;
        return "";
      }

      if (styleBlocks.length >= MAX_STYLE_BLOCKS) {
        hasInvalidStyle = true;
        return "";
      }

      const sanitizedCss = sanitizeInlineSvgCss(cssRaw);
      if (sanitizedCss === null) {
        hasInvalidStyle = true;
        return "";
      }

      if (sanitizedCss.length === 0) {
        return "";
      }

      const placeholderId = generateUniqueStylePlaceholderId(existingDescIds);
      styleBlocks.push({ placeholderId, cssText: sanitizedCss });
      return `<desc id="${placeholderId}"></desc>`;
    },
  );

  if (hasInvalidStyle) {
    return null;
  }

  return {
    svgWithoutStyles,
    styleBlocks,
  };
}

function collectDescIds(source: string): Set<string> {
  const ids = new Set<string>();
  const descTagPattern = /<desc\b[^>]*\bid\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'>/]+))/gi;
  let match: RegExpExecArray | null;

  while ((match = descTagPattern.exec(source)) !== null) {
    const id = match[1] ?? match[2] ?? match[3];
    if (id) {
      ids.add(id);
    }
  }

  return ids;
}

function generateUniqueStylePlaceholderId(existingDescIds: Set<string>): string {
  let placeholderId = "";

  do {
    const suffix = createRandomSuffix();
    placeholderId = `${STYLE_PLACEHOLDER_PREFIX}${suffix}`;
  } while (existingDescIds.has(placeholderId));

  existingDescIds.add(placeholderId);
  return placeholderId;
}

function createRandomSuffix(): string {
  const randomBytes = getSecureRandomBytes(8);
  if (randomBytes) {
    return Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `${STYLE_PLACEHOLDER_FALLBACK_PREFIX}${(stylePlaceholderFallbackCounter += 1).toString(36)}`;
}

function normalizeCssAtRule(rule: string): string {
  const trimmedRule = rule.trim().toLowerCase();
  if (trimmedRule.length === 0) {
    return "";
  }

  return trimmedRule.startsWith("@") ? trimmedRule.slice(1) : trimmedRule;
}

function getSecureRandomBytes(size: number): Uint8Array | null {
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    try {
      return globalThis.crypto.getRandomValues(new Uint8Array(size));
    } catch {
      // Fall through to alternate crypto sources.
    }
  }

  const nodeCrypto = getNodeCryptoModule();
  if (typeof nodeCrypto?.webcrypto?.getRandomValues === "function") {
    try {
      return nodeCrypto.webcrypto.getRandomValues(new Uint8Array(size));
    } catch {
      // Fall through to node randomBytes.
    }
  }

  if (typeof nodeCrypto?.randomBytes === "function") {
    try {
      return Uint8Array.from(nodeCrypto.randomBytes(size));
    } catch {
      return null;
    }
  }

  return null;
}

function getNodeCryptoModule(): NodeCryptoModule | null {
  const nodeProcess = (globalThis as typeof globalThis & { process?: NodeProcess }).process;
  if (!nodeProcess?.versions?.node) {
    return null;
  }

  if (typeof nodeProcess.getBuiltinModule !== "function") {
    return null;
  }

  const cryptoModule = nodeProcess.getBuiltinModule("node:crypto");
  return isNodeCryptoModule(cryptoModule) ? cryptoModule : null;
}

function isNodeCryptoModule(value: unknown): value is NodeCryptoModule {
  return typeof value === "object" && value !== null;
}

function isAllowedStyleTagAttributes(attrsRaw: string): boolean {
  return STYLE_TAG_ALLOWED_ATTRS_PATTERN.test(attrsRaw);
}

function sanitizeInlineSvgCss(cssRaw: string): string | null {
  const withoutCdata = cssRaw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");

  if (hasUnterminatedCssComment(withoutCdata)) {
    return null;
  }

  const withoutComments = withoutCdata.replace(/\/\*[\s\S]*?\*\//g, "");
  const css = withoutComments.trim();

  if (css.length === 0) {
    return "";
  }

  if (css.length > MAX_STYLE_CHARS || DISALLOWED_CSS_PATTERN.test(css)) {
    return null;
  }

  if (!isSafeCssStylesheet(css)) {
    return null;
  }

  return css;
}

function hasUnterminatedCssComment(css: string): boolean {
  let searchStart = 0;

  while (searchStart < css.length) {
    const commentStart = css.indexOf("/*", searchStart);
    if (commentStart === -1) {
      return false;
    }

    const commentEnd = css.indexOf("*/", commentStart + 2);
    if (commentEnd === -1) {
      return true;
    }

    searchStart = commentEnd + 2;
  }

  return false;
}

function isSafeCssStylesheet(css: string): boolean {
  let index = 0;

  while (index < css.length) {
    index = skipWhitespace(css, index);
    if (index >= css.length) {
      return true;
    }

    if (css[index] === "@") {
      const atRuleNameMatch = css.slice(index).match(/^@([a-z-]+)/i);
      const atRuleName = atRuleNameMatch?.[1]?.toLowerCase();
      if (!atRuleName || !ALLOWED_CSS_AT_RULES.has(atRuleName)) {
        return false;
      }

      const openBraceIndex = findTopLevelCharacter(css, "{", index);
      if (openBraceIndex === -1) {
        return false;
      }
      const closeBraceIndex = findMatchingBrace(css, openBraceIndex);
      if (closeBraceIndex === -1) {
        return false;
      }

      if (!isSafeAtRuleBody(css, index, openBraceIndex, closeBraceIndex, atRuleName)) {
        return false;
      }

      index = closeBraceIndex + 1;
      continue;
    }

    const openBraceIndex = css.indexOf("{", index);
    if (openBraceIndex === -1) {
      return false;
    }

    const selector = css.slice(index, openBraceIndex).trim();
    if (!isSafeCssSelector(selector)) {
      return false;
    }

    const closeBraceIndex = findMatchingBrace(css, openBraceIndex);
    if (closeBraceIndex === -1) {
      return false;
    }

    const declarationBlock = css.slice(openBraceIndex + 1, closeBraceIndex);
    if (!isSafeCssDeclarations(declarationBlock)) {
      return false;
    }

    index = closeBraceIndex + 1;
  }

  return true;
}

function isSafeAtRuleBody(
  css: string,
  atRuleStartIndex: number,
  openBraceIndex: number,
  closeBraceIndex: number,
  atRuleName: string,
): boolean {
  if (atRuleName === "keyframes") {
    const keyframesPrelude = css.slice(atRuleStartIndex, openBraceIndex);
    const keyframesMatch = keyframesPrelude.match(/^@keyframes\s+([A-Za-z_][\w-]*)\s*$/i);
    if (!keyframesMatch || !isSafeKeyframesName(keyframesMatch[1])) {
      return false;
    }

    const keyframesBody = css.slice(openBraceIndex + 1, closeBraceIndex);
    return isSafeKeyframesBody(keyframesBody);
  }

  if (!CSS_NESTED_RULE_AT_RULES.has(atRuleName)) {
    return false;
  }

  const atRulePrelude = css.slice(atRuleStartIndex, openBraceIndex);
  if (!isSafeAtRulePrelude(atRulePrelude, atRuleName)) {
    return false;
  }

  const nestedStylesheet = css.slice(openBraceIndex + 1, closeBraceIndex);
  return isSafeCssStylesheet(nestedStylesheet);
}

function isSafeAtRulePrelude(prelude: string, atRuleName: string): boolean {
  const normalizedPrelude = prelude.replace(/^@[a-z-]+/i, "").trim();
  if (!normalizedPrelude) {
    return false;
  }

  if (!/^[,.:()'"\/%+\-<>=\s\w]*$/.test(normalizedPrelude)) {
    return false;
  }

  if (atRuleName === "media") {
    return /\(|\b(?:all|print|screen|speech)\b/i.test(normalizedPrelude);
  }

  if (atRuleName === "supports") {
    return normalizedPrelude.includes("(");
  }

  return false;
}

function isSafeKeyframesName(name: string): boolean {
  return /^[A-Za-z_][\w-]{0,63}$/.test(name);
}

function isSafeKeyframesBody(body: string): boolean {
  let index = 0;

  while (index < body.length) {
    index = skipWhitespace(body, index);
    if (index >= body.length) {
      return true;
    }

    const openBraceIndex = body.indexOf("{", index);
    if (openBraceIndex === -1) {
      return false;
    }

    const frameSelector = body.slice(index, openBraceIndex).trim();
    if (!isSafeKeyframeSelector(frameSelector)) {
      return false;
    }

    const closeBraceIndex = findMatchingBrace(body, openBraceIndex);
    if (closeBraceIndex === -1) {
      return false;
    }

    const declarationBlock = body.slice(openBraceIndex + 1, closeBraceIndex);
    if (!isSafeCssDeclarations(declarationBlock)) {
      return false;
    }

    index = closeBraceIndex + 1;
  }

  return true;
}

function isSafeKeyframeSelector(selector: string): boolean {
  if (!selector) {
    return false;
  }

  const selectors = selector.split(",").map((entry) => entry.trim());
  if (selectors.length === 0) {
    return false;
  }

  for (const part of selectors) {
    if (part === "from" || part === "to") {
      continue;
    }

    const percentMatch = part.match(/^(\d{1,3}(?:\.\d+)?)%$/);
    if (!percentMatch) {
      return false;
    }

    const value = Number.parseFloat(percentMatch[1]);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      return false;
    }
  }

  return true;
}

function isSafeCssSelector(selector: string): boolean {
  if (!selector || selector.length > 300) {
    return false;
  }

  if (selector.includes("@") || selector.includes("\\") || /[{}<`]/.test(selector)) {
    return false;
  }

  return /^[#.:\[\]="'()*+,>~|^$\s\w-]+$/.test(selector);
}

function isSafeCssDeclarations(block: string): boolean {
  const declarations = splitCssDeclarations(block);
  if (declarations === null) {
    return false;
  }

  if (declarations.length === 0) {
    return true;
  }

  for (const declaration of declarations) {
    const colonIndex = findTopLevelColon(declaration);
    if (colonIndex <= 0) {
      return false;
    }

    const property = declaration.slice(0, colonIndex).trim().toLowerCase();
    const value = declaration.slice(colonIndex + 1).trim();

    if (!isAllowedCssProperty(property)) {
      return false;
    }

    if (!isSafeCssValue(value)) {
      return false;
    }
  }

  return true;
}

function isAllowedCssProperty(property: string): boolean {
  if (!isSafeCssPropertyName(property)) {
    return false;
  }

  if (isAllowedCustomProperty(property)) {
    return true;
  }

  return !BLOCKED_CSS_PROPERTIES.has(property);
}

function splitCssDeclarations(block: string): string[] | null {
  const declarations: string[] = [];
  let start = 0;
  let parenDepth = 0;
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < block.length; index++) {
    const char = block[index];

    if (quote) {
      if (char === "\\") {
        index += 1;
        continue;
      }

      if (char === quote) {
        quote = null;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === "(") {
      parenDepth += 1;
      continue;
    }

    if (char === ")") {
      if (parenDepth > 0) {
        parenDepth -= 1;
      }
      continue;
    }

    if ((char === "{" || char === "}") && parenDepth === 0) {
      return null;
    }

    if (char === ";" && parenDepth === 0) {
      const declaration = block.slice(start, index).trim();
      if (declaration) {
        declarations.push(declaration);
      }
      start = index + 1;
    }
  }

  const trailing = block.slice(start).trim();
  if (trailing) {
    declarations.push(trailing);
  }

  return declarations;
}

function findTopLevelColon(input: string): number {
  let parenDepth = 0;
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < input.length; index++) {
    const char = input[index];

    if (quote) {
      if (char === "\\") {
        index += 1;
        continue;
      }

      if (char === quote) {
        quote = null;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === "(") {
      parenDepth += 1;
      continue;
    }

    if (char === ")") {
      if (parenDepth > 0) {
        parenDepth -= 1;
      }
      continue;
    }

    if (char === ":" && parenDepth === 0) {
      return index;
    }
  }

  return -1;
}

function findTopLevelCharacter(input: string, targetCharacter: string, startIndex = 0): number {
  let parenDepth = 0;
  let quote: '"' | "'" | null = null;

  for (let index = startIndex; index < input.length; index++) {
    const char = input[index];

    if (quote) {
      if (char === "\\") {
        index += 1;
        continue;
      }

      if (char === quote) {
        quote = null;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === "(") {
      parenDepth += 1;
      continue;
    }

    if (char === ")") {
      if (parenDepth > 0) {
        parenDepth -= 1;
      }
      continue;
    }

    if (char === targetCharacter && parenDepth === 0) {
      return index;
    }
  }

  return -1;
}

function isSafeCssValue(value: string): boolean {
  if (!value || value.length > 300) {
    return false;
  }

  if (DISALLOWED_CSS_PATTERN.test(value)) {
    return false;
  }

  if (/[{}<>`]/.test(value)) {
    return false;
  }

  if (value.includes("\\")) {
    return false;
  }

  if (!containsOnlyLocalFragmentUrls(value)) {
    return false;
  }

  return /^[#(),.%/\s+\-!"'\w:*\[\]?|=]*$/.test(value);
}

function sanitizeStyleAttribute(styleValue: string): string | null {
  const trimmed = styleValue.trim();
  if (trimmed.length === 0) {
    return "";
  }

  if (
    trimmed.length > MAX_STYLE_ATTR_CHARS ||
    trimmed.includes("@") ||
    DISALLOWED_CSS_PATTERN.test(trimmed)
  ) {
    return null;
  }

  if (!isSafeCssDeclarations(trimmed)) {
    return null;
  }

  return trimmed;
}

function isSafeCssPropertyName(property: string): boolean {
  return /^[a-z-]+$/.test(property) || /^--[a-z0-9-]+$/.test(property);
}

function isAllowedCustomProperty(property: string): boolean {
  return /^--[a-z0-9-]+$/.test(property);
}

function containsOnlyLocalFragmentUrls(value: string): boolean {
  const urlRegex = /url\s*\(([^)]*)\)/gi;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(value)) !== null) {
    const rawTarget = match[1].trim();
    const normalizedTarget = rawTarget.replace(/^['"]|['"]$/g, "").trim();
    if (!/^#[-\w:.]+$/.test(normalizedTarget)) {
      return false;
    }
  }

  return true;
}

function isSafeLocalFragmentReference(rawValue: string): boolean {
  const value = rawValue.trim();
  if (!value) {
    return false;
  }

  if (LOCAL_FRAGMENT_REFERENCE_PATTERN.test(value)) {
    return true;
  }

  if (!LOCAL_FRAGMENT_URL_REFERENCE_PATTERN.test(value)) {
    return false;
  }

  return containsOnlyLocalFragmentUrls(value);
}

function isSafeUrlReferenceAttributeValue(attrName: string, rawValue: string): boolean {
  if (attrName === "href" || attrName === "xlink:href") {
    return isSafeLocalFragmentReference(rawValue);
  }

  const normalizedValue = rawValue.trim().toLowerCase();
  if (normalizedValue === "none") {
    return true;
  }

  return isSafeLocalFragmentReference(rawValue);
}

function findMatchingBrace(input: string, openBraceIndex: number): number {
  let depth = 0;
  let quote: '"' | "'" | null = null;

  for (let index = openBraceIndex; index < input.length; index++) {
    const char = input[index];

    if (quote) {
      if (char === "\\") {
        index += 1;
        continue;
      }

      if (char === quote) {
        quote = null;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function skipWhitespace(input: string, index: number): number {
  let cursor = index;
  while (cursor < input.length && /\s/.test(input[cursor])) {
    cursor += 1;
  }
  return cursor;
}

function reinsertStyleBlocks(
  documentNode: Document,
  root: Element,
  styles: ExtractedStyleBlock[],
): boolean {
  if (styles.length === 0) {
    return true;
  }

  const svgContainer = findClosestSvgContainer(root);
  if (!svgContainer) {
    return false;
  }

  const defs = findOrCreateDefs(documentNode, svgContainer);

  let inserted = 0;
  for (const style of styles) {
    const placeholder = svgContainer.querySelector(`desc[id="${style.placeholderId}"]`);
    if (!placeholder) {
      return false;
    }

    const styleElement = documentNode.createElementNS("http://www.w3.org/2000/svg", "style");
    styleElement.textContent = style.cssText;
    defs.append(styleElement);
    placeholder.remove();
    inserted += 1;
  }

  return inserted === styles.length;
}

function findClosestSvgContainer(root: Element): SVGElement | null {
  const nearestSvg = root.closest("svg");
  return nearestSvg instanceof SVGElement ? nearestSvg : null;
}

function findOrCreateDefs(documentNode: Document, svgContainer: SVGElement): SVGDefsElement {
  const existingDefs = Array.from(svgContainer.children).find(
    (child) => child.tagName.toLowerCase() === "defs",
  );
  if (existingDefs instanceof SVGDefsElement) {
    return existingDefs;
  }

  const defs = documentNode.createElementNS("http://www.w3.org/2000/svg", "defs");
  svgContainer.insertBefore(defs, svgContainer.firstChild);
  return defs;
}
