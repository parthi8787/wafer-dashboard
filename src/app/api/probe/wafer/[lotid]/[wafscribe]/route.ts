import { NextResponse } from 'next/server'
import {
  ensureProbeLoaded,
  getProbeDies,
  getProbeWafer,
} from '@/lib/probe/csvStore'

export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  context: { params: Promise<{ lotid: string; wafscribe: string }> },
) {
  try {
    await ensureProbeLoaded()
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Data not loaded' },
      { status: 503 },
    )
  }

  const { lotid, wafscribe } = await context.params
  const id = `${decodeURIComponent(lotid)}|${decodeURIComponent(wafscribe)}`
  const wafer = getProbeWafer(id)
  if (!wafer) {
    return NextResponse.json({ error: 'Wafer not found' }, { status: 404 })
  }

  const dies = getProbeDies(id)
  return NextResponse.json({
    wafer: {
      id: wafer.id,
      lotid: wafer.lotid,
      wafscribe: wafer.wafscribe,
      prdct: wafer.prdct,
      prgnm: wafer.prgnm,
      lcode: wafer.lcode,
      begindt: wafer.begindt,
      enddate: wafer.enddate,
      dieCount: wafer.dieCount,
      passCount: wafer.passCount,
      yieldPct: wafer.dieCount ? (100 * wafer.passCount) / wafer.dieCount : 0,
      avgTtime: wafer.dieCount ? wafer.sumTtime / wafer.dieCount : 0,
      minTtime: wafer.minTtime,
      maxTtime: wafer.maxTtime,
      tempr: wafer.tempr,
      total: wafer.total,
      binCounts: wafer.binCounts,
    },
    dies,
  })
}
