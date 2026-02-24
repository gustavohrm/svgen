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

export function showModalById(id: string): void {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

export function hideModalById(id: string): void {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

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
