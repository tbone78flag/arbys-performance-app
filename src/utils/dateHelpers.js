const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function startOfWeekLocal(d = new Date()) {
  const day = d.getDay() // 0..6 (Sun..Sat)
  const diff = (day + 6) % 7 // Mon=0, Tue=1, …, Sun=6
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - diff)
  return start
}

export function parseYmdLocal(ymdStr) {
  if (!ymdStr) return new Date();
  const [y, m, d] = ymdStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export function formatDayLabel(ymdStr) {
  const d = parseYmdLocal(ymdStr)
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function ymdLocal(date) {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function buildWeeklySkeleton(weekStart) {
  const days = []
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i)
    days.push({
      date: ymdLocal(date),
      label: DOW[i],
      thisYear: null,
      lastYear: null,
      yoyPct: null,
    })
  }
  return days
}

export function formatDayLabel(dateStr) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
  })
}

export function startOfMonthLocal(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfMonthLocal(date) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  d.setHours(0, 0, 0, 0)
  return d
}
