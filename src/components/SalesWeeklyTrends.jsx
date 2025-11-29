// src/components/SalesWeeklyTrends.jsx
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
  startOfWeekLocal,
  addDays,
  ymdLocal,
  buildWeeklySkeleton,
  formatDayLabel,
} from '../utils/dateHelpers'

export default function SalesWeeklyTrends({ profile, locationId: propLocationId }) {
  const locationId = propLocationId ?? profile?.location_id ?? 'holladay-3900s'

  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const weekStart = useMemo(() => startOfWeekLocal(weekAnchor), [weekAnchor])
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])
  const weekLabel = `${weekStart.toLocaleDateString()} – ${weekEnd.toLocaleDateString()}`

  const [weeklySales, setWeeklySales] = useState(() =>
    buildWeeklySkeleton(weekStart),
  )
  const [loadingSales, setLoadingSales] = useState(true)
  const [salesError, setSalesError] = useState(null)

  // Load daily_sales_yoy rows for this week
  useEffect(() => {
    let cancelled = false

    async function loadWeeklySales() {
      if (!locationId) return

      setLoadingSales(true)
      setSalesError(null)

      try {
        const from = ymdLocal(weekStart)
        const to = ymdLocal(weekEnd)

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

        const skeleton = buildWeeklySkeleton(weekStart)
        const filled = skeleton.map(day => {
          const row = byDate.get(day.date)
          const thisYear =
            row && row.net_sales_this_year != null
              ? Number(row.net_sales_this_year)
              : null
          const lastYear =
            row && row.net_sales_last_year != null
              ? Number(row.net_sales_last_year)
              : null

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

          return {
            ...day,
            thisYear,
            lastYear,
            yoyPct,
          }
        })

        setWeeklySales(filled)
      } catch (err) {
        console.error('Failed to load weekly sales', err)
        setSalesError(err.message || String(err))
        setWeeklySales(buildWeeklySkeleton(weekStart))
      } finally {
        if (!cancelled) setLoadingSales(false)
      }
    }

    loadWeeklySales()
    return () => {
      cancelled = true
    }
  }, [locationId, weekStart, weekEnd])

  // Weekly stats (best/worst)
  const { bestSales, worstSales, bestPct, worstPct } = useMemo(() => {
    const withSales = weeklySales.filter(d => d.thisYear != null)
    const withPct = weeklySales.filter(d => d.yoyPct != null)

    const bestSales =
      withSales.length > 0
        ? withSales.reduce((a, b) => (b.thisYear > a.thisYear ? b : a))
        : null

    const worstSales =
      withSales.length > 0
        ? withSales.reduce((a, b) => (b.thisYear < a.thisYear ? b : a))
        : null

    const bestPct =
      withPct.length > 0
        ? withPct.reduce((a, b) => (b.yoyPct > a.yoyPct ? b : a))
        : null

    const worstPct =
      withPct.length > 0
        ? withPct.reduce((a, b) => (b.yoyPct < a.yoyPct ? b : a))
        : null

    return { bestSales, worstSales, bestPct, worstPct }
  }, [weeklySales])

  const shiftWeek = deltaWeeks => {
    setWeekAnchor(prev => {
    const start = startOfWeekLocal(prev)
    return addDays(start, deltaWeeks * 7)
})

  }

  const chartData = weeklySales.map(d => ({
    ...d,
    dayLabel: d.label,
  }))

  return (
    <div className="bg-white shadow rounded p-4 sm:p-6 mb-6">
      {/* Header + week controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-red-700">Weekly Sales (YoY)</h2>
          <p className="text-sm text-gray-600">
            Current year vs last year by day, plus YoY% change.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="px-3 py-1.5 rounded border text-sm"
          >
            ← Prev Week
          </button>
          <div className="text-sm text-gray-700 min-w-[8rem] text-center">
            {weekLabel}
          </div>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="px-3 py-1.5 rounded border text-sm"
          >
            Next Week →
          </button>
        </div>
      </div>

      {salesError && (
        <p className="text-xs text-red-700 mb-2">
          Error loading sales: {salesError}
        </p>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: This year vs last year sales */}
        <div className="h-64">
          <h3 className="text-sm font-medium text-gray-800 mb-2">
            Daily Sales — This Year vs Last Year
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dayLabel" />
              <YAxis
                tickFormatter={v =>
                  v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`
                }
              />
              <Tooltip
                formatter={(value, name) => [
                  typeof value === 'number' ? `$${value.toFixed(2)}` : value,
                  name === 'thisYear'
                    ? 'This Year'
                    : name === 'lastYear'
                    ? 'Last Year'
                    : name,
                ]}
                labelFormatter={(label, payload) => {
                  if (!payload?.[0]) return label
                  const item = payload[0].payload
                  return `${label} — ${formatDayLabel(item.date)}`
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="thisYear"
                name="This Year"
                stroke="#dc2626" // red
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="lastYear"
                name="Last Year"
                stroke="#6b7280" // gray
                strokeWidth={3}
                strokeDasharray="6 3"
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: YoY % change */}
        <div className="h-64">
          <h3 className="text-sm font-medium text-gray-800 mb-2">
            Daily YoY % Change
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dayLabel" />
              <YAxis
                tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
              />
              <Tooltip
                formatter={value => [
                  typeof value === 'number'
                    ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
                    : value,
                  'YoY %',
                ]}
                labelFormatter={(label, payload) => {
                  if (!payload?.[0]) return label
                  const item = payload[0].payload
                  return `${label} — ${formatDayLabel(item.date)}`
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="yoyPct"
                name="YoY %"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly summary tiles */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-800 mb-2">
          Weekly Highlights
        </h3>
        {loadingSales ? (
          <p className="text-xs text-gray-500">Loading weekly sales…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="border rounded p-3">
              <div className="text-gray-500 text-xs mb-1">
                Best sales day (this year)
              </div>
              {bestSales ? (
                <>
                  <div className="font-semibold">
                    ${bestSales.thisYear.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {formatDayLabel(bestSales.date)}
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-500">No data</div>
              )}
            </div>

            <div className="border rounded p-3">
              <div className="text-gray-500 text-xs mb-1">
                Worst sales day (this year)
              </div>
              {worstSales ? (
                <>
                  <div className="font-semibold">
                    ${worstSales.thisYear.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {formatDayLabel(worstSales.date)}
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-500">No data</div>
              )}
            </div>

            <div className="border rounded p-3">
              <div className="text-gray-500 text-xs mb-1">
                Highest YoY % change
              </div>
              {bestPct ? (
                <>
                  <div
                    className={`font-semibold ${
                      bestPct.yoyPct > 0 ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {bestPct.yoyPct > 0 ? '+' : ''}
                    {bestPct.yoyPct.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600">
                    {formatDayLabel(bestPct.date)}
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-500">No data</div>
              )}
            </div>

            <div className="border rounded p-3">
              <div className="text-gray-500 text-xs mb-1">
                Worst YoY % change
              </div>
              {worstPct ? (
                <>
                  <div
                    className={`font-semibold ${
                      worstPct.yoyPct > 0 ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {worstPct.yoyPct > 0 ? '+' : ''}
                    {worstPct.yoyPct.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600">
                    {formatDayLabel(worstPct.date)}
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-500">No data</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
