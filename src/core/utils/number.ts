export const MAX_POSITIVE_INT = 100;

/**
 * Normalize a number into a positive integer within the range 1 to MAX_POSITIVE_INT.
 *
 * @param value - The input number to normalize
 * @returns `1` if `value` is not finite, otherwise the integer value obtained by applying `Math.floor` to `value` and clamping the result to the inclusive range `[1, MAX_POSITIVE_INT]`
 */
export function normalizePositiveInt(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(MAX_POSITIVE_INT, Math.max(1, Math.floor(value)));
}
