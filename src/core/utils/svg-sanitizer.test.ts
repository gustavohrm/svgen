import { describe, expect, it } from "vitest";
import {
  MAX_STYLE_ATTR_CHARS,
  MAX_STYLE_BLOCKS,
  MAX_STYLE_CHARS,
  sanitizeSvgMarkup,
} from "./svg-sanitizer";
import { SVG_CSS_MAX_SELECTOR_CHARS, SVG_CSS_MAX_VALUE_CHARS } from "../constants/svg-css-policy";

describe("sanitizeSvgMarkup", () => {
  it("keeps safe svg content", () => {
    const result = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="red" /></svg>',
    );

    expect(result).toContain("<svg");
    expect(result).toContain("<circle");
  });

  it("rejects scripts", () => {
    const result = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><script>alert(1)</script><circle cx="5" cy="5" r="4" /></svg>',
    );

    expect(result).toBeNull();
  });

  it("rejects inline events", () => {
    const result = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" onclick="alert(1)" /></svg>',
    );

    expect(result).toBeNull();
  });

  it("rejects foreignObject", () => {
    const result = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><foreignObject><div>bad</div></foreignObject></svg>',
    );

    expect(result).toBeNull();
  });

  it("keeps safe inline CSS keyframe animation", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>@keyframes spin{to{transform:rotate(360deg)}} .spinner{animation:spin 1s linear infinite;transform-origin:5px 5px}</style><rect class="spinner" x="2" y="2" width="6" height="6" fill="red"/></svg>',
    );

    expect(result).toContain("<style>");
    expect(result).toContain("@keyframes spin");
    expect(result).toContain("animation:spin 1s linear infinite");
    expect(result).toContain("<rect");
  });

  it("keeps style tag with type text/css", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style type="text/css">@keyframes fade{from{opacity:0}to{opacity:1}} .shape{animation:fade 1s linear infinite}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).toContain("<style>");
    expect(result).toContain("@keyframes fade");
  });

  it("keeps safe CSS inside CDATA sections", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style><![CDATA[@keyframes pulse{0%{opacity:.4}100%{opacity:1}} .shape{animation:pulse 1s linear infinite}]]></style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).not.toBeNull();
    expect(result).toContain("<style>");
    expect(result).toContain("@keyframes pulse");
    expect(result).toContain("animation:pulse 1s linear infinite");
  });

  it("keeps safe CSS selectors using child combinators", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>svg > g{opacity:.6}</style><g><rect x="1" y="1" width="8" height="8"/></g></svg>',
    );

    expect(result).not.toBeNull();
    expect(result).toContain("<style>");
    expect(result).toContain("svg > g{opacity:.6}");
  });

  it("strips empty style blocks without rejecting the SVG", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>   \n\t  </style><rect x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).not.toBeNull();
    expect(result).toContain("<rect");
    expect(result).not.toContain("<style");
  });

  it("keeps multiple keyframes in one style block", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%{opacity:.5}100%{opacity:1}} .shape{animation:spin 1s linear infinite,pulse 1.5s ease-in-out infinite}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).not.toBeNull();
    expect(result).toContain("@keyframes spin");
    expect(result).toContain("@keyframes pulse");
    expect(result).toContain("animation:spin 1s linear infinite,pulse 1.5s ease-in-out infinite");
  });

  it("reinserts extracted style blocks without colliding with existing desc ids", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><desc id="__svgen_style_placeholder__0">existing-desc</desc><style>.shape{opacity:.5}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).not.toBeNull();
    expect(result).toContain('<desc id="__svgen_style_placeholder__0">existing-desc</desc>');
    expect(result).toContain("<style>");
    expect(result).toContain(".shape{opacity:.5}");
    expect(result).not.toMatch(/<desc id="__svgen_style_placeholder__[^"]*"><\/desc>/);
  });

  it("keeps safe styled SVGs when crypto random APIs are unavailable", () => {
    const originalCrypto = globalThis.crypto;
    const processWithBuiltin = process as typeof process & {
      getBuiltinModule?: (id: string) => unknown;
    };
    const originalGetBuiltinModule = processWithBuiltin.getBuiltinModule;

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: undefined,
      writable: true,
    });
    Object.defineProperty(processWithBuiltin, "getBuiltinModule", {
      configurable: true,
      value: undefined,
      writable: true,
    });

    try {
      const result = sanitizeSvgMarkup(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>.shape{opacity:.5}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>',
      );

      expect(result).not.toBeNull();
      expect(result).toContain("<style>");
      expect(result).toContain(".shape{opacity:.5}");
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: originalCrypto,
        writable: true,
      });
      Object.defineProperty(processWithBuiltin, "getBuiltinModule", {
        configurable: true,
        value: originalGetBuiltinModule,
        writable: true,
      });
    }
  });

  it("falls back when crypto.getRandomValues throws", () => {
    const originalCrypto = globalThis.crypto;

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        getRandomValues: () => {
          throw new Error("random source unavailable");
        },
      },
      writable: true,
    });

    try {
      const result = sanitizeSvgMarkup(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>.shape{opacity:.5}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>',
      );

      expect(result).not.toBeNull();
      expect(result).toContain("<style>");
      expect(result).toContain(".shape{opacity:.5}");
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: originalCrypto,
        writable: true,
      });
    }
  });

  it("keeps broader permissive animation-safe CSS properties", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="g"><stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#0ff"/></linearGradient></defs><style>@keyframes pulse{0%{opacity:.2}50%{opacity:1}100%{opacity:.2}} .shape{animation:pulse 1.2s ease-in-out infinite;fill:url(#g);stroke:#111;stroke-linecap:round;stroke-linejoin:round;mix-blend-mode:multiply;paint-order:stroke fill markers;--local-alpha:.85;fill-opacity:var(--local-alpha)}</style><rect class="shape" x="3" y="3" width="18" height="18" rx="3"/></svg>',
    );

    expect(result).toContain("mix-blend-mode:multiply");
    expect(result).toContain("paint-order:stroke fill markers");
    expect(result).toContain("fill:url(#g)");
    expect(result).toContain("--local-alpha:.85");
  });

  it("keeps expected SVG custom properties with safe values", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>.shape{--local-opacity:.5;opacity:var(--local-opacity)}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).not.toBeNull();
    expect(result).toContain("--local-opacity:.5");
    expect(result).toContain("opacity:var(--local-opacity)");
  });

  it("rejects invalid custom property names", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>.shape{--local$opacity:.5;opacity:var(--local$opacity)}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).toBeNull();
  });

  it("rejects SMIL animation tags", () => {
    const result = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"><animate attributeName="r" values="1;4;1" dur="1s" repeatCount="indefinite"/></circle></svg>',
    );

    expect(result).toBeNull();
  });

  it("rejects animateMotion SMIL tag", () => {
    const result = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"><animateMotion dur="2s" path="M 0 0 L 5 5" repeatCount="indefinite"/></circle></svg>',
    );

    expect(result).toBeNull();
  });

  it("rejects animateTransform SMIL tag", () => {
    const result = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" transform="rotate(0 5 5)"><animateTransform attributeName="transform" type="rotate" from="0 5 5" to="360 5 5" dur="1s" repeatCount="indefinite"/></rect></svg>',
    );

    expect(result).toBeNull();
  });

  it("rejects set SMIL tag", () => {
    const result = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8"><set attributeName="opacity" to="0" begin="0s" dur="1s"/></rect></svg>',
    );

    expect(result).toBeNull();
  });

  it("rejects unsafe CSS rules in style blocks", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>@import "https://evil.example/style.css";</style><rect x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).toBeNull();
  });

  it("rejects unsafe CSS when style closing tag has trailing whitespace", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>@import "https://evil.example/style.css";</style ><rect x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).toBeNull();
  });

  it("keeps safe CSS when style closing tag has trailing whitespace", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>.shape{animation:spin 1s linear infinite;opacity:.9}@keyframes spin{to{transform:rotate(360deg)}}</style   ><rect class="shape" x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).not.toBeNull();
    expect(result).toContain("<style>");
    expect(result).toContain("animation:spin 1s linear infinite");
    expect(result).toContain("@keyframes spin");
  });

  it("keeps safe inline style attributes", () => {
    const result = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" style="fill:#f00;opacity:.7"/></svg>',
    );

    expect(result).toContain('style="fill:#f00;opacity:.7"');
  });

  it("keeps safe inline style attributes with broader standard properties", () => {
    const result = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" style="position:relative;left:0;z-index:1"/></svg>',
    );

    expect(result).toContain('style="position:relative;left:0;z-index:1"');
  });

  it("keeps safe nested CSS rules using @media and @supports", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>@media (prefers-reduced-motion: reduce){.shape{animation:none}}@supports (display:grid){.shape{display:grid}} .shape{animation:spin 1s linear infinite}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).not.toBeNull();
    expect(result).toContain("@media");
    expect(result).toContain("@supports");
  });

  it("keeps modern media query range syntax", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>@media (400px <= width <= 1200px){.shape{opacity:.5}} .shape{opacity:1}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).not.toBeNull();
    expect(result).toContain("@media");
    expect(result).toContain("opacity:.5");
  });

  it("keeps larger complex stylesheets within expanded limits", () => {
    const denseRules = Array.from(
      { length: 100 },
      (_entry, index) =>
        `.n${index}{opacity:.${(index % 9) + 1};transform:translate(${index % 37}px ${index % 29}px);filter:url(#noise);mix-blend-mode:screen}`,
    ).join("");
    expect(denseRules.length).toBeGreaterThan(5_000);
    expect(denseRules.length).toBeLessThan(MAX_STYLE_CHARS);

    const result = sanitizeSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2"/></filter></defs><style>@layer base{.core{fill:#6ee7ff;stroke:#082f49;stroke-width:1.2}}@supports (mix-blend-mode:screen){.core{mix-blend-mode:screen}}@media (prefers-reduced-motion: no-preference){.core{animation:spin 6s linear infinite}}@keyframes spin{to{transform:rotate(360deg)}}${denseRules}</style><g transform="translate(60 60)"><rect class="core n12" x="-24" y="-24" width="48" height="48" rx="8"/></g></svg>`,
    );

    expect(result).not.toBeNull();
    expect(result).toContain("@layer base");
    expect(result).toContain("@supports");
    expect(result).toContain("@media");
    expect(result).toContain("@keyframes spin");
    expect(result).toContain("mix-blend-mode:screen");
    expect(result).toContain("filter:url(#noise)");
  });

  it("keeps @layer block and statement at-rules", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="g"><stop offset="0" stop-color="#ffedd5"/><stop offset="1" stop-color="#fb7185"/></linearGradient></defs><style>@layer base,theme;@layer theme.base{.shape{fill:url(#g)}}@layer{.shape{opacity:.86}}@layer motion{@media (prefers-reduced-motion: no-preference){.shape{animation:pulse 2s ease-in-out infinite}}}@keyframes pulse{0%{transform:scale(.95)}50%{transform:scale(1)}100%{transform:scale(.95)}}</style><circle class="shape" cx="12" cy="12" r="9"/></svg>',
    );

    expect(result).not.toBeNull();
    expect(result).toContain("@layer base,theme;");
    expect(result).toContain("@layer theme.base");
    expect(result).toContain("@layer{");
    expect(result).toContain("@layer motion");
    expect(result).toContain("animation:pulse 2s ease-in-out infinite");
  });

  it("keeps SVG with exactly MAX_STYLE_BLOCKS style tags", () => {
    const styleTags = Array.from(
      { length: MAX_STYLE_BLOCKS },
      (_entry, index) => `<style>.shape${index}{opacity:.${(index % 9) + 1}}</style>`,
    ).join("");
    const result = sanitizeSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${styleTags}<rect class="shape0" x="1" y="1" width="8" height="8"/></svg>`,
    );

    expect(result).not.toBeNull();
  });

  it("keeps style blocks exactly at MAX_STYLE_CHARS", () => {
    const repeatedRule = ".shape{opacity:.5}";
    const repeatedCount = Math.floor((MAX_STYLE_CHARS - 250) / repeatedRule.length);
    const repeatedRules = repeatedRule.repeat(repeatedCount);
    const tailPrefix = ".shape{--tail:";
    const tailSuffix = ";opacity:.6}";
    const tailValueLength =
      MAX_STYLE_CHARS - repeatedRules.length - tailPrefix.length - tailSuffix.length;

    expect(tailValueLength).toBeGreaterThan(0);
    expect(tailValueLength).toBeLessThanOrEqual(SVG_CSS_MAX_VALUE_CHARS);

    const css = `${repeatedRules}${tailPrefix}${"a".repeat(tailValueLength)}${tailSuffix}`;
    expect(css.length).toBe(MAX_STYLE_CHARS);

    const result = sanitizeSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>${css}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>`,
    );

    expect(result).not.toBeNull();
  });

  it("keeps style attributes exactly at MAX_STYLE_ATTR_CHARS", () => {
    const styleAtLimit = [
      `--a:${"a".repeat(980)}`,
      `--b:${"b".repeat(980)}`,
      `--c:${"c".repeat(980)}`,
      `--d:${"d".repeat(31)}`,
      "opacity:0",
    ].join(";");
    expect(styleAtLimit.length).toBe(MAX_STYLE_ATTR_CHARS);

    const result = sanitizeSvgMarkup(
      `<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" style="${styleAtLimit}"/></svg>`,
    );

    expect(result).not.toBeNull();
  });

  it("rejects style attributes above MAX_STYLE_ATTR_CHARS", () => {
    const styleAtLimit = [
      `--a:${"a".repeat(980)}`,
      `--b:${"b".repeat(980)}`,
      `--c:${"c".repeat(980)}`,
      `--d:${"d".repeat(31)}`,
      "opacity:0",
    ].join(";");
    expect(styleAtLimit.length).toBe(MAX_STYLE_ATTR_CHARS);

    const result = sanitizeSvgMarkup(
      `<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" style="${styleAtLimit}a"/></svg>`,
    );

    expect(result).toBeNull();
  });

  it("keeps selectors exactly at the selector length cap", () => {
    const className = "a".repeat(SVG_CSS_MAX_SELECTOR_CHARS - 1);
    const result = sanitizeSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>.${className}{opacity:.7}</style><rect class="${className}" x="1" y="1" width="8" height="8"/></svg>`,
    );

    expect(result).not.toBeNull();
  });

  it("rejects selectors above the selector length cap", () => {
    const className = "a".repeat(SVG_CSS_MAX_SELECTOR_CHARS);
    const result = sanitizeSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>.${className}{opacity:.7}</style><rect class="${className}" x="1" y="1" width="8" height="8"/></svg>`,
    );

    expect(result).toBeNull();
  });

  it("keeps CSS values exactly at the value length cap", () => {
    const valueAtLimit = "a".repeat(SVG_CSS_MAX_VALUE_CHARS);
    const result = sanitizeSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>.shape{--token:${valueAtLimit};opacity:var(--token)}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>`,
    );

    expect(result).not.toBeNull();
  });

  it("rejects CSS values above the value length cap", () => {
    const valueAboveLimit = "a".repeat(SVG_CSS_MAX_VALUE_CHARS + 1);
    const result = sanitizeSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>.shape{--token:${valueAboveLimit};opacity:var(--token)}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>`,
    );

    expect(result).toBeNull();
  });

  it("rejects nested at-rules with external URLs in prelude", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>@supports (background-image:url(https://evil.example/a)){.shape{display:block}}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).toBeNull();
  });

  it("rejects nested at-rules with malformed prelude parentheses", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>@supports ((display:grid){.shape{display:grid}}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).toBeNull();
  });

  it("rejects legacy executable CSS properties", () => {
    const behaviorResult = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" style="behavior:url(#legacy)"/></svg>',
    );
    const mozBindingResult = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><style>.shape{-moz-binding:url(#legacy)}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(behaviorResult).toBeNull();
    expect(mozBindingResult).toBeNull();
  });

  it("rejects unsupported CSS at-rules", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>@document url("https://example.com"){.shape{opacity:.5}}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).toBeNull();
  });

  it("strips unexpected style elements not from extracted blocks", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style/><rect x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).not.toBeNull();
    expect(result).toContain("<rect");
    expect(result).not.toContain("<style");
  });

  it("rejects external URLs inside CSS declarations", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>.shape{fill:url(https://evil.example/fill)}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).toBeNull();
  });

  it("rejects external URLs in href attributes", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><image href="https://evil.example/img.png" width="8" height="8"/></svg>',
    );

    expect(result).toBeNull();
  });

  it("rejects external URLs in xlink:href attributes", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10"><use xlink:href="https://evil.example/#shape"/></svg>',
    );

    expect(result).toBeNull();
  });

  it("rejects mixed-case external URL wrappers in URL-bearing attributes", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><clipPath id="clip"><rect x="1" y="1" width="8" height="8"/></clipPath></defs><rect x="1" y="1" width="8" height="8" clip-path="Url(https://evil.example/clip)"/></svg>',
    );

    expect(result).toBeNull();
  });

  it("rejects relative URLs in URL-bearing attributes", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><use href="/icons.svg#shape"/></svg>',
    );

    expect(result).toBeNull();
  });

  it("keeps local fragment references in URL-bearing attributes", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10"><defs><path id="shape" d="M1 1h8v8H1z"/><clipPath id="clip"><rect x="1" y="1" width="8" height="8"/></clipPath></defs><use href="#shape"/><use xlink:href="#shape"/><rect x="1" y="1" width="8" height="8" clip-path="url(#clip)" filter="none" marker-start="none"/></svg>',
    );

    expect(result).not.toBeNull();
    expect(result).toContain('href="#shape"');
    expect(result).toContain('xlink:href="#shape"');
    expect(result).toContain('clip-path="url(#clip)"');
    expect(result).toContain('filter="none"');
    expect(result).toContain('marker-start="none"');
  });

  it("rejects SVG with more than MAX_STYLE_BLOCKS style tags", () => {
    const styleTags = Array.from(
      { length: MAX_STYLE_BLOCKS + 1 },
      (_entry, index) => `<style>.shape${index}{opacity:.5}</style>`,
    ).join("");
    const result = sanitizeSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">${styleTags}<rect class="shape0" x="1" y="1" width="8" height="8"/></svg>`,
    );

    expect(result).toBeNull();
  });

  it("rejects SVG when a style block exceeds MAX_STYLE_CHARS", () => {
    let oversizedCss = "";
    for (let index = 0; oversizedCss.length <= MAX_STYLE_CHARS; index += 1) {
      oversizedCss += `.s${index}{opacity:.5}`;
    }
    expect(oversizedCss.length).toBeGreaterThan(MAX_STYLE_CHARS);

    const result = sanitizeSvgMarkup(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>${oversizedCss}</style><rect class="s1" x="1" y="1" width="8" height="8"/></svg>`,
    );

    expect(result).toBeNull();
  });

  it("rejects inline style values containing expression(...)", () => {
    const expressionResult = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" style="color:expression(alert(1))"/></svg>',
    );

    expect(expressionResult).toBeNull();
  });

  it("rejects inline style values containing javascript:", () => {
    const javascriptResult = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" style=\'fill:url(javascript:alert(1))\'/></svg>',
    );

    expect(javascriptResult).toBeNull();
  });

  it("rejects style blocks with nested or injected closing-brace selector sequences", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>.foo } .evil { position:fixed }</style><rect class="foo" x="1" y="1" width="8" height="8"/></svg>',
    );

    expect(result).toBeNull();
  });
});
