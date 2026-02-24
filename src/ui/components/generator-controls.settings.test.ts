import { describe, expect, it } from "vitest";
import { clampTemperature, DEFAULT_TEMPERATURE } from "./generator-controls.settings";

describe("clampTemperature", () => {
  it("returns the default temperature for NaN", () => {
    expect(clampTemperature(Number.NaN)).toBe(DEFAULT_TEMPERATURE);
  });

  it("clamps values below zero", () => {
    expect(clampTemperature(-0.3)).toBe(0);
  });

  it("clamps values above two", () => {
    expect(clampTemperature(2.8)).toBe(2);
  });

  it("rounds typical decimal values to one place", () => {
    expect(clampTemperature(1.26)).toBe(1.3);
  });
});
