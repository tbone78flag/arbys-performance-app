// src/components/SalesPeriodSummary.jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  startOfMonthLocal,
  endOfMonthLocal,
  startOfWeekLocal,
  addDays,
  ymdLocal,
} from '../utils/dateHelpers'

// Exported component used by SalesPage
export default function SalesPeriodSummary({ profile, locationId: propLocationId }) {
  const locationId = propLocationId ?? profile?.location_id ?? 'holladay-3900s'

  // Core period state
  const [periodAnchor, setPeriodAnchor] = useState(() => new Date())
  const [dailyRows, setDailyRows] = useState([]) // all days in month, with weekIndex
  const [weeks, setWeeks] = useState([])         // [{ weekIndex, label, yoyWeekPct }]
  const [periodSummary, setPeriodSummary] = useState(null)
  const [loadingPeriod, setLoadingPeriod] = useState(true)
  const [periodError, setPeriodError] = useState(null)

  // Export UI state
  const [exportType, setExportType] = useState('period') // 'week' | 'period' | 'week_and_period' | 'all'
  const [selectedWeek, setSelectedWeek] = useState('1')

  const periodStart = useMemo(
    () => startOfMonthLocal(periodAnchor),
    [periodAnchor]
  )
  const periodEnd = useMemo(
    () => endOfMonthLocal(periodAnchor),
    [periodAnchor]
  )
  const periodLabel = useMemo(
    () =>
      periodStart.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
    [periodStart]
  )

  // Load all days in this month
  useEffect(() => {
    let cancelled = false

    async function loadPeriod() {
      if (!locationId) return

      setLoadingPeriod(true)
      setPeriodError(null)

      try {
        const from = ymdLocal(periodStart)
        const to = ymdLocal(periodEnd)

        const { data, error } = await supabase
          .from('daily_sales_yoy')
          .select('sales_date, net_sales_this_year, net_sales_last_year')
          .eq('location_id', locationId)
          .gte('sales_date', from)
          .lte('sales_date', to)
          .order('sales_date', { ascending: true })

        if (cancelled) return
        if (error) throw error

        const byDate = new Map()
        ;(data || []).forEach(row => {
          byDate.set(row.sales_date, row)
        })

        // First week start (Mon) – may be in previous month
        const firstWeekStart = startOfWeekLocal(periodStart)

        const periodDays = []
        const weeksMap = new Map()

        let cursor = new Date(periodStart)
        while (cursor <= periodEnd) {
          const key = ymdLocal(cursor)
          const row = byDate.get(key)
          const thisYear =
            row && row.net_sales_this_year != null
              ? Number(row.net_sales_this_year)
              : null
          const lastYear =
            row && row.net_sales_last_year != null
              ? Number(row.net_sales_last_year)
              : null

          // Week index based on Monday-start weeks from firstWeekStart
          const diffDays = Math.floor(
            (cursor.getTime() - firstWeekStart.getTime()) / (1000 * 60 * 60 * 24)
          )
          const weekIndex = Math.floor(diffDays / 7) + 1

          let yoyPct = null
          if (
            thisYear != null &&
            lastYear != null &&
            Number.isFinite(thisYear) &&
            Number.isFinite(lastYear) &&
            lastYear !== 0
          ) {
            yoyPct = ((thisYear - lastYear) / lastYear) * 100
          }

          periodDays.push({
            date: key,
            weekIndex,
            thisYear,
            lastYear,
            yoyPct,
          })

          // Aggregate into week bucket
          if (!weeksMap.has(weekIndex)) {
            weeksMap.set(weekIndex, {
              weekIndex,
              totalThisYear: 0,
              totalLastYear: 0,
            })
          }
          const bucket = weeksMap.get(weekIndex)
          if (thisYear != null) bucket.totalThisYear += thisYear
          if (lastYear != null) bucket.totalLastYear += lastYear

          cursor = addDays(cursor, 1)
        }

        const weeksArr = Array.from(weeksMap.values())
          .sort((a, b) => a.weekIndex - b.weekIndex)
          .map(w => {
            let yoyWeekPct = null
            if (w.totalLastYear > 0) {
              yoyWeekPct =
                ((w.totalThisYear - w.totalLastYear) / w.totalLastYear) * 100
            }
            return {
              weekIndex: w.weekIndex,
              label: `Wk${w.weekIndex}`,
              yoyWeekPct,
            }
          })

        // Period totals
        const periodTotals = weeksArr.reduce(
          (acc, w) => {
            const bucket = weeksMap.get(w.weekIndex)
            acc.totalThisYear += bucket.totalThisYear
            acc.totalLastYear += bucket.totalLastYear
            return acc
          },
          { totalThisYear: 0, totalLastYear: 0 }
        )

        let periodYoyPct = null
        if (periodTotals.totalLastYear > 0) {
          periodYoyPct =
            ((periodTotals.totalThisYear - periodTotals.totalLastYear) /
              periodTotals.totalLastYear) * 100
        }

        setDailyRows(periodDays)
        setWeeks(weeksArr)
        setPeriodSummary({
          ...periodTotals,
          yoyPct: periodYoyPct,
        })
        if (weeksArr.length > 0) {
          setSelectedWeek(String(weeksArr[0].weekIndex))
        }
      } catch (err) {
        console.error('Failed to load period sales', err)
        setPeriodError(err.message || String(err))
        setDailyRows([])
        setWeeks([])
        setPeriodSummary(null)
      } finally {
        if (!cancelled) setLoadingPeriod(false)
      }
    }

    loadPeriod()
    return () => {
      cancelled = true
    }
  }, [locationId, periodStart, periodEnd])

  const periodChartData = weeks.map(w => ({ ...w }))
  const availableWeeks = weeks.map(w => w.weekIndex)

  const shiftMonth = delta => {
    setPeriodAnchor(prev => {
      const d = new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
      return d
    })
  }

  function buildCsvLine(cells) {
    return cells
      .map(value => {
        if (value == null) return ''
        const s = String(value)
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return `"${s.replace(/"/g, '""')}"`
        }
        return s
      })
      .join(',')
  }

  function handleExport() {
    if (!dailyRows.length) {
      alert('No data to export for this period.')
      return
    }

    const lines = []
    const periodSlug = `${periodStart.getFullYear()}-${String(
      periodStart.getMonth() + 1
    ).padStart(2, '0')}`

    const includeWeek =
      exportType === 'week' || exportType === 'week_and_period'
    const includeAllWeeks = exportType === 'all'
    const includePeriod =
      exportType === 'period' ||
      exportType === 'week_and_period' ||
      exportType === 'all'

    const targetWeekIndex = Number(selectedWeek)

    // Daily rows header
    lines.push(buildCsvLine(['Date', 'Week', 'ThisYear', 'LastYear', 'YoYPct']))

    const shouldIncludeDay = row => {
      if (includeAllWeeks || includePeriod) return true
      if (includeWeek && row.weekIndex === targetWeekIndex) return true
      return false
    }

    dailyRows.forEach(row => {
      if (!shouldIncludeDay(row)) return
      lines.push(
        buildCsvLine([
          row.date,
          `Wk${row.weekIndex}`,
          row.thisYear != null ? row.thisYear.toFixed(2) : '',
          row.lastYear != null ? row.lastYear.toFixed(2) : '',
          row.yoyPct != null ? row.yoyPct.toFixed(2) : '',
        ])
      )
    })

    // Summaries
    if (includeAllWeeks || includePeriod || includeWeek) {
      lines.push('')
      lines.push(
        buildCsvLine([
          'SummaryType',
          'Label',
          'TotalThisYear',
          'TotalLastYear',
          'YoYPct',
        ])
      )

      if (includeAllWeeks) {
        weeks.forEach(w => {
          const bucket = dailyRows.filter(d => d.weekIndex === w.weekIndex)
          const totals = bucket.reduce(
            (acc, d) => {
              if (d.thisYear != null) acc.totalThisYear += d.thisYear
              if (d.lastYear != null) acc.totalLastYear += d.lastYear
              return acc
            },
            { totalThisYear: 0, totalLastYear: 0 }
          )
          const yoy =
            totals.totalLastYear > 0
              ? ((totals.totalThisYear - totals.totalLastYear) /
                  totals.totalLastYear) *
                100
              : null

          lines.push(
            buildCsvLine([
              'Week',
              `Wk${w.weekIndex}`,
              totals.totalThisYear.toFixed(2),
              totals.totalLastYear.toFixed(2),
              yoy != null ? yoy.toFixed(2) : '',
            ])
          )
        })
      } else if (includeWeek) {
        const bucket = dailyRows.filter(d => d.weekIndex === targetWeekIndex)
        const totals = bucket.reduce(
          (acc, d) => {
            if (d.thisYear != null) acc.totalThisYear += d.thisYear
            if (d.lastYear != null) acc.totalLastYear += d.lastYear
            return acc
          },
          { totalThisYear: 0, totalLastYear: 0 }
        )
        const yoy =
          totals.totalLastYear > 0
            ? ((totals.totalThisYear - totals.totalLastYear) /
                totals.totalLastYear) *
              100
            : null

        lines.push(
          buildCsvLine([
            'Week',
            `Wk${targetWeekIndex}`,
            totals.totalThisYear.toFixed(2),
            totals.totalLastYear.toFixed(2),
            yoy != null ? yoy.toFixed(2) : '',
          ])
        )
      }

      if (includePeriod && periodSummary) {
        lines.push(
          buildCsvLine([
            'Period',
            periodLabel,
            periodSummary.totalThisYear.toFixed(2),
            periodSummary.totalLastYear.toFixed(2),
            periodSummary.yoyPct != null
              ? periodSummary.yoyPct.toFixed(2)
              : '',
          ])
        )
      }
    }

    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales_period_${periodSlug}_${exportType}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white shadow rounded p-4 sm:p-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-red-700">
            Period Sales % by Week
          </h3>
          <p className="text-sm text-gray-600">
            Monthly view of weekly sales % vs last year (Wk1–Wk5).
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Month controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-2 py-1 rounded border text-xs"
              onClick={() => shiftMonth(-1)}
            >
              ← Prev Month
            </button>
            <div className="text-sm text-gray-700 min-w-[8rem] text-center">
              {periodLabel}
            </div>
            <button
              type="button"
              className="px-2 py-1 rounded border text-xs"
              onClick={() => shiftMonth(1)}
            >
              Next Month →
            </button>
          </div>

          {/* Export controls */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="border rounded px-2 py-1 text-xs"
              value={exportType}
              onChange={e => setExportType(e.target.value)}
            >
              <option value="week">Export specific week only</option>
              <option value="period">Export period only</option>
              <option value="week_and_period">Export week + period</option>
              <option value="all">
                Export all weeks in period + period
              </option>
            </select>

            {(exportType === 'week' ||
              exportType === 'week_and_period') &&
              availableWeeks.length > 0 && (
                <select
                  className="border rounded px-2 py-1 text-xs"
                  value={selectedWeek}
                  onChange={e => setSelectedWeek(e.target.value)}
                >
                  {availableWeeks.map(w => (
                    <option key={w} value={w}>
                      Wk{w}
                    </option>
                  ))}
                </select>
              )}

            <button
              type="button"
              className="bg-red-600 text-white px-3 py-1.5 rounded text-xs hover:bg-red-700"
              onClick={handleExport}
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {periodError && (
        <p className="text-xs text-red-700 mb-2">
          Error loading period data: {periodError}
        </p>
      )}

      <div className="h-56">
        {loadingPeriod ? (
          <p className="text-xs text-gray-500">Loading period data…</p>
        ) : weeks.length === 0 ? (
          <p className="text-xs text-gray-500">No data for this month.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={periodChartData}
              margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis
                tickFormatter={v =>
                  `${v > 0 ? '+' : ''}${v.toFixed(0)}%`
                }
              />
              <Tooltip
                formatter={value => [
                  typeof value === 'number'
                    ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
                    : value,
                  'Weekly YoY %',
                ]}
                labelFormatter={label => `${label} — ${periodLabel}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="yoyWeekPct"
                name="Weekly YoY %"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {periodSummary && (
        <div className="mt-4 text-xs text-gray-600">
          <div>
            Period total this year:{' '}
            <span className="font-semibold">
              ${periodSummary.totalThisYear.toFixed(2)}
            </span>
          </div>
          <div>
            Period total last year:{' '}
            <span className="font-semibold">
              ${periodSummary.totalLastYear.toFixed(2)}
            </span>
          </div>
          <div>
            Period YoY:%{' '}
            <span
              className={`font-semibold ${
                periodSummary.yoyPct > 0
                  ? 'text-green-700'
                  : periodSummary.yoyPct < 0
                  ? 'text-red-700'
                  : ''
              }`}
            >
              {periodSummary.yoyPct != null
                ? `${periodSummary.yoyPct > 0 ? '+' : ''}${periodSummary.yoyPct.toFixed(
                    1
                  )}%`
                : 'N/A'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
