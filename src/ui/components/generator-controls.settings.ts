export function clampVariations(value: number): number {
  if (Number.isNaN(value)) return 1;
  if (value < 1) return 1;
  if (value > 4) return 4;
  return Math.round(value);
}

export function clampTemperature(value: number): number {
  if (Number.isNaN(value)) return 1;
  if (value < 0) return 0;
  if (value > 2) return 2;
  return Math.round(value * 10) / 10;
}

export function togglePanel(panel: HTMLElement): void {
  const isHidden = panel.classList.contains("hidden");
  panel.classList.toggle("hidden", !isHidden);
  panel.classList.toggle("flex", isHidden);
}

export function showPanel(panel: HTMLElement): void {
  panel.classList.remove("hidden");
  panel.classList.add("flex");
}

export function hidePanel(panel: HTMLElement): void {
  panel.classList.add("hidden");
  panel.classList.remove("flex");
}
