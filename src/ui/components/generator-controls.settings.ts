export const DEFAULT_TEMPERATURE = 0.7;

/**
 * Clamp and normalize a variation count to an integer between 1 and 4.
 *
 * NaN and values less than 1 yield 1; values greater than 4 yield 4; other values are rounded to the nearest integer.
 *
 * @param value - The requested variation count to clamp
 * @returns An integer between 1 and 4 inclusive representing the clamped variation count
 */
export function clampVariations(value: number): number {
  if (Number.isNaN(value)) return 1;
  if (value < 1) return 1;
  if (value > 4) return 4;
  return Math.round(value);
}

/**
 * Clamp a temperature value to the valid range used by the generator.
 *
 * @param value - The input temperature value to clamp
 * @returns The clamped temperature: `0` if `value < 0`, `2` if `value > 2`, `DEFAULT_TEMPERATURE` if `value` is `NaN`, otherwise `value` rounded to one decimal place
 */
export function clampTemperature(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_TEMPERATURE;
  if (value < 0) return 0;
  if (value > 2) return 2;
  return Math.round(value * 10) / 10;
}

/**
 * Toggle a panel's visibility by swapping its "hidden" and "flex" classes.
 *
 * If the panel currently has the "hidden" class, the function removes "hidden" and adds "flex";
 * otherwise it adds "hidden" and removes "flex".
 *
 * @param panel - The HTMLElement representing the panel to toggle
 */
export function togglePanel(panel: HTMLElement): void {
  const isHidden = panel.classList.contains("hidden");
  panel.classList.toggle("hidden", !isHidden);
  panel.classList.toggle("flex", isHidden);
}

/**
 * Ensures the given panel is visible by removing the "hidden" class and adding the "flex" class.
 *
 * @param panel - The HTMLElement whose classes will be modified to show the panel
 */
export function showPanel(panel: HTMLElement): void {
  panel.classList.remove("hidden");
  panel.classList.add("flex");
}

/**
 * Hides a panel element by adding the `hidden` class and removing the `flex` class.
 *
 * @param panel - The HTMLElement to hide; `hidden` will be added and `flex` will be removed
 */
export function hidePanel(panel: HTMLElement): void {
  panel.classList.add("hidden");
  panel.classList.remove("flex");
}
