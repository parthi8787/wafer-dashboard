import { NextRequest, NextResponse } from 'next/server'
import { ensureProbeLoaded, getProbeState } from '@/lib/probe/csvStore'
import { lcodeLabel, yieldDenominator } from '@/lib/probe/lcode'
import {
  formatMonthLabel,
  formatQuarterLabel,
  formatWeekLabel,
  monthKeyFromDay,
  quarterKeyFromDay,
  weekKeyFromDay,
} from '@/lib/probe/periods'
import type { ProbeWaferSummary } from '@/lib/probe/types'

export const runtime = 'nodejs'

type PeriodAgg = {
  key: string
  label: string
  wafers: number
  dies: number
  yieldDenom: number
  pass: number
  sumGoodTtime: number
  binCounts: Record<string, number>
  tpCounts: Record<string, number>
}

function emptyPeriod(key: string, label: string): PeriodAgg {
  return {
    key,
    label,
    wafers: 0,
    dies: 0,
    yieldDenom: 0,
    pass: 0,
    sumGoodTtime: 0,
    binCounts: {},
    tpCounts: {},
  }
}

function addWaferToPeriod(agg: PeriodAgg, w: ProbeWaferSummary) {
  agg.wafers += 1
  agg.dies += w.dieCount
  agg.yieldDenom += yieldDenominator(w.lcode, w.dieCount, w.binCounts)
  agg.pass += w.passCount
  agg.sumGoodTtime += w.sumGoodTtime
  for (const [bin, count] of Object.entries(w.binCounts)) {
    agg.binCounts[bin] = (agg.binCounts[bin] || 0) + count
  }
  if (w.prgnm) {
    agg.tpCounts[w.prgnm] = (agg.tpCounts[w.prgnm] || 0) + 1
  }
}

function primaryTp(tpCounts: Record<string, number>): string {
  const entries = Object.entries(tpCounts).sort((a, b) => b[1] - a[1])
  if (!entries.length) return '—'
  if (entries.length === 1) return entries[0][0]
  return entries.map(([name]) => name).join(' · ')
}

function finalizePeriod(agg: PeriodAgg) {
  return {
    key: agg.key,
    label: agg.label,
    wafers: agg.wafers,
    dies: agg.dies,
    yieldPct: agg.yieldDenom ? (100 * agg.pass) / agg.yieldDenom : 0,
    avgTtime: agg.pass ? agg.sumGoodTtime / agg.pass : 0,
    tpName: primaryTp(agg.tpCounts),
  }
}

