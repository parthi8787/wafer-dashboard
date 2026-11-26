'use client'

import type { CSSProperties, ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/** Distinct spectrum for fail-bin series (teal → blue → violet → warm). */
const BIN_PALETTE = [
  '#0f766e',
  '#1d4ed8',
  '#7c3aed',
  '#c026d3',
  '#e11d48',
  '#ea580c',
  '#ca8a04',
  '#65a30d',
  '#0891b2',
  '#4338ca',
]

function tipStyle(): CSSProperties {
  return {
    background: '#0a2540',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    fontFamily: 'IBM Plex Mono, monospace',
    color: '#ffffff',
  }
}

const tipLabelStyle: CSSProperties = { color: '#ffffff' }
const tipItemStyle: CSSProperties = { color: '#ffffff' }

type TrendPoint = {
  key: string
  label: string
  wafers: number
  yieldPct: number
  avgTtime: number
}

export function YieldTrendChart({
  data,
  title,
}: {
  data: TrendPoint[]
  title: string
}) {
  return (
    <div className="panel panel-pad">
      <h2 className="panel-title">{title}</h2>
      <p className="panel-sub">
        Yield % = pass ÷ yield-eligible dies (SDS: all dies; SDT/SDE: dies − bin 93) · bars =
        wafers
      </p>
      <div className="probe-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(10,37,64,0.08)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7f93' }} />
            <YAxis
              yAxisId="yield"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#6b7f93' }}
              label={{
                value: 'Yield %',
                angle: -90,
                position: 'insideLeft',
                fill: '#6b7f93',
                fontSize: 11,
              }}
            />
            <YAxis
              yAxisId="wafers"
              orientation="right"
              tick={{ fontSize: 11, fill: '#6b7f93' }}
              label={{
                value: 'Wafers',
                angle: 90,
                position: 'insideRight',
                fill: '#6b7f93',
                fontSize: 11,
              }}
            />
            <Tooltip
              contentStyle={tipStyle()}
              labelStyle={tipLabelStyle}
              itemStyle={tipItemStyle}
              formatter={(value, name) => {
                if (name === 'Yield %' && typeof value === 'number') {
                  return [`${value.toFixed(1)}%`, name]
                }
                return [value, name]
              }}
            />
            <Legend />
            <Bar
              yAxisId="wafers"
              dataKey="wafers"
              name="Wafers tested"
              fill="#94a3b8"
              radius={[4, 4, 0, 0]}
              opacity={0.55}
            />
            <Line
              yAxisId="yield"
              type="monotone"
              dataKey="yieldPct"
              name="Yield %"
              stroke="#1b8a5a"
              strokeWidth={2.5}
              dot={{ r: 4 }}
            >
              <LabelList
                dataKey="yieldPct"
                position="top"
                offset={8}
                formatter={(v) =>
                  v == null || Number.isNaN(Number(v)) ? '' : `${Number(v).toFixed(1)}%`
                }
                style={{
                  fill: '#1b8a5a',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'IBM Plex Mono, monospace',
                }}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

type ParetoPeriod = {
  key: string
  label: string
  dies?: number
  yieldDenom?: number
  pass?: number
  bins: Array<{ bin: number; count: number }>
}

type TipEntry = {
  name?: string
  value?: number | string
  color?: string
  dataKey?: string | number
}

/** Tooltip rows sorted high % → low %. */
function SortedPctTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean
  label?: string | number
  payload?: TipEntry[]
}): ReactNode {
  if (!active || !payload?.length) return null
  const rows = [...payload]
    .filter((p) => p.value != null && Number(p.value) > 0)
    .map((p) => ({
      name: String(p.name ?? p.dataKey ?? ''),
      value: Number(p.value),
      color: p.color || '#fff',
    }))
    .sort((a, b) => b.value - a.value)

  return (
    <div style={{ ...tipStyle(), padding: '10px 12px', minWidth: 140 }}>
      <div style={{ marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {rows.map((r) => (
        <div
          key={r.name}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            marginTop: 3,
            color: '#fff',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: r.color,
                flexShrink: 0,
              }}
            />
            {r.name}
          </span>
          <span style={{ fontWeight: 600 }}>{r.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Stacked bin share by period (% of yieldDenom).
 * Bin 1 % matches the yield trend; tooltip lists bins high % → low %.
 */
export function BinParetoChart({
  periods,
  overall,
  title,
}: {
  periods: ParetoPeriod[]
  overall: Array<{ bin: number; count: number }>
  title: string
}) {
  const topBinIds = overall.slice(0, 10).map((b) => b.bin)
  const binColor = (id: number, i: number) =>
    id === 1 ? '#1b8a5a' : BIN_PALETTE[i % BIN_PALETTE.length]

  const trendRows = periods.map((p) => {
    const denom =
      p.yieldDenom && p.yieldDenom > 0
        ? p.yieldDenom
        : p.bins.reduce((s, b) => s + b.count, 0) || 1
    const row: Record<string, string | number> = { label: p.label }
    topBinIds.forEach((id) => {
      const count =
        id === 1 && p.pass != null
          ? p.pass
          : p.bins.find((b) => b.bin === id)?.count || 0
      row[`bin_${id}`] = (100 * count) / denom
    })
    return row
  })

  if (!trendRows.length || !topBinIds.length) {
    return (
      <div className="panel panel-pad">
        <h2 className="panel-title">{title}</h2>
        <div className="empty">No bin data for current filters.</div>
      </div>
    )
  }

  return (
    <div className="panel panel-pad">
      <h2 className="panel-title">{title}</h2>
      <p className="panel-sub">
        Top 10 bins as % of yield-eligible dies (Bin 1 matches yield) · bin 93 excluded ·
        tooltip sorted high → low
      </p>
      <div className="probe-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trendRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid
              stroke="rgba(10,37,64,0.08)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7f93' }} />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#6b7f93' }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={<SortedPctTooltip />} />
            <Legend />
            {topBinIds.map((id, i) => (
              <Bar
                key={id}
                dataKey={`bin_${id}`}
                name={id === 1 ? 'Bin 1 (pass)' : `Bin ${id}`}
                stackId="a"
                fill={binColor(id, i)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
