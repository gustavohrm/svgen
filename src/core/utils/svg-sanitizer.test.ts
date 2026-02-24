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
});
