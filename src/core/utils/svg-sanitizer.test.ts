import { describe, expect, it } from "vitest";
import { sanitizeSvgMarkup } from "./svg-sanitizer";

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

  it("rejects unsafe inline style attributes", () => {
    const result = sanitizeSvgMarkup(
      '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" style="position:fixed;left:0"/></svg>',
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
});
