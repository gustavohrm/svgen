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

/**
 * Update the palette preview element and option buttons to reflect the active palette.
 *
 * @param paletteId - The id of the currently selected color palette to apply
 * @param previewNode - Optional preview element whose inline style will be set to match `paletteId`; ignored if `null`
 * @param optionNodes - Button elements representing palette options; each button's class will be updated based on whether its `data-color-palette-id` matches `paletteId`
 */
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
