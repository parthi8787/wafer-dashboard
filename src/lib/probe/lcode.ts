/** Map numeric lcode values to display names. */
export const LCODE_LABELS: Record<string, string> = {
  '252768': 'SDE',
  '132150': 'SDT',
  '132110': 'SDS',
}

/**
 * Probe cascade:
 *   SDS (first)  → real fail bins as tested. Bin 93 is not a meaningful SDS fail
 *                  mode (if present in extract, hide from pareto only).
 *   SDT (next)   → SDS fails are binned out as soft-bin 93.
 *   SDE (last)   → SDS+SDT fails are binned out as soft-bin 93.
 *
 * Yield: SDT/SDE exclude bin 93 from denominator; SDS uses all dies.
 * Pareto: bin 93 is excluded on SDS, SDT, and SDE.
 */
export const YIELD_EXCLUDE_BINS = new Set(['93'])
export const YIELD_EXCLUDE_BIN93_LCODES = new Set([
  '132150', // SDT
  '252768', // SDE
])

/** Always hide these soft-bins from fail-pareto charts (all LCodes). */
export const PARETO_EXCLUDE_BINS = new Set(['93'])

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

/** Bin 93 is omitted from fail pareto for every LCode (incl. SDS). */
export function excludeBinFromPareto(_lcode: string, bin: string): boolean {
  return PARETO_EXCLUDE_BINS.has(bin)
}

export function paretoExcludeBins(_lcodeFilter: string): Set<string> {
  return new Set(PARETO_EXCLUDE_BINS)
}
