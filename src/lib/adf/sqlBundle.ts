import sql from 'mssql'
import type {
  AdfDatasetBundle,
  DieTestResult,
  LocationMeta,
  Wafer,
  WaferMovement,
} from '@/data/types'

function schemaPrefix() {
  const schema = (process.env.ADF_SQL_SCHEMA ?? 'fabops').replace(/[^a-zA-Z0-9_]/g, '')
  return schema ? `[${schema}].` : ''
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return new Date().toISOString()
}

/**
 * Load wafer-track bundle from ADF-landed Synapse / Azure SQL / SQL Server tables.
 * Requires ADF_SQL_CONNECTION_STRING (never use VITE_ for this — server-only).
 */
export async function loadSqlBundle(filters?: {
  lotId?: string
  asOf?: string
}): Promise<AdfDatasetBundle> {
  const connectionString = process.env.ADF_SQL_CONNECTION_STRING?.trim()
  if (!connectionString) {
    throw new Error('ADF_SQL_CONNECTION_STRING is not set')
  }

  const pool = await sql.connect(connectionString)
  const s = schemaPrefix()

  try {
    const locResult = await pool.request().query(`
      SELECT location_code, location_name, site, sequence_no
      FROM ${s}dim_location
      ORDER BY sequence_no
    `)

    const locations: LocationMeta[] = locResult.recordset.map((r) => ({
      code: String(r.location_code) as LocationMeta['code'],
      name: String(r.location_name),
      site: String(r.site),
      sequence: Number(r.sequence_no),
    }))

    const waferReq = pool.request()
    let waferSql = `SELECT * FROM ${s}dim_wafer`
    if (filters?.lotId) {
      waferSql += ` WHERE lot_id = @lotId`
      waferReq.input('lotId', sql.NVarChar, filters.lotId)
    }
    waferSql += ` ORDER BY last_moved_at DESC`
    const waferResult = await waferReq.query(waferSql)

    const wafers: Wafer[] = waferResult.recordset.map((r) => ({
      waferId: String(r.wafer_id),
      lotId: String(r.lot_id),
      product: String(r.product),
      technology: String(r.technology),
      diameterMm: Number(r.diameter_mm),
      currentLocation: String(r.current_location) as Wafer['currentLocation'],
      status: String(r.status) as Wafer['status'],
      startedAt: toIso(r.started_at),
      lastMovedAt: toIso(r.last_moved_at),
      dieCount: Number(r.die_count),
      testedDieCount: Number(r.tested_die_count),
      yieldPct: r.yield_pct == null ? null : Number(r.yield_pct),
    }))

    if (wafers.length === 0) {
      return {
        sourcedFrom: 'adf',
        pipelineRunId: `adf-sql-${new Date().toISOString().slice(0, 10)}`,
        landedAt: new Date().toISOString(),
        sink: `sql://${process.env.ADF_SQL_SCHEMA ?? 'fabops'} (live)`,
        wafers: [],
        movements: [],
        dieResults: [],
        locations,
      }
    }

    const waferIds = wafers.map((w) => w.waferId)
    const idList = waferIds.map((_, i) => `@w${i}`).join(',')

    const moveReq = pool.request()
    waferIds.forEach((id, i) => moveReq.input(`w${i}`, sql.NVarChar, id))
    let moveSql = `SELECT * FROM ${s}fact_wafer_movement WHERE wafer_id IN (${idList})`
    if (filters?.asOf) {
      moveSql += ` AND moved_at <= @asOf`
      moveReq.input('asOf', sql.DateTime2, new Date(filters.asOf))
    }
    moveSql += ` ORDER BY moved_at ASC`
    const moveResult = await moveReq.query(moveSql)

    const movements: WaferMovement[] = moveResult.recordset.map((r) => ({
      movementId: String(r.movement_id),
      waferId: String(r.wafer_id),
      fromLocation: r.from_location
        ? (String(r.from_location) as WaferMovement['fromLocation'])
        : null,
      toLocation: String(r.to_location) as WaferMovement['toLocation'],
      equipmentId: r.equipment_id == null ? null : String(r.equipment_id),
      operator: r.operator == null ? null : String(r.operator),
      status: String(r.status) as WaferMovement['status'],
      movedAt: toIso(r.moved_at),
      notes: r.notes == null ? null : String(r.notes),
      sourcePipeline: String(r.source_pipeline ?? 'adf'),
    }))

    const dieReq = pool.request()
    waferIds.forEach((id, i) => dieReq.input(`w${i}`, sql.NVarChar, id))
    let dieSql = `SELECT * FROM ${s}fact_die_test_result WHERE wafer_id IN (${idList})`
    if (filters?.asOf) {
      dieSql += ` AND tested_at <= @asOf`
      dieReq.input('asOf', sql.DateTime2, new Date(filters.asOf))
    }
    const dieResult = await dieReq.query(dieSql)

    const dieResults: DieTestResult[] = dieResult.recordset.map((r) => ({
      waferId: String(r.wafer_id),
      dieX: Number(r.die_x),
      dieY: Number(r.die_y),
      testStage: String(r.test_stage) as DieTestResult['testStage'],
      bin: String(r.bin_code) as DieTestResult['bin'],
      hardBin: Number(r.hard_bin),
      softBin: Number(r.soft_bin),
      testedAt: toIso(r.tested_at),
      site: Number(r.site),
      parameters: {
        idd_ma: Number(r.idd_ma ?? 0),
        voh_v: Number(r.voh_v ?? 0),
        delay_ns: Number(r.delay_ns ?? 0),
      },
    }))

    return {
      sourcedFrom: 'adf',
      pipelineRunId: `adf-sql-${new Date().toISOString().slice(0, 10)}`,
      landedAt: new Date().toISOString(),
      sink: `sql://${process.env.ADF_SQL_SCHEMA ?? 'fabops'} (live ADF)`,
      wafers,
      movements,
      dieResults,
      locations,
    }
  } finally {
    await pool.close()
  }
}

export function hasAdfSqlConfig() {
  return Boolean(process.env.ADF_SQL_CONNECTION_STRING?.trim())
}
