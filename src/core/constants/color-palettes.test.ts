import { describe, expect, it } from "vitest";
import {
  DEFAULT_COLOR_PALETTE_ID,
  buildColorPalettePolicyXml,
  getColorPaletteOptionButtonClass,
  getColorPalettePreviewStyle,
  isColorPaletteId,
} from "./color-palettes";

describe("color palettes", () => {
  it("uses ai-choice as default palette id", () => {
    expect(DEFAULT_COLOR_PALETTE_ID).toBe("ai-choice");
  });

  it("recognizes valid palette ids", () => {
    expect(isColorPaletteId("monochrome")).toBe(true);
    expect(isColorPaletteId("ai-choice")).toBe(true);
    expect(isColorPaletteId("custom")).toBe(false);
  });

  it("builds strict policy xml for curated palettes", () => {
    const xml = buildColorPalettePolicyXml("forest");

    expect(xml).toContain('<color_palette_policy mode="strict">');
    expect(xml).toContain("<allowed_hex_colors>");
    expect(xml).toContain("Exception: if the user explicitly asks for a specific color");
  });

  it("builds adaptive policy xml for AI choice", () => {
    const xml = buildColorPalettePolicyXml("ai-choice");

    expect(xml).toContain('<color_palette_policy mode="adaptive">');
    expect(xml).not.toContain("<allowed_hex_colors>");
  });

  it("returns a gradient style for button preview", () => {
    const style = getColorPalettePreviewStyle("sunset");

    expect(style).toContain("linear-gradient(135deg");
    expect(style).toContain("#f97316");
  });

  it("returns state-aware classes for option buttons", () => {
    const selectedClassName = getColorPaletteOptionButtonClass(true);
    const unselectedClassName = getColorPaletteOptionButtonClass(false);

    expect(selectedClassName).toContain("w-full");
    expect(selectedClassName).toContain("aspect-square");
    expect(selectedClassName).toContain("border-border-bright");
    expect(selectedClassName).toContain("focus-visible:ring-2");
    expect(unselectedClassName).toContain("hover:border-border-bright/80");
    expect(unselectedClassName).toContain("border-border/70");
  });
});
