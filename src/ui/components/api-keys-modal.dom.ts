/**
 * Produce a CSS selector-safe string from an input value.
 *
 * Uses the platform `CSS.escape` when available; otherwise converts `value` to a string
 * and returns an escaped representation suitable for use in CSS selectors.
 *
 * @param value - The value to escape (will be converted to a string)
 * @returns A string safe for use in CSS selectors representing the input value
 */
function escapeCssSelectorValue(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  const string = String(value);
  const length = string.length;
  let index = -1;
  let result = "";
  const firstCodeUnit = string.charCodeAt(0);

  while (++index < length) {
    const codeUnit = string.charCodeAt(index);

    if (codeUnit === 0x0000) {
      result += "\uFFFD";
      continue;
    }

    if (
      (codeUnit >= 0x0001 && codeUnit <= 0x001f) ||
      codeUnit === 0x007f ||
      (index === 0 && codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
      (index === 1 && codeUnit >= 0x0030 && codeUnit <= 0x0039 && firstCodeUnit === 0x002d)
    ) {
      result += `\\${codeUnit.toString(16)} `;
      continue;
    }

    if (index === 0 && length === 1 && codeUnit === 0x002d) {
      result += "\\-";
      continue;
    }

    if (
      codeUnit >= 0x0080 ||
      codeUnit === 0x002d ||
      codeUnit === 0x005f ||
      (codeUnit >= 0x0030 && codeUnit <= 0x0039) ||
      (codeUnit >= 0x0041 && codeUnit <= 0x005a) ||
      (codeUnit >= 0x0061 && codeUnit <= 0x007a)
    ) {
      result += string.charAt(index);
      continue;
    }

    result += `\\${string.charAt(index)}`;
  }

  return result;
}

/**
 * Shows the modal element with the given DOM id. If no element matches the id, does nothing.
 *
 * @param id - The id attribute of the modal element to show
 */
export function showModalById(id: string): void {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

/**
 * Hides the modal element with the given DOM id by updating its visibility classes.
 *
 * @param id - The DOM id of the modal element to hide
 */
export function hideModalById(id: string): void {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

/**
 * Update radio inputs and their label text within `root` to mark the active key for a provider.
 *
 * Finds radio inputs with class `key-radio` associated with `providerId`, sets the radio whose value
 * equals `keyId` as checked, and toggles the label's text color classes to indicate active versus inactive state.
 *
 * @param root - Root element that contains the provider key radio inputs.
 * @param providerId - Provider identifier used to select the matching radio inputs.
 * @param keyId - The id of the key to mark as active (the radio with matching value will be checked).
 */
export function applyActiveKeySelectionUI(
  root: HTMLElement,
  providerId: string,
  keyId: string,
): void {
  const escapedProviderId = escapeCssSelectorValue(providerId);

  const radios = root.querySelectorAll(
    `input.key-radio[data-provider-id="${escapedProviderId}"]`,
  ) as NodeListOf<HTMLInputElement>;

  radios.forEach((radio) => {
    const isActive = radio.value === keyId;
    radio.checked = isActive;

    const label = radio.closest("label");
    const title = label?.querySelector("span.text-sm");
    if (!title) return;

    title.classList.toggle("text-text", isActive);
    title.classList.toggle("text-text-secondary", !isActive);
  });
}
