'use client'

import { useCallback, useEffect, useState } from 'react'
import { AppNav } from '@/components/AppNav'
import { SampleBanner } from '@/components/SampleBanner'
import { ClassGdrPanel } from '@/components/bin-analysis/ClassGdrPanel'
import { CommonalityMap } from '@/components/bin-analysis/CommonalityMap'
import { HardwarePanel } from '@/components/bin-analysis/HardwarePanel'
import { LotMultiSelect } from '@/components/probe/LotMultiSelect'

const DEFAULT_PATH = 'data/bin-analysis/class-gdr-dies.csv'

type Summary = {
  meta: {
    csvPath: string
    rowCount: number
    fileBytes: number
    loadedAt: string | null
    filteredRows: number
  }
  filters: {
    lotids: string[]
    wafscribes: string[]
    classBins: Array<{ value: number; label: string }>
    gdrBins: Array<{ value: number; label: string }>
    testers: string[]
    handlers: string[]
    chambers: string[]
    probers: string[]
  }
  kpis: {
    lots: number
    wafers: number
    dies: number
    classYieldPct: number
    gdrFailDies: number
    gdrFailPct: number
  }
  commonality: {
    waferCount: number
    maxFail: number
    cells: Array<{
      x: number
      y: number
      failCount: number
      waferCount: number
      rate: number
    }>
    hotspots: Array<{
      x: number
      y: number
      failCount: number
      waferCount: number
      rate: number
    }>
  }
  classPareto: Array<{ bin: number; name: string; count: number; pct: number }>
  gdrPareto: Array<{ bin: number; name: string; count: number; pct: number }>
  correlation: {
    selectedClassBin: number | null
    correlations: Array<{
      classBin: number
      classBinName: string
      gdrBin: number
      gdrBinName: string
      count: number
      pctOfClass: number
    }>
    mapDies: Array<{
      x: number
      y: number
      classBin: number
      classBinName: string
      gdrBin: number
      gdrBinName: string
      gdrFail: boolean
      wafscribe: string
    }>
    classCount: number
    gdrFailCount: number
  }
  hardware: {
    tester: Array<{
      key: string
      dimension: string
      tested: number
      fails: number
      failRate: number
      topClassBin: string
    }>
    testSite: Array<{
      key: string
      dimension: string
      tested: number
      fails: number
      failRate: number
      topClassBin: string
    }>
    handler: Array<{
      key: string
      dimension: string
      tested: number
      fails: number
      failRate: number
      topClassBin: string
    }>
    chamber: Array<{
      key: string
      dimension: string
      tested: number
      fails: number
      failRate: number
      topClassBin: string
    }>
    prober: Array<{
      key: string
      dimension: string
      tested: number
      fails: number
      failRate: number
      topClassBin: string
    }>
  }
}

type CsvFileOption = { value: string; label: string; bytes: number }

type Config = {
  csvPath: string | null
  loaded: boolean
  rowCount: number
  fileBytes: number
  loadedAt: string | null
  availableFiles?: CsvFileOption[]
}

type Filters = {
  lotids: string[]
  tester: string
  handler: string
  chamber: string
  prober: string
  commonalityBin: string
  classBin: string
}

const EMPTY: Filters = {
  lotids: [],
  tester: '',
  handler: '',
  chamber: '',
  prober: '',
  commonalityBin: '',
  classBin: '',
}

