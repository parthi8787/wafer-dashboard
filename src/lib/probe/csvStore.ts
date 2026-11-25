import fs from 'fs'
import path from 'path'
import Papa from 'papaparse'
import type { ProbeDie, ProbeStoreSnapshot, ProbeWaferSummary } from './types'

const PASS_BINS = new Set([1])

type InternalState = ProbeStoreSnapshot & {
  waferById: Map<string, ProbeWaferSummary>
  diesByWafer: Map<string, ProbeDie[]>
}

const globalKey = '__waferProbeCsvStore__'

function getGlobalStore(): { state: InternalState; loadPromise: Promise<void> | null } {
  const g = globalThis as typeof globalThis & {
    [globalKey]?: { state: InternalState; loadPromise: Promise<void> | null }
  }
  if (!g[globalKey]) {
    g[globalKey] = {
      loadPromise: null,
      state: {
        csvPath: null,
        loaded: false,
        loading: false,
        error: null,
        loadedAt: null,
        rowCount: 0,
        fileBytes: 0,
        dateMin: null,
        dateMax: null,
        filters: {
          lotids: [],
          prdcts: [],
          prgnms: [],
          lcodes: [],
          wafscribes: [],
        },
        wafers: [],
        waferById: new Map(),
        diesByWafer: new Map(),
      },
    }
  }
  return g[globalKey]!
}

export function getProbeDataRoot() {
  const rootName = process.env.PROBE_DATA_ROOT || 'data'
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), rootName)
}

export function getDefaultProbeCsvPath() {
  if (process.env.PROBE_CSV_PATH) {
    return resolveProbeCsvPath(process.env.PROBE_CSV_PATH)
  }
  return path.join(getProbeDataRoot(), 'probe', 'wafer-data.csv')
}

/** Resolve and validate a CSV path. Paths must stay under PROBE_DATA_ROOT unless absolute paths are enabled. */
export function resolveProbeCsvPath(input: string) {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('CSV path is required')

  const dataRoot = getProbeDataRoot()
  const resolved = path.isAbsolute(trimmed)
    ? path.resolve(/*turbopackIgnore: true*/ trimmed)
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), trimmed)

  const allowAbsolute =
    process.env.PROBE_ALLOW_ABSOLUTE === '1' ||
    process.env.NODE_ENV !== 'production'
  const underRoot =
    resolved === dataRoot || resolved.startsWith(dataRoot + path.sep)

  if (!underRoot && !allowAbsolute) {
    throw new Error(
      `CSV path must be under ${dataRoot} (set PROBE_ALLOW_ABSOLUTE=1 to allow other absolute paths)`,
    )
  }

  if (!fs.existsSync(resolved)) {
    throw new Error(`CSV not found: ${resolved}`)
  }
  if (!fs.statSync(resolved).isFile()) {
    throw new Error(`Not a file: ${resolved}`)
  }
  return resolved
}

export function getProbeState(): ProbeStoreSnapshot {
  const { state } = getGlobalStore()
  return {
    csvPath: state.csvPath,
    loaded: state.loaded,
    loading: state.loading,
    error: state.error,
    loadedAt: state.loadedAt,
    rowCount: state.rowCount,
    fileBytes: state.fileBytes,
    dateMin: state.dateMin,
    dateMax: state.dateMax,
    filters: state.filters,
    wafers: state.wafers,
  }
}

export function getProbeWafer(id: string) {
  const { state } = getGlobalStore()
  return state.waferById.get(id) ?? null
}

export function getProbeDies(id: string) {
  const { state } = getGlobalStore()
  return state.diesByWafer.get(id) ?? []
}

function emptyWafer(id: string, row: Record<string, string>): ProbeWaferSummary {
  return {
    id,
    lotid: row.lotid,
    wafscribe: row.wafscribe,
    prdct: row.prdct,
    prgnm: row.prgnm,
    lcode: row.lcode,
    begindt: row.begindt,
    enddate: row.enddate,
    endDay: String(row.enddate || '').slice(0, 10),
    tempr: Number(row.tempr),
    total: Number(row.total),
    dieCount: 0,
    passCount: 0,
    sumTtime: 0,
    minTtime: Number.POSITIVE_INFINITY,
    maxTtime: Number.NEGATIVE_INFINITY,
    binCounts: {},
  }
}

export async function ensureProbeLoaded() {
  const store = getGlobalStore()
  if (store.state.loaded && store.state.csvPath) return
  if (store.loadPromise) return store.loadPromise
  store.loadPromise = setProbeCsvPath(getDefaultProbeCsvPath()).finally(() => {
    store.loadPromise = null
  })
  return store.loadPromise
}

