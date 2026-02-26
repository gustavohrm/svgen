import { describe, expect, it } from "vitest";
import { updatePaletteSelectionUi } from "./generator-controls.palette";

function createOptionNode(paletteId: string, isSelected: boolean): HTMLButtonElement {
  const button = document.createElement("button");
  button.dataset.colorPaletteId = paletteId;
  button.className = isSelected
    ? "w-full text-left rounded-lg px-2 py-2 border transition-colors border-border-bright bg-surface-hover/60"
    : "w-full text-left rounded-lg px-2 py-2 border transition-colors border-transparent hover:border-border/60 hover:bg-surface-hover/50";

  const content = document.createElement("span");
  content.dataset.colorPaletteOptionContent = "true";
  button.appendChild(content);

  if (isSelected) {
    const selectedBadge = document.createElement("span");
    selectedBadge.dataset.selectedPaletteBadge = "true";
    content.appendChild(selectedBadge);
  }

  return button;
}

describe("updatePaletteSelectionUi", () => {
  it("updates preview style and selected badge state", () => {
    const previewNode = document.createElement("span");
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
    expect(selectedOption.querySelector("[data-selected-palette-badge]")).toBeNull();
    expect(targetOption.querySelector("[data-selected-palette-badge]")).toBeTruthy();
    expect(targetOption.className).toContain("border-border-bright");
    expect(selectedOption.className).toContain("hover:border-border/60");
  });
});
