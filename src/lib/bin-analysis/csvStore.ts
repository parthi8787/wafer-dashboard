import fs from 'node:fs'
import path from 'node:path'
import Papa from 'papaparse'
import type { BinAnalysisFiltersMeta, BinAnalysisSnapshot, ClassDieRow } from './types'

const DEFAULT_REL = 'data/bin-analysis/class-gdr-dies.csv'

function projectRoot() {
  return process.cwd()
}

function resolveCsvPath(input: string) {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('CSV path is empty')
  if (path.isAbsolute(trimmed)) {
    return path.resolve(/*turbopackIgnore: true*/ trimmed)
  }
  return path.resolve(/*turbopackIgnore: true*/ projectRoot(), trimmed)
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim()
}

function parseRow(raw: Record<string, unknown>): ClassDieRow | null {
  const dieX = num(raw.die_x ?? raw.dieX ?? raw.wafxloc)
  const dieY = num(raw.die_y ?? raw.dieY ?? raw.wafyloc)
  const classBin = num(raw.class_bin ?? raw.classBin ?? raw.curibin)
  const gdrBin = num(raw.gdr_bin ?? raw.gdrBin)
  if (dieX == null || dieY == null || classBin == null || gdrBin == null) return null

  const classBinName =
    str(raw.class_bin_name ?? raw.classBinName) || `BIN_${classBin}`
  const gdrBinName = str(raw.gdr_bin_name ?? raw.gdrBinName) || `GDR_${gdrBin}`
  const gdrFailRaw = str(raw.gdr_fail ?? raw.gdrFail)
  const gdrFail =
    gdrFailRaw === ''
      ? gdrBin !== 1
      : ['1', 'true', 'yes', 'y'].includes(gdrFailRaw.toLowerCase())

  return {
    lotid: str(raw.lotid ?? raw.lot_id) || 'UNKNOWN',
    wafscribe: str(raw.wafscribe ?? raw.wafer_id ?? raw.waferId) || 'UNKNOWN',
    dieX,
    dieY,
    stage: str(raw.stage) || 'CLASS',
    classBin,
    classBinName,
    gdrBin,
    gdrBinName,
    gdrFail,
    testerId: str(raw.tester_id ?? raw.testerId) || '—',
    testSite: num(raw.test_site ?? raw.testSite ?? raw.site) ?? 0,
    handlerId: str(raw.handler_id ?? raw.handlerId) || '—',
    chamber: str(raw.chamber) || '—',
    proberId: str(raw.prober_id ?? raw.proberId) || '—',
    testedAt: str(raw.tested_at ?? raw.testedAt),
  }
}

function buildFilters(dies: ClassDieRow[]): BinAnalysisFiltersMeta {
  const lotids = new Set<string>()
  const wafscribes = new Set<string>()
  const classMap = new Map<number, string>()
  const gdrMap = new Map<number, string>()
  const testers = new Set<string>()
  const handlers = new Set<string>()
  const chambers = new Set<string>()
  const probers = new Set<string>()

  for (const d of dies) {
    lotids.add(d.lotid)
    wafscribes.add(d.wafscribe)
    classMap.set(d.classBin, d.classBinName)
    gdrMap.set(d.gdrBin, d.gdrBinName)
    testers.add(d.testerId)
    handlers.add(d.handlerId)
    chambers.add(d.chamber)
    probers.add(d.proberId)
  }

  const sortNums = (a: number, b: number) => a - b
  return {
    lotids: [...lotids].sort(),
    wafscribes: [...wafscribes].sort(),
    classBins: [...classMap.entries()]
      .sort((a, b) => sortNums(a[0], b[0]))
      .map(([value, label]) => ({ value, label: `${value} · ${label}` })),
    gdrBins: [...gdrMap.entries()]
      .sort((a, b) => sortNums(a[0], b[0]))
      .map(([value, label]) => ({ value, label: `${value} · ${label}` })),
    testers: [...testers].sort(),
    handlers: [...handlers].sort(),
    chambers: [...chambers].sort(),
    probers: [...probers].sort(),
  }
}

class BinAnalysisStore {
  private snapshot: BinAnalysisSnapshot = {
    csvPath: null,
    loaded: false,
    loading: false,
    error: null,
    loadedAt: null,
    rowCount: 0,
    fileBytes: 0,
    filters: {
      lotids: [],
      wafscribes: [],
      classBins: [],
      gdrBins: [],
      testers: [],
      handlers: [],
      chambers: [],
      probers: [],
    },
    dies: [],
  }

  private loadPromise: Promise<BinAnalysisSnapshot> | null = null

  getSnapshot() {
    return this.snapshot
  }

  async ensureLoaded() {
    if (this.snapshot.loaded && !this.snapshot.error) return this.snapshot
    if (this.loadPromise) return this.loadPromise
    const defaultPath = resolveCsvPath(
      process.env.BIN_ANALYSIS_CSV_PATH || DEFAULT_REL,
    )
    return this.loadFromPath(defaultPath)
  }

  async loadFromPath(csvPathInput: string) {
    if (this.loadPromise) await this.loadPromise.catch(() => null)

    this.loadPromise = (async () => {
      const absolute = resolveCsvPath(csvPathInput)
      this.snapshot = {
        ...this.snapshot,
        loading: true,
        error: null,
        csvPath: absolute,
      }

      if (!fs.existsSync(/*turbopackIgnore: true*/ absolute)) {
        this.snapshot = {
          ...this.snapshot,
          loaded: false,
          loading: false,
          error: `CSV not found: ${absolute}`,
          dies: [],
          rowCount: 0,
          fileBytes: 0,
        }
        return this.snapshot
      }

      const stat = fs.statSync(/*turbopackIgnore: true*/ absolute)
      const text = fs.readFileSync(/*turbopackIgnore: true*/ absolute, 'utf8')
      const parsed = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
      })

      if (parsed.errors.length) {
        const first = parsed.errors[0]
        throw new Error(`CSV parse error: ${first.message} (row ${first.row})`)
      }

      const dies: ClassDieRow[] = []
      for (const row of parsed.data) {
        const d = parseRow(row)
        if (d) dies.push(d)
      }

      this.snapshot = {
        csvPath: absolute,
        loaded: true,
        loading: false,
        error: null,
        loadedAt: new Date().toISOString(),
        rowCount: dies.length,
        fileBytes: stat.size,
        filters: buildFilters(dies),
        dies,
      }
      return this.snapshot
    })()

    try {
      return await this.loadPromise
    } finally {
      this.loadPromise = null
    }
  }

  async reload() {
    const pathToLoad =
      this.snapshot.csvPath ||
      resolveCsvPath(process.env.BIN_ANALYSIS_CSV_PATH || DEFAULT_REL)
    this.snapshot = { ...this.snapshot, loaded: false }
    return this.loadFromPath(pathToLoad)
  }
}

const globalKey = '__binAnalysisCsvStore'
const g = globalThis as typeof globalThis & {
  [globalKey]?: BinAnalysisStore
}

export function getBinAnalysisStore() {
  if (!g[globalKey]) g[globalKey] = new BinAnalysisStore()
  return g[globalKey]!
}

export { DEFAULT_REL as DEFAULT_BIN_ANALYSIS_CSV }