function topBins(binCounts: Record<string, number>, limit = 10, excludePass = true) {
  return Object.entries(binCounts)
    .filter(([bin]) => !(excludePass && bin === '1'))
    .map(([bin, count]) => ({ bin: Number(bin), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

function parseListParam(raw: string): string[] {
  if (!raw.trim()) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function GET(req: NextRequest) {
  try {
    await ensureProbeLoaded()
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Data not loaded' },
      { status: 503 },
    )
  }

  const state = getProbeState()
  if (!state.loaded) {
    return NextResponse.json(
      { error: state.error || 'Data not loaded' },
      { status: 503 },
    )
  }

  const dateFrom = req.nextUrl.searchParams.get('dateFrom') || ''
  const dateTo = req.nextUrl.searchParams.get('dateTo') || ''
  // Support multi-lot: lotids=a,b,c  (legacy lotid= still works)
  const lotids = parseListParam(
    req.nextUrl.searchParams.get('lotids') ||
      req.nextUrl.searchParams.get('lotid') ||
      '',
  )
  const prdct = req.nextUrl.searchParams.get('prdct') || ''
  const prgnm = req.nextUrl.searchParams.get('prgnm') || ''
  const lcode = req.nextUrl.searchParams.get('lcode') || ''
  const wafscribe = req.nextUrl.searchParams.get('wafscribe') || ''

  const wafers = state.wafers.filter((w) => {
    if (dateFrom && w.endDay < dateFrom) return false
    if (dateTo && w.endDay > dateTo) return false
    if (lotids.length && !lotids.includes(w.lotid)) return false
    if (prdct && w.prdct !== prdct) return false
    if (prgnm && w.prgnm !== prgnm) return false
    if (lcode && w.lcode !== lcode) return false
    if (wafscribe && w.wafscribe !== wafscribe) return false
    return true
  })

  const dieCount = wafers.reduce((s, w) => s + w.dieCount, 0)
  const passDies = wafers.reduce((s, w) => s + w.passCount, 0)
  const yieldDenomTotal = wafers.reduce(
    (s, w) => s + yieldDenominator(w.lcode, w.dieCount, w.binCounts),
    0,
  )
  const sumGoodTtime = wafers.reduce((s, w) => s + w.sumGoodTtime, 0)
  const avgTtime = passDies ? sumGoodTtime / passDies : 0

  const byWeek = new Map<string, PeriodAgg>()
  const byMonth = new Map<string, PeriodAgg>()
  const byQuarter = new Map<string, PeriodAgg>()
  const binTotals = new Map<string, number>()

  for (const w of wafers) {
    const wk = weekKeyFromDay(w.endDay)
    const mk = monthKeyFromDay(w.endDay)
    const qk = quarterKeyFromDay(w.endDay)

    if (!byWeek.has(wk)) byWeek.set(wk, emptyPeriod(wk, formatWeekLabel(wk)))
    if (!byMonth.has(mk)) byMonth.set(mk, emptyPeriod(mk, formatMonthLabel(mk)))
    if (!byQuarter.has(qk)) byQuarter.set(qk, emptyPeriod(qk, formatQuarterLabel(qk)))

    addWaferToPeriod(byWeek.get(wk)!, w)
    addWaferToPeriod(byMonth.get(mk)!, w)
    addWaferToPeriod(byQuarter.get(qk)!, w)

    for (const [bin, count] of Object.entries(w.binCounts)) {
      binTotals.set(bin, (binTotals.get(bin) || 0) + count)
    }
  }

  const weekly = [...byWeek.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(finalizePeriod)

  const monthly = [...byMonth.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(finalizePeriod)

  const quarterly = [...byQuarter.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(finalizePeriod)

  const actualColumns: Array<{
    key: string
    label: string
    kind: 'month' | 'quarter'
    wafers: number
    yieldPct: number
    avgTtime: number
    tpName: string
  }> = []
  for (const m of monthly) {
    actualColumns.push({ ...m, kind: 'month' })
    const monthNum = Number(m.key.slice(5, 7))
    if (monthNum % 3 === 0) {
      const q = quarterly.find((x) => x.key === `${m.key.slice(0, 4)}-Q${monthNum / 3}`)
      if (q) actualColumns.push({ ...q, kind: 'quarter' })
    }
  }
  if (monthly.length) {
    const last = monthly[monthly.length - 1]
    const monthNum = Number(last.key.slice(5, 7))
    if (monthNum % 3 !== 0) {
      const qKey = `${last.key.slice(0, 4)}-Q${Math.ceil(monthNum / 3)}`
      const q = quarterly.find((x) => x.key === qKey)
      if (q && !actualColumns.some((c) => c.key === q.key)) {
        actualColumns.push({ ...q, kind: 'quarter' })
      }
    }
  }

  const binParetoWeekly = [...byWeek.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((p) => ({
      key: p.key,
      label: p.label,
      bins: topBins(p.binCounts, 10, true),
    }))

  const binParetoMonthly = [...byMonth.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((p) => ({
      key: p.key,
      label: p.label,
      bins: topBins(p.binCounts, 10, true),
    }))

  const binsOverall = topBins(Object.fromEntries(binTotals.entries()), 10, true)

  // Always expose full-dataset filter options so dropdowns don't shrink after Apply
  const filters = {
    lotids: state.filters.lotids,
    prdcts: state.filters.prdcts,
    prgnms: state.filters.prgnms,
    lcodes: state.filters.lcodes,
    wafscribes: state.filters.wafscribes,
    lcodeOptions: state.filters.lcodes.map((code) => ({
      value: code,
      label: lcodeLabel(code),
    })),
  }

  return NextResponse.json({
    meta: {
      csvPath: state.csvPath,
      rowCount: state.rowCount,
      fileBytes: state.fileBytes,
      loadedAt: state.loadedAt,
      dateMin: state.dateMin,
      dateMax: state.dateMax,
      filteredWafers: wafers.length,
      filteredDies: dieCount,
    },
    filters,
    kpis: {
      lots: new Set(wafers.map((w) => w.lotid)).size,
      wafers: wafers.length,
      dies: dieCount,
      yieldPct: yieldDenomTotal ? (100 * passDies) / yieldDenomTotal : 0,
      avgTtime,
      dateMin: wafers.length
        ? wafers.reduce((m, w) => (w.endDay < m ? w.endDay : m), wafers[0].endDay)
        : null,
      dateMax: wafers.length
        ? wafers.reduce((m, w) => (w.endDay > m ? w.endDay : m), wafers[0].endDay)
        : null,
    },
    weekly,
    monthly,
    quarterly,
    actualColumns,
    binParetoWeekly,
    binParetoMonthly,
    binsOverall,
  })
}
