import {
  getColorPaletteOptionButtonClass,
  getColorPalettePreviewStyle,
  type ColorPaletteId,
} from "../../core/constants/color-palettes";

interface UpdatePaletteSelectionUiInput {
  paletteId: ColorPaletteId;
  previewNode: HTMLElement | null;
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
  });
}
