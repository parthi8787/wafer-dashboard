import { NextResponse } from 'next/server'
import {
  DEFAULT_BIN_ANALYSIS_CSV,
  getBinAnalysisStore,
} from '@/lib/bin-analysis/csvStore'
import { listCsvFiles } from '@/lib/listCsvFiles'

export const runtime = 'nodejs'

export async function GET() {
  const store = getBinAnalysisStore()
  const snap = await store.ensureLoaded()
  return NextResponse.json({
    csvPath: snap.csvPath,
    defaultPath: DEFAULT_BIN_ANALYSIS_CSV,
    loaded: snap.loaded,
    rowCount: snap.rowCount,
    fileBytes: snap.fileBytes,
    loadedAt: snap.loadedAt,
    error: snap.error,
    availableFiles: listCsvFiles('bin-analysis'),
  })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { csvPath?: string }
    const csvPath = body.csvPath?.trim()
    if (!csvPath) {
      return NextResponse.json({ error: 'csvPath is required' }, { status: 400 })
    }
    const store = getBinAnalysisStore()
    const snap = await store.loadFromPath(csvPath)
    if (snap.error) {
      return NextResponse.json({ error: snap.error }, { status: 400 })
    }
    return NextResponse.json({
      ok: true,
      csvPath: snap.csvPath,
      rowCount: snap.rowCount,
      fileBytes: snap.fileBytes,
      loadedAt: snap.loadedAt,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
