import { NextResponse } from 'next/server'
import { getProbeState, reloadProbeCsv } from '@/lib/probe/csvStore'

export const runtime = 'nodejs'

export async function POST() {
  try {
    await reloadProbeCsv()
    const state = getProbeState()
    return NextResponse.json({
      ok: true,
      rowCount: state.rowCount,
      wafers: state.wafers.length,
      loadedAt: state.loadedAt,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
