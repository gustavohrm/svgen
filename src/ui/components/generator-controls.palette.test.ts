import { describe, expect, it } from "vitest";
import { updatePaletteSelectionUi } from "./generator-controls.palette";

function createOptionNode(paletteId: string, isSelected: boolean): HTMLButtonElement {
  const button = document.createElement("button");
  button.dataset.colorPaletteId = paletteId;
  button.className = isSelected
    ? "size-8 rounded-md border transition-all duration-200 border-border-bright"
    : "size-8 rounded-md border transition-all duration-200 border-border/70 hover:border-border-bright/80";

  return button;
}

describe("updatePaletteSelectionUi", () => {
  it("updates preview style and selection classes", () => {
    const previewNode = document.createElement("button");
    const selectedOption = createOptionNode("monochrome", true);
    const targetOption = createOptionNode("sunset", false);

    const container = document.createElement("div");
    container.appendChild(selectedOption);
    container.appendChild(targetOption);

    updatePaletteSelectionUi({
      paletteId: "sunset",
      previewNode,
      optionNodes: container.querySelectorAll<HTMLButtonElement>("button[data-color-palette-id]"),
    });

    expect(previewNode.getAttribute("style")).toContain("linear-gradient");
    expect(targetOption.className).toContain("border-border-bright");
    expect(selectedOption.className).toContain("hover:border-border-bright/80");
  });
});
