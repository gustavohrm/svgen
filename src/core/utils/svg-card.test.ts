import { describe, expect, it } from "vitest";
import { renderSvgCard, sanitizeSvgForDisplay } from "./svg-card";

function getIframeFromSanitizedHtml(html: string): HTMLIFrameElement {
  const host = document.createElement("div");
  host.innerHTML = html;
  const iframe = host.querySelector("iframe");

  expect(iframe).toBeTruthy();
  return iframe as HTMLIFrameElement;
}

describe("sanitizeSvgForDisplay", () => {
  it("renders sanitized markup inside a sandboxed iframe", () => {
    const html = sanitizeSvgForDisplay(
      '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="#f00"/></svg>',
    );

    const iframe = getIframeFromSanitizedHtml(html);

    expect(iframe.getAttribute("sandbox")).toBe("");
    expect(iframe.getAttribute("aria-hidden")).toBe("true");
    expect(iframe.getAttribute("tabindex")).toBe("-1");
    expect(iframe.getAttribute("srcdoc")).toContain("<svg");
    expect(iframe.getAttribute("srcdoc")).toContain("<rect");
  });

  it("falls back to a safe placeholder when SVG is rejected", () => {
    const html = sanitizeSvgForDisplay(
      '<svg viewBox="0 0 10 10"><script>alert(1)</script><rect x="1" y="1" width="8" height="8"/></svg>',
    );

    const iframe = getIframeFromSanitizedHtml(html);

    expect(iframe.getAttribute("srcdoc")).toContain('viewBox="0 0 48 48"');
  });

  it("keeps rich CSS in srcdoc while preserving iframe sandbox isolation", () => {
    const html = sanitizeSvgForDisplay(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="g"><stop offset="0" stop-color="#60a5fa"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><style>@layer effects{.shape{fill:url(#g);filter:url(#f);mix-blend-mode:screen}}@keyframes drift{0%{transform:translateY(0)}50%{transform:translateY(-1px)}100%{transform:translateY(0)}}.shape{animation:drift 2s ease-in-out infinite}</style><filter id="f"><feGaussianBlur stdDeviation="0.2"/></filter><circle class="shape" cx="12" cy="12" r="8"/></svg>',
    );

    const iframe = getIframeFromSanitizedHtml(html);

    expect(iframe.getAttribute("sandbox")).toBe("");
    expect(iframe.getAttribute("srcdoc")).toContain("@layer effects");
    expect(iframe.getAttribute("srcdoc")).toContain("@keyframes drift");
    expect(iframe.getAttribute("srcdoc")).toContain("mix-blend-mode:screen");
    expect(iframe.getAttribute("srcdoc")).toContain("<html>");
    expect(iframe.getAttribute("srcdoc")).toContain("<svg");
  });

  it("backfills viewBox from width and height for preview scaling", () => {
    const html = sanitizeSvgForDisplay(
      '<svg width="1024" height="1024"><circle cx="512" cy="512" r="300" fill="#111"/></svg>',
    );

    const iframe = getIframeFromSanitizedHtml(html);

    expect(iframe.getAttribute("srcdoc")).toContain('viewBox="0 0 1024 1024"');
  });

  it("keeps SVG markup unchanged when dimensions are percentage based", () => {
    const html = sanitizeSvgForDisplay(
      '<svg width="100%" height="100%"><rect x="10" y="10" width="80" height="80" fill="#111"/></svg>',
    );

    const iframe = getIframeFromSanitizedHtml(html);

    expect(iframe.getAttribute("srcdoc")).not.toContain('viewBox="0 0 100 100"');
  });

  it("shows viewport warning badge when preview auto-fixes missing viewBox", () => {
    const html = renderSvgCard({
      svg: '<svg width="1024" height="1024"><circle cx="512" cy="512" r="300" fill="#111"/></svg>',
      cardId: "result-1",
      label: "Variation 1",
    });

    expect(html).toContain("Auto-fit viewBox");
  });

  it("does not show viewport warning badge when SVG already has viewBox", () => {
    const html = renderSvgCard({
      svg: '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="#111"/></svg>',
      cardId: "result-2",
      label: "Variation 2",
    });

    expect(html).not.toContain("Auto-fit viewBox");
  });
});
