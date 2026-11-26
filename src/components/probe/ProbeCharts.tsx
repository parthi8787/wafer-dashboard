'use client'

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

const BIN_PALETTE = [
  '#c23b3b',
  '#d4652f',
  '#b45309',
  '#7c3aed',
  '#0369a1',
  '#be185d',
  '#4d7c0f',
  '#0f766e',
  '#334155',
  '#a16207',
]

function tipStyle() {
  return {
    background: '#0a2540',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    fontFamily: 'IBM Plex Mono, monospace',
  }
}

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
      <p className="panel-sub">Yield % (labeled) and wafers tested by period</p>
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
  bins: Array<{ bin: number; count: number }>
}

/** Flatten period bin lists into a chart-friendly top-10 series for the latest/overall view. */
export function BinParetoChart({
  periods,
  overall,
  title,
}: {
  periods: ParetoPeriod[]
  overall: Array<{ bin: number; count: number }>
  title: string
}) {
  const chartData = overall.map((b, i) => ({
    bin: String(b.bin),
    count: b.count,
    fill: BIN_PALETTE[i % BIN_PALETTE.length],
  }))

  // Build stacked/grouped trend for top bins across periods
  const topBinIds = overall.slice(0, 5).map((b) => b.bin)
  const trendRows = periods.map((p) => {
    const row: Record<string, string | number> = { label: p.label }
    for (const id of topBinIds) {
      const hit = p.bins.find((b) => b.bin === id)
      row[`bin_${id}`] = hit?.count || 0
    }
    return row
  })

  return (
    <div className="panel panel-pad">
      <h2 className="panel-title">{title}</h2>
      <p className="panel-sub">Top 10 fail bins (excludes pass bin 1) · count of die</p>
      <div className="probe-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid
              stroke="rgba(10,37,64,0.08)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis dataKey="bin" tick={{ fontSize: 11, fill: '#6b7f93' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7f93' }} />
            <Tooltip contentStyle={tipStyle()} />
            <Bar dataKey="count" name="Die count" radius={[6, 6, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.bin} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {trendRows.length > 1 && topBinIds.length > 0 && (
        <>
          <h3 className="panel-title" style={{ marginTop: 18, fontSize: '0.95rem' }}>
            Top fail bins by period
          </h3>
          <div className="probe-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid
                  stroke="rgba(10,37,64,0.08)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7f93' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7f93' }} />
                <Tooltip contentStyle={tipStyle()} />
                <Legend />
                {topBinIds.map((id, i) => (
                  <Bar
                    key={id}
                    dataKey={`bin_${id}`}
                    name={`Bin ${id}`}
                    stackId="a"
                    fill={BIN_PALETTE[i % BIN_PALETTE.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
