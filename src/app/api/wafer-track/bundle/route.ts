import { NextRequest, NextResponse } from 'next/server'
import { loadAdfBundle } from '@/lib/adf/loadBundle'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const lotId = req.nextUrl.searchParams.get('lotId')?.trim() || undefined
    const asOf = req.nextUrl.searchParams.get('asOf')?.trim() || undefined
    const bundle = await loadAdfBundle({ lotId, asOf })
    return NextResponse.json(bundle)
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to load ADF bundle',
      },
      { status: 500 },
    )
  }
}
