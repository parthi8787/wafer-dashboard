import { NextResponse } from 'next/server'
import { getBinAnalysisStore } from '@/lib/bin-analysis/csvStore'

export const runtime = 'nodejs'

export async function POST() {
  try {
    const store = getBinAnalysisStore()
    const snap = await store.reload()
    if (snap.error) {
      return NextResponse.json({ error: snap.error }, { status: 400 })
    }
    return NextResponse.json({
      ok: true,
      csvPath: snap.csvPath,
      rowCount: snap.rowCount,
      loadedAt: snap.loadedAt,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
