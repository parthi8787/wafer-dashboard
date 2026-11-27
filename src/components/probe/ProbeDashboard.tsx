'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AppNav } from '@/components/AppNav'
import { SampleBanner } from '@/components/SampleBanner'
import { LotMultiSelect } from '@/components/probe/LotMultiSelect'
import {
  ProbeFlowSection,
  type FlowSummary,
} from '@/components/probe/ProbeFlowSection'
import { SDE_LCODE, SDS_LCODE, SDT_LCODE } from '@/lib/probe/lcode'

const DEFAULT_PATH = 'data/probe/wafer-data.csv'

const FLOWS = [
  {
    code: SDS_LCODE,
    label: 'SDS',
    blurb: 'First flow · yield = pass ÷ all dies · bin 93 hidden from pareto',
  },
  {
    code: SDT_LCODE,
    label: 'SDT',
    blurb: 'After SDS · yield & pareto exclude bin 93 (SDS bin-out)',
  },
  {
    code: SDE_LCODE,
    label: 'SDE',
    blurb: 'After SDT · yield & pareto exclude bin 93 (SDS+SDT bin-out)',
  },
] as const

type FilterMeta = {
  lotids: string[]
  prdcts: string[]
  prgnms: string[]
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

type FilterState = {
  dateFrom: string
  dateTo: string
  lotids: string[]
  prdct: string
  prgnm: string
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
}

type FlowMap = Record<string, FlowSummary | null>

export function ProbeDashboard() {
  const [pathInput, setPathInput] = useState(DEFAULT_PATH)
  const [config, setConfig] = useState<Config | null>(null)
  const [filterMeta, setFilterMeta] = useState<FilterMeta>({
    lotids: [],
    prdcts: [],
    prgnms: [],
  })
  const [flows, setFlows] = useState<FlowMap>({})
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [periodView, setPeriodView] = useState<'monthly' | 'weekly'>('monthly')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState<FilterState>(EMPTY_FILTERS)
  const skipAutoApply = useRef(true)

  const loadSummaries = useCallback(async (nextFilters: FilterState) => {
    setLoading(true)
    setError(null)
    try {
      const base = new URLSearchParams()
      if (nextFilters.dateFrom) base.set('dateFrom', nextFilters.dateFrom)
      if (nextFilters.dateTo) base.set('dateTo', nextFilters.dateTo)
      if (nextFilters.lotids.length) base.set('lotids', nextFilters.lotids.join(','))
      if (nextFilters.prdct) base.set('prdct', nextFilters.prdct)
      if (nextFilters.prgnm) base.set('prgnm', nextFilters.prgnm)

      const results = await Promise.all(
        FLOWS.map(async (flow) => {
          const qs = new URLSearchParams(base)
          qs.set('lcode', flow.code)
          const data = await request<FlowSummary & { filters?: FilterMeta }>(
            `/api/probe/summary?${qs}`,
          )
          return { code: flow.code, data }
        }),
      )

      const next: FlowMap = {}
      for (const r of results) {
        next[r.code] = r.data
      }
      const metaSource = results.find((r) => r.data && (r.data as { filters?: FilterMeta }).filters)
      const meta = metaSource
        ? (metaSource.data as { filters: FilterMeta }).filters
        : null
      if (meta) {
        setFilterMeta({
          lotids: meta.lotids || [],
          prdcts: meta.prdcts || [],
          prgnms: meta.prgnms || [],
        })
      }
      setFlows(next)
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
        const files = cfg.availableFiles || []
        const match = files.find(
          (f) =>
            cfg.csvPath?.endsWith(`/${f.label}`) ||
            cfg.csvPath?.endsWith(f.value) ||
            cfg.csvPath?.includes(`/${f.value}`),
        )
        setPathInput(match?.value || files[0]?.value || DEFAULT_PATH)
        await loadSummaries(EMPTY_FILTERS)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      }
    })()
  }, [loadSummaries])

  useEffect(() => {
    if (skipAutoApply.current) {
      skipAutoApply.current = false
      return
    }
    const t = setTimeout(() => {
      loadSummaries(filters)
    }, 150)
    return () => clearTimeout(t)
  }, [filters, loadSummaries])

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
      await loadSummaries(EMPTY_FILTERS)
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
      await loadSummaries(filters)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand">
            Wafer<span>Probe</span>
          </div>
          <p className="brand-sub">
            v0.1 · SDS, SDT, and SDE on one page · Yield: SDS = all dies; SDT/SDE exclude
            bin 93 · Avg TT on good bin only
          </p>
        </div>
        <AppNav />
      </header>

      <SampleBanner kind="probe" />

      <section className="panel panel-pad probe-path-bar">
        <label className="probe-field">
          <span>Probe CSV file</span>
          <select
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            disabled={busy || !(config?.availableFiles?.length)}
          >
            {(config?.availableFiles?.length
              ? config.availableFiles
              : [{ value: DEFAULT_PATH, label: 'wafer-data.csv', bytes: 0 }]
            ).map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
                {f.bytes
                  ? ` (${(f.bytes / (1024 * 1024)).toFixed(1)} MB)`
                  : ''}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn-primary" onClick={onLoadPath} disabled={busy}>
          Load
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

      {(applied.lotids.length > 0 ||
        applied.prdct ||
        applied.prgnm ||
        applied.dateFrom ||
        applied.dateTo) && (
        <div className="probe-active-filters">
          <strong>Active filter:</strong>
          {applied.lotids.length > 0 && (
            <span className="probe-filter-chip">
              Lots{' '}
              {applied.lotids.length === 1
                ? applied.lotids[0]
                : `${applied.lotids.length} selected`}
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
          loadSummaries(filters)
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
            options={filterMeta.lotids}
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
            {filterMeta.prdcts.map((v) => (
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
            {filterMeta.prgnms.map((v) => (
              <option key={v} value={v}>
                {v}
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
            loadSummaries(EMPTY_FILTERS)
          }}
        >
          Clear
        </button>
      </form>

      <div className="probe-chip-row" style={{ marginBottom: 16 }}>
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

      {FLOWS.map((flow) => (
        <ProbeFlowSection
          key={flow.code}
          label={flow.label}
          blurb={flow.blurb}
          summary={flows[flow.code] || null}
          periodView={periodView}
        />
      ))}
    </div>
  )
}
