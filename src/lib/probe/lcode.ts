/** Map numeric lcode values to display names. */
export const LCODE_LABELS: Record<string, string> = {
  '252768': 'SDE',
  '132150': 'SDT',
  '132110': 'SDS',
}

/** Soft-bins excluded from SDT / SDE yield denominator. */
export const YIELD_EXCLUDE_BINS = new Set(['93'])
export const YIELD_EXCLUDE_BIN93_LCODES = new Set(['132150', '252768']) // SDT, SDE

export function lcodeLabel(code: string | null | undefined): string {
  if (!code) return '—'
  return LCODE_LABELS[code] || code
}

/** Die count used as yield denominator (SDT/SDE exclude bin 93). */
export function yieldDenominator(
  lcode: string,
  dieCount: number,
  binCounts: Record<string, number>,
): number {
  if (!YIELD_EXCLUDE_BIN93_LCODES.has(lcode)) return dieCount
  let excluded = 0
  for (const bin of YIELD_EXCLUDE_BINS) {
    excluded += binCounts[bin] || 0
  }
  return Math.max(0, dieCount - excluded)
}

export function yieldPct(
  lcode: string,
  passCount: number,
  dieCount: number,
  binCounts: Record<string, number>,
): number {
  const denom = yieldDenominator(lcode, dieCount, binCounts)
  return denom ? (100 * passCount) / denom : 0
}
