import { NextRequest, NextResponse } from 'next/server'
import { listCsvFiles } from '@/lib/listCsvFiles'
import {
  ensureProbeLoaded,
  getProbeState,
  setProbeCsvPath,
} from '@/lib/probe/csvStore'

export const runtime = 'nodejs'

export async function GET() {
  try {
    await ensureProbeLoaded()
  } catch {
    // return current error state
  }
  const state = getProbeState()
  return NextResponse.json({
    ...state,
    availableFiles: listCsvFiles('probe'),
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { csvPath?: string }
    const csvPath = String(body.csvPath || '').trim()
    if (!csvPath) {
      return NextResponse.json({ error: 'csvPath is required' }, { status: 400 })
    }
    await setProbeCsvPath(csvPath)
    const state = getProbeState()
    return NextResponse.json({
      ok: true,
      csvPath: state.csvPath,
      rowCount: state.rowCount,
      wafers: state.wafers.length,
      loadedAt: state.loadedAt,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    )
  }
}
