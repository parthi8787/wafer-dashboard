import { NextResponse } from 'next/server'
import { hasAdfSqlConfig } from '@/lib/adf/sqlBundle'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: hasAdfSqlConfig() ? 'live-adf-sql' : 'sample-data',
    schema: process.env.ADF_SQL_SCHEMA ?? 'fabops',
  })
}
