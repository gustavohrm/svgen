import { describe, expect, it } from "vitest";
import { sanitizeSvgForDisplay } from "./svg-card";

describe("sanitizeSvgForDisplay", () => {
  it("renders sanitized markup inside a sandboxed iframe", () => {
    const html = sanitizeSvgForDisplay(
      '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="#f00"/></svg>',
    );

    const host = document.createElement("div");
    host.innerHTML = html;
    const iframe = host.querySelector("iframe");

    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute("sandbox")).toBe("");
    expect(iframe?.getAttribute("srcdoc")).toContain("<svg");
    expect(iframe?.getAttribute("srcdoc")).toContain("<rect");
  });

  it("falls back to a safe placeholder when SVG is rejected", () => {
    const html = sanitizeSvgForDisplay(
      '<svg viewBox="0 0 10 10"><script>alert(1)</script><rect x="1" y="1" width="8" height="8"/></svg>',
    );

    const host = document.createElement("div");
    host.innerHTML = html;
    const iframe = host.querySelector("iframe");

    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute("srcdoc")).toContain('viewBox="0 0 48 48"');
  });
});
