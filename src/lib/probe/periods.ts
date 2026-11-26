/** ISO week key: YYYY-Www (week starts Monday). */
export function weekKeyFromDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`)
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function monthKeyFromDay(day: string): string {
  return day.slice(0, 7)
}

export function quarterKeyFromDay(day: string): string {
  const year = Number(day.slice(0, 4))
  const month = Number(day.slice(5, 7))
  const q = Math.ceil(month / 3)
  return `${year}-Q${q}`
}

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-')
  const month = MONTH_SHORT[Number(m) - 1] || m
  return `${month}'${y.slice(2)}`
}

export function formatWeekLabel(key: string): string {
  // 2026-W47 -> W47'26
  const [y, w] = key.split('-W')
  return `W${w}'${y.slice(2)}`
}

export function formatQuarterLabel(key: string): string {
  // 2026-Q4 -> Q4'26
  const [y, q] = key.split('-')
  return `${q}'${y.slice(2)}`
}
