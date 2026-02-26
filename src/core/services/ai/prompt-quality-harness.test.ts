import { describe, expect, it } from "vitest";
import { comparePromptQuality, scorePromptQuality } from "./prompt-quality-harness";

describe("prompt quality harness", () => {
  it("scores a structured prompt higher than a vague prompt", () => {
    const vaguePrompt = "an icon";
    const structuredPrompt = [
      "Subject: glowing isometric cube icon",
      "Style: geometric and futuristic",
      "Composition: centered symbol with layered foreground and background depth",
      "Color intent: cyan-blue gradient with high contrast accents",
      "Motion: subtle clockwise orbit and pulsing glow loop",
      "Constraints: avoid text labels and keep a clean silhouette",
    ].join("\n");

    const comparison = comparePromptQuality(vaguePrompt, structuredPrompt);

    expect(comparison.improved).toBe(true);
    expect(comparison.scoreDelta).toBeGreaterThan(0);
    expect(comparison.after.score).toBeGreaterThan(comparison.before.score);
  });

  it("reports missing prompt dimensions for terse prompts", () => {
    const report = scorePromptQuality("draw a logo");

    expect(report.missingDimensions).toContain("style");
    expect(report.missingDimensions).toContain("composition");
    expect(report.missingDimensions).toContain("color");
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it("covers all dimensions for a fully specified prompt", () => {
    const report = scorePromptQuality(
      "Create a badge icon in a minimal geometric style with centered composition, monochrome color palette, static presentation, and constraints: avoid gradients and keep only circles and rectangles.",
    );

    expect(report.missingDimensions).toEqual([]);
    expect(report.score).toBe(report.maxScore);
    expect(report.percentage).toBe(100);
  });

  it("tracks newly covered dimensions in prompt comparison", () => {
    const beforePrompt = "draw a rotating planet";
    const afterPrompt =
      "Draw a rotating planet icon in a retro line-art style with diagonal composition, cool color palette, smooth loop animation, and constraints: no text or external assets.";

    const comparison = comparePromptQuality(beforePrompt, afterPrompt);

    expect(comparison.newlyCoveredDimensions).toContain("style");
    expect(comparison.newlyCoveredDimensions).toContain("composition");
    expect(comparison.newlyCoveredDimensions).toContain("color");
    expect(comparison.newlyCoveredDimensions).toContain("constraints");
  });
});
