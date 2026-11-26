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
 * For SDT and SDE, bin 93 is prior-flow bin-out — exclude it from both
 * yield denominator and fail-pareto counts. SDS keeps every fail bin.
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

/** True when this soft-bin must be omitted from SDT/SDE fail pareto. */
export function excludeBinFromPareto(lcode: string, bin: string): boolean {
  return YIELD_EXCLUDE_BIN93_LCODES.has(lcode) && YIELD_EXCLUDE_BINS.has(bin)
}

/** Filter-level exclude set when the active LCode is SDT or SDE. */
export function paretoExcludeBins(lcodeFilter: string): Set<string> {
  if (YIELD_EXCLUDE_BIN93_LCODES.has(lcodeFilter)) return new Set(YIELD_EXCLUDE_BINS)
  return new Set()
}
