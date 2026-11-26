import { NextResponse } from 'next/server'
import {
  buildCommonality,
  classBinPareto,
  classToGdrCorrelation,
  gdrBinPareto,
  hardwareAnalysis,
} from '@/lib/bin-analysis/analyze'
import { getBinAnalysisStore } from '@/lib/bin-analysis/csvStore'
import type { ClassDieRow } from '@/lib/bin-analysis/types'

export const runtime = 'nodejs'

function parseList(raw: string | null) {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function filterDies(
  dies: ClassDieRow[],
  params: URLSearchParams,
): ClassDieRow[] {
  const lotids = new Set(parseList(params.get('lotids')))
  const wafscribes = new Set(parseList(params.get('wafscribes')))
  const tester = params.get('tester') || ''
  const handler = params.get('handler') || ''
  const chamber = params.get('chamber') || ''
  const prober = params.get('prober') || ''

  return dies.filter((d) => {
    if (lotids.size && !lotids.has(d.lotid)) return false
    if (wafscribes.size && !wafscribes.has(d.wafscribe)) return false
    if (tester && d.testerId !== tester) return false
    if (handler && d.handlerId !== handler) return false
    if (chamber && d.chamber !== chamber) return false
    if (prober && d.proberId !== prober) return false
    return true
  })
}

export async function GET(req: Request) {
  try {
    const store = getBinAnalysisStore()
    const snap = await store.ensureLoaded()
    if (snap.error) {
      return NextResponse.json({ error: snap.error }, { status: 400 })
    }

    const url = new URL(req.url)
    const filtered = filterDies(snap.dies, url.searchParams)
    const classBinParam = url.searchParams.get('classBin')
    const classBin =
      classBinParam && classBinParam !== ''
        ? Number(classBinParam)
        : null
    const commonalityBinParam = url.searchParams.get('commonalityBin')
    const commonalityBin =
      commonalityBinParam && commonalityBinParam !== ''
        ? Number(commonalityBinParam)
        : null

    const wafers = new Set(filtered.map((d) => d.wafscribe))
    const lots = new Set(filtered.map((d) => d.lotid))
    const tested = filtered.length
    const pass = filtered.filter((d) => d.classBin === 1).length
    const gdrFails = filtered.filter((d) => d.gdrFail).length

    const commonality = buildCommonality(filtered, {
      classBin: commonalityBin,
    })
    const classPareto = classBinPareto(filtered)
    const gdrPareto = gdrBinPareto(filtered)
    const correlation = classToGdrCorrelation(
      filtered,
      classBin != null && Number.isFinite(classBin) ? classBin : null,
    )

    return NextResponse.json({
      meta: {
        csvPath: snap.csvPath,
        rowCount: snap.rowCount,
        fileBytes: snap.fileBytes,
        loadedAt: snap.loadedAt,
        filteredRows: filtered.length,
      },
      filters: snap.filters,
      kpis: {
        lots: lots.size,
        wafers: wafers.size,
        dies: tested,
        classYieldPct: tested ? (100 * pass) / tested : 0,
        gdrFailDies: gdrFails,
        gdrFailPct: tested ? (100 * gdrFails) / tested : 0,
      },
      commonality: {
        waferCount: commonality.waferCount,
        maxFail: commonality.maxFail,
        cells: commonality.cells,
        hotspots: commonality.cells
          .filter((c) => c.failCount > 0)
          .sort((a, b) => b.failCount - a.failCount)
          .slice(0, 15),
      },
      classPareto,
      gdrPareto,
      correlation: {
        selectedClassBin: classBin,
        ...correlation,
      },
      hardware: {
        tester: hardwareAnalysis(filtered, 'testerId'),
        testSite: hardwareAnalysis(filtered, 'testSite'),
        handler: hardwareAnalysis(filtered, 'handlerId'),
        chamber: hardwareAnalysis(filtered, 'chamber'),
        prober: hardwareAnalysis(filtered, 'proberId'),
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
