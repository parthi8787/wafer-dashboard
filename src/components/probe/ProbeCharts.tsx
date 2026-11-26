'use client'

import type { CSSProperties } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

/**
 * Top bar = die counts summed over the full filtered range (binsOverall).
 * Stacked trend = each period’s bin share of that period’s yieldDenom
 * (same base as yield → Bin 1 % matches the yield trend).
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
  const overallTotal = overall.reduce((s, b) => s + b.count, 0) || 1
  const chartData = overall.map((b, i) => ({
    bin: String(b.bin),
    count: b.count,
    pct: (100 * b.count) / overallTotal,
    fill: b.bin === 1 ? '#1b8a5a' : BIN_PALETTE[i % BIN_PALETTE.length],
  }))

  const topBinIds = overall.slice(0, 5).map((b) => b.bin)
  const binColor = (id: number, i: number) =>
    id === 1 ? '#1b8a5a' : BIN_PALETTE[i % BIN_PALETTE.length]

  const trendRows = periods.map((p) => {
    const denom =
      p.yieldDenom && p.yieldDenom > 0
        ? p.yieldDenom
        : p.bins.reduce((s, b) => s + b.count, 0) || 1
    const row: Record<string, string | number> = { label: p.label }
    let shown = 0
    topBinIds.forEach((id) => {
      const count =
        id === 1 && p.pass != null
          ? p.pass
          : p.bins.find((b) => b.bin === id)?.count || 0
      const pct = (100 * count) / denom
      row[`bin_${id}`] = pct
      shown += pct
    })
    row.other = Math.max(0, 100 - shown)
    return row
  })

  return (
    <div className="panel panel-pad">
      <h2 className="panel-title">{title}</h2>
      <p className="panel-sub">
        Top chart = die totals for the filtered range (bin 93 excluded) · Stacked = % of
        yield-eligible dies per period (Bin 1 matches yield trend)
      </p>
      <div className="probe-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid
              stroke="rgba(10,37,64,0.08)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis dataKey="bin" tick={{ fontSize: 11, fill: '#6b7f93' }} />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7f93' }}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              contentStyle={tipStyle()}
              labelStyle={tipLabelStyle}
              itemStyle={tipItemStyle}
              formatter={(value, name, item) => {
                const payload = item?.payload as { count?: number; pct?: number } | undefined
                if (payload?.count != null && payload?.pct != null) {
                  return [
                    `${payload.count.toLocaleString()} (${payload.pct.toFixed(1)}%)`,
                    'Die',
                  ]
                }
                return [value, name]
              }}
              labelFormatter={(label) => `Bin ${label}`}
            />
            <Bar dataKey="count" name="Die count" radius={[6, 6, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.bin} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {trendRows.length > 0 && topBinIds.length > 0 && (
        <>
          <h3 className="panel-title" style={{ marginTop: 18, fontSize: '0.95rem' }}>
            Top bins by period
          </h3>
          <p className="panel-sub" style={{ marginTop: -8 }}>
            % of period dies (not renormalized to top-5 only) · Other = remaining bins
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
                <Tooltip
                  contentStyle={tipStyle()}
                  labelStyle={tipLabelStyle}
                  itemStyle={tipItemStyle}
                  formatter={(value, name) => {
                    const n = typeof value === 'number' ? value : Number(value)
                    return [`${n.toFixed(1)}%`, name]
                  }}
                />
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
                <Bar dataKey="other" name="Other" stackId="a" fill="#cbd5e1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
