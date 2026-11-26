import type { ClassDieRow } from './types'

export type CommonalityCell = {
  x: number
  y: number
  failCount: number
  waferCount: number
  rate: number
}

export type BinCount = {
  bin: number
  name: string
  count: number
  pct: number
}

export type CorrelationRow = {
  classBin: number
  classBinName: string
  gdrBin: number
  gdrBinName: string
  count: number
  pctOfClass: number
}

export type HardwareStat = {
  key: string
  dimension: string
  tested: number
  fails: number
  failRate: number
  topClassBin: string
}

function keyXY(x: number, y: number) {
  return `${x},${y}`
}

/** Stack fail sites across wafers → commonality heatmap. */
export function buildCommonality(
  dies: ClassDieRow[],
  opts: { passBin?: number; classBin?: number | null } = {},
): {
  cells: CommonalityCell[]
  waferCount: number
  maxFail: number
} {
  const passBin = opts.passBin ?? 1
  const wafers = new Set(dies.map((d) => d.wafscribe))
  const waferCount = wafers.size || 1

  const bySite = new Map<
    string,
    { x: number; y: number; failWafers: Set<string> }
  >()

  for (const d of dies) {
    if (opts.classBin != null && d.classBin !== opts.classBin) continue
    const isFail =
      opts.classBin != null ? true : d.classBin !== passBin && d.gdrFail
    if (!isFail && opts.classBin == null) continue

    const k = keyXY(d.dieX, d.dieY)
    let cell = bySite.get(k)
    if (!cell) {
      cell = { x: d.dieX, y: d.dieY, failWafers: new Set() }
      bySite.set(k, cell)
    }
    cell.failWafers.add(d.wafscribe)
  }

  // Also include pass sites so map shape is complete when filtering fails only
  for (const d of dies) {
    const k = keyXY(d.dieX, d.dieY)
    if (!bySite.has(k)) {
      bySite.set(k, { x: d.dieX, y: d.dieY, failWafers: new Set() })
    }
  }

  const cells: CommonalityCell[] = []
  let maxFail = 0
  for (const cell of bySite.values()) {
    const failCount = cell.failWafers.size
    maxFail = Math.max(maxFail, failCount)
    cells.push({
      x: cell.x,
      y: cell.y,
      failCount,
      waferCount,
      rate: waferCount ? failCount / waferCount : 0,
    })
  }

  return { cells, waferCount, maxFail }
}

export function classBinPareto(dies: ClassDieRow[], limit = 12): BinCount[] {
  const map = new Map<number, { name: string; count: number }>()
  let failTotal = 0
  for (const d of dies) {
    if (d.classBin === 1) continue
    failTotal += 1
    const cur = map.get(d.classBin) || { name: d.classBinName, count: 0 }
    cur.count += 1
    cur.name = d.classBinName
    map.set(d.classBin, cur)
  }
  return [...map.entries()]
    .map(([bin, v]) => ({
      bin,
      name: v.name,
      count: v.count,
      pct: failTotal ? (100 * v.count) / failTotal : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export function gdrBinPareto(dies: ClassDieRow[], limit = 12): BinCount[] {
  const map = new Map<number, { name: string; count: number }>()
  let failTotal = 0
  for (const d of dies) {
    if (!d.gdrFail || d.gdrBin === 1) continue
    failTotal += 1
    const cur = map.get(d.gdrBin) || { name: d.gdrBinName, count: 0 }
    cur.count += 1
    cur.name = d.gdrBinName
    map.set(d.gdrBin, cur)
  }
  return [...map.entries()]
    .map(([bin, v]) => ({
      bin,
      name: v.name,
      count: v.count,
      pct: failTotal ? (100 * v.count) / failTotal : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/** For a selected class bin, how GDR bins / fail sites correlate. */
export function classToGdrCorrelation(
  dies: ClassDieRow[],
  classBin: number | null,
): {
  correlations: CorrelationRow[]
  mapDies: Array<{
    x: number
    y: number
    classBin: number
    classBinName: string
    gdrBin: number
    gdrBinName: string
    gdrFail: boolean
    wafscribe: string
  }>
  classCount: number
  gdrFailCount: number
} {
  const scoped =
    classBin == null ? dies.filter((d) => d.classBin !== 1) : dies.filter((d) => d.classBin === classBin)

  const pair = new Map<string, CorrelationRow>()
  let gdrFailCount = 0
  for (const d of scoped) {
    if (d.gdrFail) gdrFailCount += 1
    const k = `${d.classBin}|${d.gdrBin}`
    const cur = pair.get(k) || {
      classBin: d.classBin,
      classBinName: d.classBinName,
      gdrBin: d.gdrBin,
      gdrBinName: d.gdrBinName,
      count: 0,
      pctOfClass: 0,
    }
    cur.count += 1
    pair.set(k, cur)
  }

  const classCount = scoped.length
  const correlations = [...pair.values()]
    .map((r) => ({
      ...r,
      pctOfClass: classCount ? (100 * r.count) / classCount : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // Aggregate unique (x,y) across wafers for map — keep highest-priority fail if multi-wafer
  const byXY = new Map<string, (typeof scoped)[number]>()
  for (const d of scoped) {
    const k = keyXY(d.dieX, d.dieY)
    const prev = byXY.get(k)
    if (!prev || (d.gdrFail && !prev.gdrFail)) byXY.set(k, d)
  }

  const mapDies = [...byXY.values()].map((d) => ({
    x: d.dieX,
    y: d.dieY,
    classBin: d.classBin,
    classBinName: d.classBinName,
    gdrBin: d.gdrBin,
    gdrBinName: d.gdrBinName,
    gdrFail: d.gdrFail,
    wafscribe: d.wafscribe,
  }))

  return { correlations, mapDies, classCount, gdrFailCount }
}

function topBinName(dies: ClassDieRow[]) {
  const counts = new Map<string, number>()
  for (const d of dies) {
    if (d.classBin === 1) continue
    const label = `${d.classBin} ${d.classBinName}`
    counts.set(label, (counts.get(label) || 0) + 1)
  }
  let best = '—'
  let n = 0
  for (const [k, v] of counts) {
    if (v > n) {
      best = k
      n = v
    }
  }
  return best
}

export function hardwareAnalysis(
  dies: ClassDieRow[],
  dimension: 'testerId' | 'testSite' | 'handlerId' | 'chamber' | 'proberId',
): HardwareStat[] {
  const groups = new Map<string, ClassDieRow[]>()
  for (const d of dies) {
    const key =
      dimension === 'testSite' ? String(d.testSite) : String(d[dimension])
    const list = groups.get(key) || []
    list.push(d)
    groups.set(key, list)
  }

  return [...groups.entries()]
    .map(([key, list]) => {
      const fails = list.filter((d) => d.classBin !== 1).length
      return {
        key,
        dimension,
        tested: list.length,
        fails,
        failRate: list.length ? (100 * fails) / list.length : 0,
        topClassBin: topBinName(list),
      }
    })
    .sort((a, b) => b.failRate - a.failRate)
}