export async function setProbeCsvPath(csvPathInput: string) {
  const store = getGlobalStore()
  if (store.state.loading) {
    throw new Error('Load already in progress')
  }

  const resolved = resolveProbeCsvPath(csvPathInput)
  store.state.loading = true
  store.state.error = null
  store.state.csvPath = resolved

  try {
    await parseCsvIntoState(resolved)
  } catch (err) {
    store.state.loading = false
    store.state.loaded = false
    store.state.error = err instanceof Error ? err.message : String(err)
    throw err
  }
}

export async function reloadProbeCsv() {
  const store = getGlobalStore()
  if (!store.state.csvPath) {
    return setProbeCsvPath(getDefaultProbeCsvPath())
  }
  return setProbeCsvPath(store.state.csvPath)
}

function parseCsvIntoState(csvPath: string) {
  const store = getGlobalStore()

  return new Promise<void>((resolve, reject) => {
    const waferById = new Map<string, ProbeWaferSummary>()
    const diesByWafer = new Map<string, ProbeDie[]>()
    const lotids = new Set<string>()
    const prdcts = new Set<string>()
    const prgnms = new Set<string>()
    const lcodes = new Set<string>()
    const wafscribes = new Set<string>()
    let rowCount = 0
    let dateMin: string | null = null
    let dateMax: string | null = null

    const stream = fs.createReadStream(csvPath, { encoding: 'utf8' })

    Papa.parse(stream, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      transformHeader: (h: string) => String(h || '').trim(),
      step: (results) => {
        const row = results.data as Record<string, string>
        if (!row?.lotid || !row?.wafscribe) return

        rowCount += 1
        const id = `${row.lotid}|${row.wafscribe}`
        let wafer = waferById.get(id)
        if (!wafer) {
          wafer = emptyWafer(id, row)
          waferById.set(id, wafer)
          diesByWafer.set(id, [])
        }

        const ttime = Number(row.ttime)
        const curibin = Number(row.curibin)
        const x = Number(row.wafxloc)
        const y = Number(row.wafyloc)
        const curfbin = Number(row.curfbin)

        wafer.dieCount += 1
        if (Number.isFinite(ttime)) {
          wafer.sumTtime += ttime
          if (ttime < wafer.minTtime) wafer.minTtime = ttime
          if (ttime > wafer.maxTtime) wafer.maxTtime = ttime
        }
        if (PASS_BINS.has(curibin)) wafer.passCount += 1
        const binKey = String(Number.isFinite(curibin) ? curibin : row.curibin)
        wafer.binCounts[binKey] = (wafer.binCounts[binKey] || 0) + 1

        if (row.enddate) {
          if (!dateMin || row.enddate < dateMin) dateMin = row.enddate
          if (!dateMax || row.enddate > dateMax) dateMax = row.enddate
          if (row.enddate > wafer.enddate) {
            wafer.enddate = row.enddate
            wafer.endDay = row.enddate.slice(0, 10)
          }
        }
        if (row.begindt && row.begindt < wafer.begindt) {
          wafer.begindt = row.begindt
        }

        lotids.add(row.lotid)
        prdcts.add(row.prdct)
        prgnms.add(row.prgnm)
        lcodes.add(row.lcode)
        wafscribes.add(row.wafscribe)

        diesByWafer.get(id)!.push({
          x,
          y,
          ttime: Number.isFinite(ttime) ? ttime : null,
          curibin: Number.isFinite(curibin) ? curibin : null,
          curfbin: Number.isFinite(curfbin) ? curfbin : null,
        })
      },
      complete: () => {
        const wafers = [...waferById.values()].map((w) => ({
          ...w,
          minTtime: Number.isFinite(w.minTtime) ? w.minTtime : 0,
          maxTtime: Number.isFinite(w.maxTtime) ? w.maxTtime : 0,
        }))

        store.state.wafers = wafers
        store.state.waferById = new Map(wafers.map((w) => [w.id, w]))
        store.state.diesByWafer = diesByWafer
        store.state.rowCount = rowCount
        store.state.fileBytes = fs.statSync(csvPath).size
        store.state.dateMin = dateMin ? dateMin.slice(0, 10) : null
        store.state.dateMax = dateMax ? dateMax.slice(0, 10) : null
        store.state.filters = {
          lotids: [...lotids].sort(),
          prdcts: [...prdcts].sort(),
          prgnms: [...prgnms].sort(),
          lcodes: [...lcodes].sort(),
          wafscribes: [...wafscribes].sort(),
        }
        store.state.loaded = true
        store.state.loading = false
        store.state.loadedAt = new Date().toISOString()
        store.state.error = null
        resolve()
      },
      error: (err: Error) => {
        store.state.loading = false
        store.state.loaded = false
        store.state.error = err?.message || String(err)
        reject(err)
      },
    })
  })
}
