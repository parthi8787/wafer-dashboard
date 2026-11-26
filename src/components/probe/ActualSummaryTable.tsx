'use client'

type PeriodCol = {
  key: string
  label: string
  kind: 'month' | 'quarter' | 'week'
  wafers: number
  yieldPct: number
  avgTtime: number
}

function fmtNum(n: number, digits = 1) {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

export function ActualSummaryTable({
  title,
  columns,
}: {
  title: string
  columns: PeriodCol[]
}) {
  if (!columns.length) {
    return (
      <div className="actual-wrap">
        <div className="actual-banner">{title}</div>
        <div className="empty">No period data for current filters.</div>
      </div>
    )
  }

  return (
    <div className="actual-wrap">
      <div className="actual-banner">{title}</div>
      <div className="actual-scroll">
        <table className="actual-table">
          <thead>
            <tr>
              <th className="actual-corner" />
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={c.kind === 'quarter' ? 'actual-q' : 'actual-period'}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th className="actual-row-label">Avg TT</th>
              {columns.map((c) => (
                <td key={`${c.key}-tt`} className="actual-tt">
                  {fmtNum(c.avgTtime, 1)}
                </td>
              ))}
            </tr>
            <tr>
              <th className="actual-row-label">Yield</th>
              {columns.map((c) => (
                <td key={`${c.key}-y`} className="actual-yield">
                  {fmtNum(c.yieldPct, 1)}%
                </td>
              ))}
            </tr>
            <tr>
              <th className="actual-row-label">Wafers</th>
              {columns.map((c) => (
                <td key={`${c.key}-w`} className="actual-wafers">
                  {c.wafers.toLocaleString()}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="actual-note">
        Avg TT = mean ttime on good bin (curibin 1) only · Yield = pass die / total die
      </p>
    </div>
  )
}
