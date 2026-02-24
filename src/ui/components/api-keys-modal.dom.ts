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
  const radios = root.querySelectorAll(
    `input.key-radio[data-provider-id="${providerId}"]`,
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