function fmt(n: number | null | undefined, digits = 0) {
  if (n == null || Number.isNaN(n)) return '—'
  return Number(n).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`)
  }
  return data as T
}

export function BinAnalysisDashboard() {
  const [pathInput, setPathInput] = useState(DEFAULT_PATH)
  const [config, setConfig] = useState<Config | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [tab, setTab] = useState<'commonality' | 'class-gdr' | 'hardware'>('commonality')
  const [hwDim, setHwDim] = useState<
    'tester' | 'testSite' | 'handler' | 'chamber' | 'prober'
  >('tester')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = useCallback(async (next: Filters) => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (next.lotids.length) qs.set('lotids', next.lotids.join(','))
      if (next.tester) qs.set('tester', next.tester)
      if (next.handler) qs.set('handler', next.handler)
      if (next.chamber) qs.set('chamber', next.chamber)
      if (next.prober) qs.set('prober', next.prober)
      if (next.commonalityBin) qs.set('commonalityBin', next.commonalityBin)
      if (next.classBin) qs.set('classBin', next.classBin)
      const suffix = qs.toString() ? `?${qs}` : ''
      const data = await request<Summary>(`/api/bin-analysis/summary${suffix}`)
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const cfg = await request<Config>('/api/bin-analysis/config')
        setConfig(cfg)
        const files = cfg.availableFiles || []
        const match = files.find(
          (f) =>
            cfg.csvPath?.endsWith(`/${f.label}`) ||
            cfg.csvPath?.endsWith(f.value) ||
            cfg.csvPath?.includes(`/${f.value}`),
        )
        setPathInput(match?.value || files[0]?.value || DEFAULT_PATH)
        await loadSummary(EMPTY)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      }
    })()
  }, [loadSummary])

  async function onLoadPath() {
    setBusy(true)
    setError(null)
    try {
      await request('/api/bin-analysis/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvPath: pathInput.trim() }),
      })
      const cfg = await request<Config>('/api/bin-analysis/config')
      setConfig(cfg)
      setFilters(EMPTY)
      await loadSummary(EMPTY)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function onReload() {
    setBusy(true)
    setError(null)
    try {
      await request('/api/bin-analysis/reload', { method: 'POST' })
      const cfg = await request<Config>('/api/bin-analysis/config')
      setConfig(cfg)
      await loadSummary(filters)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function setClassBin(bin: number | null) {
    const next = { ...filters, classBin: bin == null ? '' : String(bin) }
    setFilters(next)
    loadSummary(next)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand">
            Bin<span>Analysis</span>
          </div>
          <p className="brand-sub">
            Wafer-map commonality · Class → GDR fail correlation · Class hardware
            analysis
          </p>
        </div>
        <AppNav />
      </header>

      <SampleBanner kind="bin-analysis" />

      <section className="panel panel-pad probe-path-bar">
        <label className="probe-field">
          <span>Class / GDR CSV file</span>
          <select
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            disabled={busy || !(config?.availableFiles?.length)}
          >
            {(config?.availableFiles?.length
              ? config.availableFiles
              : [{ value: DEFAULT_PATH, label: 'class-gdr-dies.csv', bytes: 0 }]
            ).map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
                {f.bytes ? ` (${(f.bytes / 1024).toFixed(0)} KB)` : ''}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn-primary" disabled={busy} onClick={onLoadPath}>
          Load
        </button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={onReload}>
          Reload
        </button>
        <div className="probe-path-meta mono muted small">
          {config?.loaded
            ? `${fmt(config.rowCount)} rows · ${fmt((config.fileBytes || 0) / 1024, 1)} KB`
            : 'Not loaded'}
        </div>
      </section>

      {error && <div className="panel state error">{error}</div>}

      <form
        className="probe-filters"
        onSubmit={(e) => {
          e.preventDefault()
          loadSummary(filters)
        }}
      >
        <LotMultiSelect
          options={summary?.filters.lotids || []}
          selected={filters.lotids}
          onChange={(lotids) => setFilters((f) => ({ ...f, lotids }))}
        />
        <label className="probe-field">
          <span>Tester</span>
          <select
            value={filters.tester}
            onChange={(e) => setFilters((f) => ({ ...f, tester: e.target.value }))}
          >
            <option value="">All</option>
            {(summary?.filters.testers || []).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="probe-field">
          <span>Handler</span>
          <select
            value={filters.handler}
            onChange={(e) => setFilters((f) => ({ ...f, handler: e.target.value }))}
          >
            <option value="">All</option>
            {(summary?.filters.handlers || []).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="probe-field">
          <span>Commonality class bin</span>
          <select
            value={filters.commonalityBin}
            onChange={(e) =>
              setFilters((f) => ({ ...f, commonalityBin: e.target.value }))
            }
          >
            <option value="">All fails</option>
            {(summary?.filters.classBins || [])
              .filter((b) => b.value !== 1)
              .map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
          </select>
        </label>
        <button type="submit" className="btn-primary" disabled={loading}>
          Apply
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setFilters(EMPTY)
            loadSummary(EMPTY)
          }}
        >
          Clear
        </button>
      </form>

      <section className="probe-kpis">
        <div className="panel panel-pad probe-kpi">
          <div className="kpi-label">Lots</div>
          <div className="kpi-value">{fmt(summary?.kpis.lots)}</div>
        </div>
        <div className="panel panel-pad probe-kpi">
          <div className="kpi-label">Wafers</div>
          <div className="kpi-value">{fmt(summary?.kpis.wafers)}</div>
        </div>
        <div className="panel panel-pad probe-kpi">
          <div className="kpi-label">Class yield</div>
          <div className="kpi-value">{fmt(summary?.kpis.classYieldPct, 1)}%</div>
        </div>
        <div className="panel panel-pad probe-kpi">
          <div className="kpi-label">GDR fail dies</div>
          <div className="kpi-value">{fmt(summary?.kpis.gdrFailDies)}</div>
        </div>
        <div className="panel panel-pad probe-kpi">
          <div className="kpi-label">GDR fail %</div>
          <div className="kpi-value">{fmt(summary?.kpis.gdrFailPct, 1)}%</div>
        </div>
      </section>

      <div className="probe-chip-row" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className={`probe-chip ${tab === 'commonality' ? 'active' : ''}`}
          onClick={() => setTab('commonality')}
        >
          Wafer map commonality
        </button>
        <button
          type="button"
          className={`probe-chip ${tab === 'class-gdr' ? 'active' : ''}`}
          onClick={() => setTab('class-gdr')}
        >
          Class ↔ GDR correlation
        </button>
        <button
          type="button"
          className={`probe-chip ${tab === 'hardware' ? 'active' : ''}`}
          onClick={() => setTab('hardware')}
        >
          Hardware analysis
        </button>
      </div>

      {loading && !summary && <div className="panel state">Loading bin analysis…</div>}

      {summary && tab === 'commonality' && (
        <section className="panel panel-pad">
          <div className="section-head">
            <div>
              <h2 className="panel-title">Wafer map commonality</h2>
              <p className="panel-meta">
                Overlay fail sites across wafers — hotspots show (x,y) that fail together
              </p>
            </div>
          </div>
          <CommonalityMap
            cells={summary.commonality.cells}
            maxFail={summary.commonality.maxFail}
            waferCount={summary.commonality.waferCount}
            hotspots={summary.commonality.hotspots}
          />
        </section>
      )}

      {summary && tab === 'class-gdr' && (
        <section className="panel panel-pad">
          <div className="section-head">
            <div>
              <h2 className="panel-title">Class bin → GDR wafer map</h2>
              <p className="panel-meta">
                Class fail pareto mapped to GDR soft bins and die (x,y) locations
              </p>
            </div>
          </div>
          <ClassGdrPanel
            classPareto={summary.classPareto}
            gdrPareto={summary.gdrPareto}
            selectedClassBin={
              filters.classBin ? Number(filters.classBin) : summary.correlation.selectedClassBin
            }
            onSelectClassBin={setClassBin}
            correlations={summary.correlation.correlations}
            mapDies={summary.correlation.mapDies}
            classCount={summary.correlation.classCount}
            gdrFailCount={summary.correlation.gdrFailCount}
          />
        </section>
      )}

      {summary && tab === 'hardware' && (
        <section className="panel panel-pad">
          <div className="section-head">
            <div>
              <h2 className="panel-title">Hardware analysis (Class)</h2>
              <p className="panel-meta">
                Fail rate by tester, site, handler, chamber, and prober
              </p>
            </div>
          </div>
          <HardwarePanel
            tester={summary.hardware.tester}
            testSite={summary.hardware.testSite}
            handler={summary.hardware.handler}
            chamber={summary.hardware.chamber}
            prober={summary.hardware.prober}
            dimension={hwDim}
            onDimension={setHwDim}
          />
        </section>
      )}

      <section className="panel panel-pad" style={{ marginTop: 16 }}>
        <h2 className="panel-title" style={{ fontSize: '1rem' }}>
          Bring your class / GDR data
        </h2>
        <p className="panel-meta" style={{ marginTop: 6 }}>
          Replace the sample CSV (or point the path above) with columns:{' '}
          <code className="mono">
            lotid, wafscribe, die_x, die_y, class_bin, class_bin_name, gdr_bin,
            gdr_bin_name, gdr_fail, tester_id, test_site, handler_id, chamber, prober_id,
            tested_at
          </code>
          . Each row is one die; <code>gdr_fail=1</code> marks GDR failing dies used on the
          map.
        </p>
      </section>
    </div>
  )
}
