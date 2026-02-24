import { describe, expect, it } from "vitest";
import {
  clampTemperature,
  clampVariations,
  DEFAULT_TEMPERATURE,
  hidePanel,
  showPanel,
  togglePanel,
} from "./generator-controls.settings";

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

describe("clampVariations", () => {
  it("returns 1 for NaN", () => {
    expect(clampVariations(Number.NaN)).toBe(1);
  });

  it("clamps 0 to 1", () => {
    expect(clampVariations(0)).toBe(1);
  });

  it("clamps 5 to 4", () => {
    expect(clampVariations(5)).toBe(4);
  });

  it("rounds 3.7 to 4", () => {
    expect(clampVariations(3.7)).toBe(4);
  });
});

describe("panel helpers", () => {
  it("showPanel is idempotent", () => {
    const panel = document.createElement("div");
    panel.classList.add("hidden");

    showPanel(panel);
    showPanel(panel);

    expect(panel.classList.contains("hidden")).toBe(false);
    expect(panel.classList.contains("flex")).toBe(true);
  });

  it("hidePanel is idempotent", () => {
    const panel = document.createElement("div");
    panel.classList.add("flex");

    hidePanel(panel);
    hidePanel(panel);

    expect(panel.classList.contains("hidden")).toBe(true);
    expect(panel.classList.contains("flex")).toBe(false);
  });

  it("togglePanel flips state and returns on second toggle", () => {
    const panel = document.createElement("div");
    panel.classList.add("hidden");

    togglePanel(panel);
    expect(panel.classList.contains("hidden")).toBe(false);
    expect(panel.classList.contains("flex")).toBe(true);

    togglePanel(panel);
    expect(panel.classList.contains("hidden")).toBe(true);
    expect(panel.classList.contains("flex")).toBe(false);
  });
});
