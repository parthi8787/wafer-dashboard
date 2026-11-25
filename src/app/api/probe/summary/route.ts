import { NextRequest, NextResponse } from 'next/server'
import { ensureProbeLoaded, getProbeState } from '@/lib/probe/csvStore'

export const runtime = 'nodejs'

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
  const lotid = req.nextUrl.searchParams.get('lotid') || ''
  const prdct = req.nextUrl.searchParams.get('prdct') || ''
  const prgnm = req.nextUrl.searchParams.get('prgnm') || ''
  const lcode = req.nextUrl.searchParams.get('lcode') || ''
  const wafscribe = req.nextUrl.searchParams.get('wafscribe') || ''

  const wafers = state.wafers.filter((w) => {
    if (dateFrom && w.endDay < dateFrom) return false
    if (dateTo && w.endDay > dateTo) return false
    if (lotid && w.lotid !== lotid) return false
    if (prdct && w.prdct !== prdct) return false
    if (prgnm && w.prgnm !== prgnm) return false
    if (lcode && w.lcode !== lcode) return false
    if (wafscribe && w.wafscribe !== wafscribe) return false
    return true
  })

  const dieCount = wafers.reduce((s, w) => s + w.dieCount, 0)
  const passDies = wafers.reduce((s, w) => s + w.passCount, 0)
  const sumTtime = wafers.reduce((s, w) => s + w.sumTtime, 0)
  const avgTtime = dieCount ? sumTtime / dieCount : 0

  const byDay = new Map<
    string,
    { day: string; wafers: number; dies: number; pass: number; sumTtime: number }
  >()
  const binTotals = new Map<string, number>()
  const lotMap = new Map<
    string,
    {
      lotid: string
      prdct: string
      prgnm: string
      lcode: string
      wafers: number
      dies: number
      pass: number
      sumTtime: number
      firstBegin: string
      lastEnd: string
    }
  >()

  for (const w of wafers) {
    const day = byDay.get(w.endDay) || {
      day: w.endDay,
      wafers: 0,
      dies: 0,
      pass: 0,
      sumTtime: 0,
    }
    day.wafers += 1
    day.dies += w.dieCount
    day.pass += w.passCount
    day.sumTtime += w.sumTtime
    byDay.set(w.endDay, day)

    for (const [bin, count] of Object.entries(w.binCounts)) {
      binTotals.set(bin, (binTotals.get(bin) || 0) + count)
    }

    const lot = lotMap.get(w.lotid) || {
      lotid: w.lotid,
      prdct: w.prdct,
      prgnm: w.prgnm,
      lcode: w.lcode,
      wafers: 0,
      dies: 0,
      pass: 0,
      sumTtime: 0,
      firstBegin: w.begindt,
      lastEnd: w.enddate,
    }
    lot.wafers += 1
    lot.dies += w.dieCount
    lot.pass += w.passCount
    lot.sumTtime += w.sumTtime
    if (w.begindt < lot.firstBegin) lot.firstBegin = w.begindt
    if (w.enddate > lot.lastEnd) lot.lastEnd = w.enddate
    lotMap.set(w.lotid, lot)
  }

  const daily = [...byDay.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((d) => ({
      day: d.day,
      wafers: d.wafers,
      dies: d.dies,
      yieldPct: d.dies ? (100 * d.pass) / d.dies : 0,
      avgTtime: d.dies ? d.sumTtime / d.dies : 0,
    }))

  const bins = [...binTotals.entries()]
    .map(([bin, count]) => ({ bin: Number(bin), count }))
    .sort((a, b) => b.count - a.count)

  const lots = [...lotMap.values()]
    .map((l) => ({
      ...l,
      yieldPct: l.dies ? (100 * l.pass) / l.dies : 0,
      avgTtime: l.dies ? l.sumTtime / l.dies : 0,
    }))
    .sort((a, b) => b.lastEnd.localeCompare(a.lastEnd))

  const waferRows = wafers
    .map((w) => ({
      id: w.id,
      lotid: w.lotid,
      wafscribe: w.wafscribe,
      prdct: w.prdct,
      prgnm: w.prgnm,
      lcode: w.lcode,
      begindt: w.begindt,
      enddate: w.enddate,
      endDay: w.endDay,
      dieCount: w.dieCount,
      passCount: w.passCount,
      yieldPct: w.dieCount ? (100 * w.passCount) / w.dieCount : 0,
      avgTtime: w.dieCount ? w.sumTtime / w.dieCount : 0,
      minTtime: w.minTtime,
      maxTtime: w.maxTtime,
      tempr: w.tempr,
      total: w.total,
    }))
    .sort((a, b) => b.enddate.localeCompare(a.enddate))

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
    filters: state.filters,
    kpis: {
      lots: lotMap.size,
      wafers: wafers.length,
      dies: dieCount,
      yieldPct: dieCount ? (100 * passDies) / dieCount : 0,
      avgTtime,
      dateMin: wafers.length
        ? wafers.reduce((m, w) => (w.endDay < m ? w.endDay : m), wafers[0].endDay)
        : state.dateMin,
      dateMax: wafers.length
        ? wafers.reduce((m, w) => (w.endDay > m ? w.endDay : m), wafers[0].endDay)
        : state.dateMax,
    },
    daily,
    bins,
    lots,
    wafers: waferRows,
  })
}
