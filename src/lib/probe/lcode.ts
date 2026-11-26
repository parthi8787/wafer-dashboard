/** Map numeric lcode values to display names. */
export const LCODE_LABELS: Record<string, string> = {
  '252768': 'SDE',
  '132150': 'SDT',
  '132110': 'SDS',
}

/** Soft-bins excluded from SDT / SDE / SDS yield denominator. */
export const YIELD_EXCLUDE_BINS = new Set(['93'])
export const YIELD_EXCLUDE_BIN93_LCODES = new Set([
  '132150', // SDT
  '252768', // SDE
  '132110', // SDS
])

export const SDS_LCODE = '132110'

export function lcodeLabel(code: string | null | undefined): string {
  if (!code) return '—'
  return LCODE_LABELS[code] || code
}

/** Die count used as yield denominator (SDT/SDE/SDS exclude bin 93). */
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

/** Bins to hide from fail-pareto for a given lcode filter (SDS never shows 93). */
export function paretoExcludeBins(lcodeFilter: string): Set<string> {
  if (lcodeFilter === SDS_LCODE) return new Set(['93'])
  return new Set()
}
