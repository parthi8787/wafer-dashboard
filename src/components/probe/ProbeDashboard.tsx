'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ProbeBinChart, ProbeDailyChart } from '@/components/probe/ProbeCharts'
import { ProbeWaferMap } from '@/components/probe/ProbeWaferMap'
import type { ProbeDie } from '@/lib/probe/types'

const DEFAULT_PATH = 'data/probe/wafer-data.csv'

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
  daily: Array<{ day: string; wafers: number; avgTtime: number }>
  bins: Array<{ bin: number; count: number }>
  wafers: Array<{
    id: string
    lotid: string
    wafscribe: string
    prgnm: string
    enddate: string
    dieCount: number
    yieldPct: number
    avgTtime: number
  }>
}

type Config = {
  csvPath: string | null
  loaded: boolean
  rowCount: number
  fileBytes: number
  loadedAt: string | null
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

export function ProbeDashboard() {
  const [pathInput, setPathInput] = useState(DEFAULT_PATH)
  const [config, setConfig] = useState<Config | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    lotid: '',
    prdct: '',
    prgnm: '',
    lcode: '',
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [waferDetail, setWaferDetail] = useState<{
    wafer: {
      id: string
      lotid: string
      wafscribe: string
      dieCount: number
      yieldPct: number
      avgTtime: number
    }
    dies: ProbeDie[]
  } | null>(null)
  const [mapMode, setMapMode] = useState<'bin' | 'ttime'>('bin')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = useCallback(async (nextFilters = filters) => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      for (const [k, v] of Object.entries(nextFilters)) {
        if (v) qs.set(k, v)
      }
      const suffix = qs.toString() ? `?${qs}` : ''
      const data = await request<Summary>(`/api/probe/summary${suffix}`)
      setSummary(data)
      setSelectedId((prev) => {
        if (prev && data.wafers.some((w) => w.id === prev)) return prev
        return data.wafers[0]?.id ?? null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    ;(async () => {
      try {
        const cfg = await request<Config>('/api/probe/config')
        setConfig(cfg)
        if (cfg.csvPath) setPathInput(cfg.csvPath)
        await loadSummary()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setWaferDetail(null)
      return
    }
    const [lotid, wafscribe] = selectedId.split('|')
    let cancelled = false
    ;(async () => {
      try {
        const detail = await request<{
          wafer: {
            id: string
            lotid: string
            wafscribe: string
            dieCount: number
            yieldPct: number
            avgTtime: number
          }
          dies: ProbeDie[]
        }>(
          `/api/probe/wafer/${encodeURIComponent(lotid)}/${encodeURIComponent(wafscribe)}`,
        )
        if (!cancelled) setWaferDetail(detail)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId])

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
      setSelectedId(null)
      setWaferDetail(null)
      const cleared = {
        dateFrom: '',
        dateTo: '',
        lotid: '',
        prdct: '',
        prgnm: '',
        lcode: '',
      }
      setFilters(cleared)
      await loadSummary(cleared)
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
      await loadSummary()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const selectedWafer = useMemo(
    () => summary?.wafers.find((w) => w.id === selectedId) || waferDetail?.wafer || null,
    [summary, selectedId, waferDetail],
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand">
            Wafer<span>Probe</span>
          </div>
          <p className="brand-sub">
            Interactive lot / wafer / die probe results loaded from a CSV path. Built for
            90+ day extracts — the server aggregates die rows and streams one wafer map at
            a time.
          </p>
        </div>
        <div className="probe-nav">
          <Link className="probe-nav-link" href="/">
            ← WaferTrack movements
          </Link>
        </div>
      </header>

      <section className="panel panel-pad probe-path-bar">
        <label className="probe-field">
          <span>CSV path</span>
          <input
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            placeholder="data/probe/wafer-data.csv or absolute path"
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
          ? `Loaded ${fmt(config.rowCount)} rows · ${(config.fileBytes / (1024 * 1024)).toFixed(1)} MB · ${config.csvPath}`
          : 'Default sample: data/probe/wafer-data.csv — set PROBE_CSV_PATH or enter a path above'}
        {config?.loadedAt ? ` · refreshed ${new Date(config.loadedAt).toLocaleString()}` : ''}
      </div>

      {error && <div className="panel state error">{error}</div>}

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
          <select
            value={filters.lotid}
            onChange={(e) => setFilters((f) => ({ ...f, lotid: e.target.value }))}
          >
            <option value="">All</option>
            {(summary?.filters.lotids || []).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
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
            {(summary?.filters.lcodes || []).map((v) => (
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
            const cleared = {
              dateFrom: '',
              dateTo: '',
              lotid: '',
              prdct: '',
              prgnm: '',
              lcode: '',
            }
            setFilters(cleared)
            loadSummary(cleared)
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
          <div className="kpi-label">Die sites</div>
          <div className="kpi-value">{fmt(summary?.kpis.dies)}</div>
        </div>
        <div className="panel panel-pad probe-kpi">
          <div className="kpi-label">Yield</div>
          <div className="kpi-value">{fmt(summary?.kpis.yieldPct, 1)}%</div>
        </div>
        <div className="panel panel-pad probe-kpi">
          <div className="kpi-label">Avg ttime</div>
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

      <section className="probe-grid-2">
        <div className="panel panel-pad">
          <h2 className="panel-title">Wafers completed by day</h2>
          <p className="panel-sub">Daily wafer count and average test time (ttime)</p>
          <ProbeDailyChart data={summary?.daily || []} />
        </div>
        <div className="panel panel-pad">
          <h2 className="panel-title">Soft-bin distribution</h2>
          <p className="panel-sub">Top curibin counts across filtered die sites</p>
          <ProbeBinChart data={summary?.bins || []} />
        </div>
      </section>

      <section className="probe-main">
        <div className="panel panel-pad">
          <h2 className="panel-title">Wafer list</h2>
          <p className="panel-sub">
            {loading
              ? 'Loading…'
              : `${fmt(summary?.wafers.length || 0)} wafers — click a row for the map`}
          </p>
          <div className="probe-table-wrap">
            <table className="probe-table">
              <thead>
                <tr>
                  <th>Lot</th>
                  <th>Scribe</th>
                  <th>End</th>
                  <th>Dies</th>
                  <th>Yield</th>
                  <th>Avg ttime</th>
                  <th>Program</th>
                </tr>
              </thead>
              <tbody>
                {(summary?.wafers || []).map((w) => (
                  <tr
                    key={w.id}
                    className={w.id === selectedId ? 'active' : ''}
                    onClick={() => setSelectedId(w.id)}
                  >
                    <td className="mono">{w.lotid}</td>
                    <td className="mono">{w.wafscribe}</td>
                    <td className="mono">{w.enddate?.slice(0, 16)}</td>
                    <td>{fmt(w.dieCount)}</td>
                    <td>{fmt(w.yieldPct, 1)}%</td>
                    <td>{fmt(w.avgTtime, 1)}</td>
                    <td className="mono">{w.prgnm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel panel-pad">
          <div className="probe-wafer-toolbar" style={{ marginBottom: 10 }}>
            <div>
              <h2 className="panel-title" style={{ margin: 0 }}>
                Wafer map
              </h2>
              <p className="panel-sub" style={{ marginBottom: 0 }}>
                Die grid by soft-bin or test time
              </p>
            </div>
            <div className="probe-chip-row">
              <button
                type="button"
                className={`probe-chip ${mapMode === 'bin' ? 'active' : ''}`}
                onClick={() => setMapMode('bin')}
              >
                By bin
              </button>
              <button
                type="button"
                className={`probe-chip ${mapMode === 'ttime' ? 'active' : ''}`}
                onClick={() => setMapMode('ttime')}
              >
                By ttime
              </button>
            </div>
          </div>
          <ProbeWaferMap
            wafer={selectedWafer}
            dies={waferDetail?.wafer.id === selectedId ? waferDetail.dies : null}
            mode={mapMode}
          />
        </div>
      </section>
    </div>
  )
}
