import { describe, expect, it } from "vitest";
import { MAX_POSITIVE_INT, normalizePositiveInt } from "./number";

describe("normalizePositiveInt", () => {
  it("returns 1 for non-finite numbers", () => {
    expect(normalizePositiveInt(Number.NaN)).toBe(1);
    expect(normalizePositiveInt(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it("floors finite numbers and enforces minimum 1", () => {
    expect(normalizePositiveInt(2.9)).toBe(2);
    expect(normalizePositiveInt(0.7)).toBe(1);
    expect(normalizePositiveInt(-10)).toBe(1);
  });

  it("caps large values at MAX_POSITIVE_INT", () => {
    expect(normalizePositiveInt(MAX_POSITIVE_INT + 50)).toBe(MAX_POSITIVE_INT);
  });
});
