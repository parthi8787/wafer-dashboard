'use client'

type PeriodCol = {
  key: string
  label: string
  kind: 'month' | 'quarter' | 'week'
  wafers: number
  yieldPct: number
  avgTtime: number
  tpName?: string
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
  showTp = false,
}: {
  title: string
  columns: PeriodCol[]
  showTp?: boolean
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
            {showTp && (
              <tr>
                <th className="actual-row-label">TP name</th>
                {columns.map((c) => (
                  <td key={`${c.key}-tp`} className="actual-tp" title={c.tpName || ''}>
                    {c.tpName || '—'}
                  </td>
                ))}
              </tr>
            )}
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
        Avg TT = mean ttime on good bin (curibin 1) only · Yield = pass ÷ yield-eligible
        dies · SDT/SDE exclude bin 93 (prior-flow bin-out); SDS counts all dies
        {showTp ? ' · TP name = test program (prgnm)' : ''}
      </p>
    </div>
  )
}
