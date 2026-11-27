'use client'

import { ActualSummaryTable } from '@/components/probe/ActualSummaryTable'
import { BinParetoChart, YieldTrendChart } from '@/components/probe/ProbeCharts'

type PeriodRow = {
  key: string
  label: string
  wafers: number
  dies: number
  yieldPct: number
  avgTtime: number
  tpName?: string
}

export type FlowSummary = {
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

function fmt(n: number | null | undefined, digits = 0) {
  if (n == null || Number.isNaN(n)) return '—'
  return Number(n).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

export function ProbeFlowSection({
  label,
  blurb,
  summary,
  periodView,
}: {
  label: string
  blurb: string
  summary: FlowSummary | null
  periodView: 'monthly' | 'weekly'
}) {
  const weeklyCols = (summary?.weekly || []).map((r) => ({
    ...r,
    kind: 'week' as const,
  }))
  const empty = !summary || summary.kpis.wafers === 0

  return (
    <section className="probe-flow-section">
      <div className="probe-flow-head">
        <h2 className="probe-flow-title">{label}</h2>
        <p className="probe-flow-blurb">{blurb}</p>
      </div>

      {empty ? (
        <div className="panel state">No {label} wafers for current filters.</div>
      ) : (
        <>
          <section className="probe-kpis">
            <div className="panel panel-pad probe-kpi">
              <div className="kpi-label">Lots</div>
              <div className="kpi-value">{fmt(summary.kpis.lots)}</div>
            </div>
            <div className="panel panel-pad probe-kpi">
              <div className="kpi-label">Wafers</div>
              <div className="kpi-value">{fmt(summary.kpis.wafers)}</div>
            </div>
            <div className="panel panel-pad probe-kpi">
              <div className="kpi-label">Yield</div>
              <div className="kpi-value">{fmt(summary.kpis.yieldPct, 1)}%</div>
            </div>
            <div className="panel panel-pad probe-kpi">
              <div className="kpi-label">Avg TT (good)</div>
              <div className="kpi-value">{fmt(summary.kpis.avgTtime, 1)}</div>
            </div>
            <div className="panel panel-pad probe-kpi">
              <div className="kpi-label">Date span</div>
              <div className="kpi-value kpi-value-sm">
                {summary.kpis.dateMin && summary.kpis.dateMax
                  ? `${summary.kpis.dateMin.slice(5)} → ${summary.kpis.dateMax.slice(5)}`
                  : '—'}
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 16 }}>
            {periodView === 'monthly' ? (
              <ActualSummaryTable
                title={`${label} Actual — Monthly`}
                columns={summary.actualColumns || []}
                showTp
              />
            ) : (
              <ActualSummaryTable
                title={`${label} Actual — Weekly`}
                columns={weeklyCols}
              />
            )}
          </section>

          <section className="probe-grid-2">
            <YieldTrendChart
              data={summary.weekly || []}
              title={`${label} yield — weekly`}
            />
            <YieldTrendChart
              data={summary.monthly || []}
              title={`${label} yield — monthly`}
            />
          </section>

          <section className="probe-grid-2" style={{ marginTop: 14 }}>
            <BinParetoChart
              title={`${label} bin share — week`}
              periods={summary.binParetoWeekly || []}
              overall={summary.binsOverall || []}
            />
            <BinParetoChart
              title={`${label} bin share — month`}
              periods={summary.binParetoMonthly || []}
              overall={summary.binsOverall || []}
            />
          </section>
        </>
      )}
    </section>
  )
}
