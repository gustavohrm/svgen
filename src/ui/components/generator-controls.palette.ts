import {
  getColorPaletteOptionButtonClass,
  getColorPalettePreviewStyle,
  type ColorPaletteId,
} from "../../core/constants/color-palettes";

interface UpdatePaletteSelectionUiInput {
  paletteId: ColorPaletteId;
  previewNode: HTMLSpanElement | null;
  optionNodes: NodeListOf<HTMLButtonElement>;
}

export function updatePaletteSelectionUi({
  paletteId,
  previewNode,
  optionNodes,
}: UpdatePaletteSelectionUiInput): void {
  if (previewNode) {
    previewNode.setAttribute("style", getColorPalettePreviewStyle(paletteId));
  }

  optionNodes.forEach((optionNode) => {
    const optionPaletteId = optionNode.dataset.colorPaletteId;
    const isSelected = optionPaletteId === paletteId;

    optionNode.className = getColorPaletteOptionButtonClass(isSelected);

    const selectedBadge = optionNode.querySelector("[data-selected-palette-badge]");
    if (isSelected && !selectedBadge) {
      const badge = document.createElement("span");
      badge.className = "text-[11px] text-text-secondary";
      badge.dataset.selectedPaletteBadge = "true";
      badge.textContent = "Selected";
      optionNode.querySelector("[data-color-palette-option-content]")?.appendChild(badge);
    }

    if (!isSelected && selectedBadge) {
      selectedBadge.remove();
    }
  });
}
