export const MAX_POSITIVE_INT = 100;

export function normalizePositiveInt(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(MAX_POSITIVE_INT, Math.max(1, Math.floor(value)));
}
