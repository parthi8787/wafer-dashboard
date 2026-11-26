/** Map numeric lcode values to display names. */
export const LCODE_LABELS: Record<string, string> = {
  '252768': 'SDE',
  '132150': 'SDT',
  '132110': 'SDS',
}

/**
 * Probe cascade:
 *   SDS (first)  → fails are real bins as tested.
 *   SDT (next)   → SDS fails are binned out as soft-bin 93.
 *   SDE (last)   → SDS+SDT fails are binned out as soft-bin 93.
 *
 * Yield for SDT/SDE therefore excludes bin 93 from the denominator
 * (carry-forward prior-flow fails, not new fails at that step).
 * SDS yield uses all dies — do not exclude bin 93.
 */
export const YIELD_EXCLUDE_BINS = new Set(['93'])
export const YIELD_EXCLUDE_BIN93_LCODES = new Set([
  '132150', // SDT
  '252768', // SDE
])

export const SDS_LCODE = '132110'
export const SDT_LCODE = '132150'
export const SDE_LCODE = '252768'

export function lcodeLabel(code: string | null | undefined): string {
  if (!code) return '—'
  return LCODE_LABELS[code] || code
}

/** Die count used as yield denominator (SDT/SDE exclude bin 93; SDS does not). */
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

/**
 * Pareto: SDS shows all fail bins as-is.
 * Bin 93 is meaningful on SDT/SDE (prior-flow bin-out) so it stays visible there.
 */
export function paretoExcludeBins(_lcodeFilter: string): Set<string> {
  return new Set()
}
