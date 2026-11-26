'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AppNav } from '@/components/AppNav'
import { SampleBanner } from '@/components/SampleBanner'
import { ActualSummaryTable } from '@/components/probe/ActualSummaryTable'
import { LotMultiSelect } from '@/components/probe/LotMultiSelect'
import { BinParetoChart, YieldTrendChart } from '@/components/probe/ProbeCharts'
import { lcodeLabel } from '@/lib/probe/lcode'

const DEFAULT_PATH = 'data/probe/wafer-data.csv'

type PeriodRow = {
  key: string
  label: string
  wafers: number
  dies: number
  yieldPct: number
  avgTtime: number
  tpName?: string
}

type Summary = {
  meta: {
    csvPath: string
    rowCount: number
    fileBytes: number
    loadedAt: string | null
  }
  filters: {
    lotids: string[]
    prdcts: string[]
    prgnms: string[]
    lcodes: string[]
    lcodeOptions?: Array<{ value: string; label: string }>
  }
  kpis: {
    lots: number
    wafers: number
    dies: number
    yieldPct: number
    avgTtime: number
    dateMin: string | null
    dateMax: string | null
  }
  weekly: PeriodRow[]
  monthly: PeriodRow[]
  actualColumns: Array<PeriodRow & { kind: 'month' | 'quarter' }>
  binParetoWeekly: Array<{
    key: string
    label: string
    dies: number
    yieldDenom: number
    pass: number
    bins: Array<{ bin: number; count: number }>
  }>
  binParetoMonthly: Array<{
    key: string
    label: string
    dies: number
    yieldDenom: number
    pass: number
    bins: Array<{ bin: number; count: number }>
  }>
  binsOverall: Array<{ bin: number; count: number }>
}

type Config = {
  csvPath: string | null
  loaded: boolean
  rowCount: number
  fileBytes: number
  loadedAt: string | null
}

