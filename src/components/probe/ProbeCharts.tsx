'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const BIN_COLORS: Record<number, string> = {
  1: '#1b8a5a',
  93: '#c23b3b',
  42: '#d4652f',
  14: '#7c3aed',
  3: '#0369a1',
}

function tipStyle() {
  return {
    background: '#0a2540',
    border: 'none',
    borderRadius: 8,
    fontSize: 12,
    fontFamily: 'IBM Plex Mono, monospace',
  }
}

export function ProbeDailyChart({
  data,
}: {
  data: Array<{ day: string; wafers: number; avgTtime: number }>
}) {
  return (
    <div className="probe-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(10,37,64,0.08)" strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: '#6b7f93' }}
            tickFormatter={(v) => String(v).slice(5)}
          />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6b7f93' }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: '#6b7f93' }}
          />
          <Tooltip contentStyle={tipStyle()} />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="wafers"
            name="Wafers"
            stroke="#0f8a7d"
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgTtime"
            name="Avg ttime"
            stroke="#0369a1"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ProbeBinChart({
  data,
}: {
  data: Array<{ bin: number; count: number }>
}) {
  const top = (data || []).slice(0, 10)
  return (
    <div className="probe-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={top} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            stroke="rgba(10,37,64,0.08)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis dataKey="bin" tick={{ fontSize: 11, fill: '#6b7f93' }} />
          <YAxis tick={{ fontSize: 11, fill: '#6b7f93' }} />
          <Tooltip contentStyle={tipStyle()} />
          <Bar dataKey="count" name="Die count" radius={[6, 6, 0, 0]}>
            {top.map((entry) => (
              <Cell key={entry.bin} fill={BIN_COLORS[entry.bin] || '#64748b'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
