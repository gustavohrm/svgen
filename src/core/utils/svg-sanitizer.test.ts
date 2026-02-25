import { describe, expect, it } from "vitest";
import { SVG_CSS_ALLOWED_PROPERTIES } from "../constants/svg-css-policy";
import { MAX_STYLE_BLOCKS, MAX_STYLE_CHARS, sanitizeSvgMarkup } from "./svg-sanitizer";

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

  it("rejects inline style when property is not in ALLOWED_CSS_PROPERTIES (position)", () => {
    expect(SVG_CSS_ALLOWED_PROPERTIES).not.toContain("position");

    const result = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" style="position:fixed"/></svg>',
    );

    expect(result).toBeNull();
  });

  it("rejects inline style when property is not in ALLOWED_CSS_PROPERTIES (left)", () => {
    expect(SVG_CSS_ALLOWED_PROPERTIES).not.toContain("left");

    const result = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" style="left:0"/></svg>',
    );

    expect(result).toBeNull();
  });

  it("rejects unsupported CSS at-rules", () => {
    const result = sanitizeSvgMarkup(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><style>@media (prefers-reduced-motion: reduce){.shape{animation:none}} .shape{animation:spin 1s linear infinite}</style><rect class="shape" x="1" y="1" width="8" height="8"/></svg>',
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
    const oversizedCss = Array.from(
      { length: 500 },
      (_entry, index) => `.s${index}{opacity:.5}`,
    ).join("");
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
