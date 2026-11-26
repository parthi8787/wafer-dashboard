'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type HwRow = {
  key: string
  dimension: string
  tested: number
  fails: number
  failRate: number
  topClassBin: string
}

interface Props {
  tester: HwRow[]
  testSite: HwRow[]
  handler: HwRow[]
  chamber: HwRow[]
  prober: HwRow[]
  dimension: 'tester' | 'testSite' | 'handler' | 'chamber' | 'prober'
  onDimension: (d: Props['dimension']) => void
}

const LABELS: Record<Props['dimension'], string> = {
  tester: 'Tester',
  testSite: 'Test site',
  handler: 'Handler',
  chamber: 'Chamber',
  prober: 'Prober',
}

export function HardwarePanel({
  tester,
  testSite,
  handler,
  chamber,
  prober,
  dimension,
  onDimension,
}: Props) {
  const dataMap = { tester, testSite, handler, chamber, prober }
  const rows = dataMap[dimension]
  const chartData = rows.map((r) => ({
    name: r.key,
    failRate: +r.failRate.toFixed(2),
    fails: r.fails,
    tested: r.tested,
  }))

  return (
    <div>
      <div className="probe-chip-row" style={{ marginBottom: 12 }}>
        {(Object.keys(LABELS) as Array<Props['dimension']>).map((k) => (
          <button
            key={k}
            type="button"
            className={`probe-chip ${dimension === k ? 'active' : ''}`}
            onClick={() => onDimension(k)}
          >
            {LABELS[k]}
          </button>
        ))}
      </div>

      <div className="ba-hw-grid">
        <div className="chart-wrap" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,37,64,0.08)" />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                unit="%"
                domain={[0, 'auto']}
              />
              <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0a2540', border: 'none', color: '#fff' }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#fff' }}
                formatter={(v, name, item) => {
                  const p = item?.payload as {
                    fails: number
                    tested: number
                    failRate: number
                  }
                  if (name === 'failRate') {
                    return [`${v}% (${p.fails}/${p.tested})`, 'Fail rate']
                  }
                  return [v, name]
                }}
              />
              <Bar dataKey="failRate" fill="#c47a12" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="ba-table-wrap">
          <table className="ba-table">
            <thead>
              <tr>
                <th>{LABELS[dimension]}</th>
                <th>Tested</th>
                <th>Fails</th>
                <th>Fail %</th>
                <th>Top class bin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="mono">{r.key}</td>
                  <td className="mono">{r.tested.toLocaleString()}</td>
                  <td className="mono">{r.fails.toLocaleString()}</td>
                  <td className="mono">{r.failRate.toFixed(1)}%</td>
                  <td>{r.topClassBin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