type FilterState = {
  dateFrom: string
  dateTo: string
  lotids: string[]
  prdct: string
  prgnm: string
  lcode: string
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

const EMPTY_FILTERS: FilterState = {
  dateFrom: '',
  dateTo: '',
  lotids: [],
  prdct: '',
  prgnm: '',
  lcode: '',
}

export function ProbeDashboard() {
  const [pathInput, setPathInput] = useState(DEFAULT_PATH)
  const [config, setConfig] = useState<Config | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [periodView, setPeriodView] = useState<'monthly' | 'weekly'>('monthly')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState<FilterState>(EMPTY_FILTERS)
  const skipAutoApply = useRef(true)

  const loadSummary = useCallback(async (nextFilters: FilterState) => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (nextFilters.dateFrom) qs.set('dateFrom', nextFilters.dateFrom)
      if (nextFilters.dateTo) qs.set('dateTo', nextFilters.dateTo)
      if (nextFilters.lotids.length) qs.set('lotids', nextFilters.lotids.join(','))
      if (nextFilters.prdct) qs.set('prdct', nextFilters.prdct)
      if (nextFilters.prgnm) qs.set('prgnm', nextFilters.prgnm)
      if (nextFilters.lcode) qs.set('lcode', nextFilters.lcode)
      const suffix = qs.toString() ? `?${qs}` : ''
      const data = await request<Summary>(`/api/probe/summary${suffix}`)
      setSummary(data)
      setApplied(nextFilters)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const cfg = await request<Config>('/api/probe/config')
        setConfig(cfg)
        if (cfg.csvPath) setPathInput(cfg.csvPath)
        await loadSummary(EMPTY_FILTERS)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      }
    })()
  }, [loadSummary])

  // Auto-apply when filters change (after first load)
  useEffect(() => {
    if (skipAutoApply.current) {
      skipAutoApply.current = false
      return
    }
    const t = setTimeout(() => {
      loadSummary(filters)
    }, 150)
    return () => clearTimeout(t)
  }, [filters, loadSummary])

  async function onLoadPath() {
    setBusy(true)
    setError(null)
    try {
      await request('/api/probe/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvPath: pathInput.trim() }),
      })
      const cfg = await request<Config>('/api/probe/config')
      setConfig(cfg)
      setFilters(EMPTY_FILTERS)
      await loadSummary(EMPTY_FILTERS)
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
      await request('/api/probe/reload', { method: 'POST' })
      const cfg = await request<Config>('/api/probe/config')
      setConfig(cfg)
      await loadSummary(filters)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const lcodeOptions =
    summary?.filters.lcodeOptions ||
    (summary?.filters.lcodes || []).map((v) => ({ value: v, label: v }))

  const weeklyCols = (summary?.weekly || []).map((r) => ({
    ...r,
    kind: 'week' as const,
  }))

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand">
            Wafer<span>Probe</span>
          </div>
          <p className="brand-sub">
            Flow SDS → SDT → SDE · Pareto hides bin 93 on all · Yield: SDS counts all dies;
            SDT/SDE exclude bin 93 · Avg TT on good bin only
          </p>
        </div>
        <AppNav />
      </header>

      <SampleBanner kind="probe" />

      <section className="panel panel-pad probe-path-bar">
        <label className="probe-field">
          <span>CSV path (under data/)</span>
          <input
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            placeholder="data/probe/wafer-data.csv"
            spellCheck={false}
          />
        </label>
        <button type="button" className="btn-primary" onClick={onLoadPath} disabled={busy}>
          Load path
        </button>
        <button type="button" className="btn-secondary" onClick={onReload} disabled={busy}>
          Reload
        </button>
      </section>
      <div className="probe-meta mono">
        {config?.loaded
          ? `Loaded ${fmt(config.rowCount)} rows · ${(config.fileBytes / (1024 * 1024)).toFixed(1)} MB`
          : 'Default sample: data/probe/wafer-data.csv'}
        {config?.loadedAt ? ` · refreshed ${new Date(config.loadedAt).toLocaleString()}` : ''}
        {loading ? ' · updating…' : ''}
      </div>

      {error && <div className="panel state error">{error}</div>}

      {(applied.lcode ||
        applied.lotids.length > 0 ||
        applied.prdct ||
        applied.prgnm ||
        applied.dateFrom ||
        applied.dateTo) && (
        <div className="probe-active-filters">
          <strong>Active filter:</strong>
          {applied.lcode && (
            <span className="probe-filter-chip">
              LCode {lcodeLabel(applied.lcode)}
            </span>
          )}
          {applied.lotids.length > 0 && (
            <span className="probe-filter-chip">
              Lots {applied.lotids.length === 1 ? applied.lotids[0] : `${applied.lotids.length} selected`}
            </span>
          )}
          {applied.prdct && (
            <span className="probe-filter-chip">Product {applied.prdct}</span>
          )}
          {applied.prgnm && (
            <span className="probe-filter-chip">Program {applied.prgnm}</span>
          )}
          {(applied.dateFrom || applied.dateTo) && (
            <span className="probe-filter-chip">
              {applied.dateFrom || '…'} → {applied.dateTo || '…'}
            </span>
          )}
        </div>
      )}

      <form
        className="probe-filters"
        onSubmit={(e) => {
          e.preventDefault()
          loadSummary(filters)
        }}
      >
        <label className="probe-field">
          <span>From</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          />
        </label>
        <label className="probe-field">
          <span>To</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          />
        </label>
        <label className="probe-field">
          <span>Lot</span>
          <LotMultiSelect
            options={summary?.filters.lotids || []}
            selected={filters.lotids}
            onChange={(lotids) => setFilters((f) => ({ ...f, lotids }))}
          />
        </label>
        <label className="probe-field">
          <span>Product</span>
          <select
            value={filters.prdct}
            onChange={(e) => setFilters((f) => ({ ...f, prdct: e.target.value }))}
          >
            <option value="">All</option>
            {(summary?.filters.prdcts || []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="probe-field">
          <span>Program</span>
          <select
            value={filters.prgnm}
            onChange={(e) => setFilters((f) => ({ ...f, prgnm: e.target.value }))}
          >
            <option value="">All</option>
            {(summary?.filters.prgnms || []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="probe-field">
          <span>LCode</span>
          <select
            value={filters.lcode}
            onChange={(e) => setFilters((f) => ({ ...f, lcode: e.target.value }))}
          >
            <option value="">All</option>
            {lcodeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
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
            setFilters(EMPTY_FILTERS)
            loadSummary(EMPTY_FILTERS)
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
          <div className="kpi-label">Yield</div>
          <div className="kpi-value">{fmt(summary?.kpis.yieldPct, 1)}%</div>
        </div>
        <div className="panel panel-pad probe-kpi">
          <div className="kpi-label">Avg TT (good)</div>
          <div className="kpi-value">{fmt(summary?.kpis.avgTtime, 1)}</div>
        </div>
        <div className="panel panel-pad probe-kpi">
          <div className="kpi-label">Date span</div>
          <div className="kpi-value kpi-value-sm">
            {summary?.kpis.dateMin && summary?.kpis.dateMax
              ? `${summary.kpis.dateMin.slice(5)} → ${summary.kpis.dateMax.slice(5)}`
              : '—'}
          </div>
        </div>
      </section>

      <div className="probe-chip-row" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={`probe-chip ${periodView === 'monthly' ? 'active' : ''}`}
          onClick={() => setPeriodView('monthly')}
        >
          Monthly Actual
        </button>
        <button
          type="button"
          className={`probe-chip ${periodView === 'weekly' ? 'active' : ''}`}
          onClick={() => setPeriodView('weekly')}
        >
          Weekly Actual
        </button>
      </div>

      <section style={{ marginBottom: 16 }}>
        {periodView === 'monthly' ? (
          <ActualSummaryTable
            title="Actual — Monthly"
            columns={summary?.actualColumns || []}
            showTp
          />
        ) : (
          <ActualSummaryTable title="Actual — Weekly" columns={weeklyCols} />
        )}
      </section>

      <section className="probe-grid-2">
        <YieldTrendChart
          data={summary?.weekly || []}
          title="Yield trend — weekly"
        />
        <YieldTrendChart
          data={summary?.monthly || []}
          title="Yield trend — monthly"
        />
      </section>

      <section className="probe-grid-2" style={{ marginTop: 14 }}>
        <BinParetoChart
          title="Bin pareto top 10 — by week"
          periods={summary?.binParetoWeekly || []}
          overall={summary?.binsOverall || []}
        />
        <BinParetoChart
          title="Bin pareto top 10 — by month"
          periods={summary?.binParetoMonthly || []}
          overall={summary?.binsOverall || []}
        />
      </section>
    </div>
  )
}
