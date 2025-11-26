import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import BingoGame from '../components/BingoGame'
import CashControl from '../components/CashControl'
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

// --- Week / date helpers (Monday-start) ---
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function startOfWeekLocal(d = new Date()) {
  const day = d.getDay() // 0..6 (Sun..Sat)
  const diff = (day + 6) % 7 // Mon=0, Tue=1, …, Sun=6
  const start = new Date(d)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - diff)
  return start
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function ymdLocal(date) {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function buildWeeklySkeleton(weekStart) {
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

function formatDayLabel(dateStr) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'numeric',
    day: 'numeric',
  })
}

// --- Weekly Sales (YoY) charts + summary ---
function SalesTrendsSection({ profile }) {
  const locationId = profile?.location_id ?? 'holladay-3900s'

  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const weekStart = useMemo(() => startOfWeekLocal(weekAnchor), [weekAnchor])
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])
  const weekLabel = `${weekStart.toLocaleDateString()} – ${weekEnd.toLocaleDateString()}`

  const [weeklySales, setWeeklySales] = useState(() => buildWeeklySkeleton(weekStart))
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
        ;(data || []).forEach((row) => {
          byDate.set(row.sales_date, row)
        })

        const skeleton = buildWeeklySkeleton(weekStart)
        const filled = skeleton.map((day) => {
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
    const withSales = weeklySales.filter((d) => d.thisYear != null)
    const withPct = weeklySales.filter((d) => d.yoyPct != null)

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

  const shiftWeek = (deltaWeeks) => {
    setWeekAnchor((prev) => addDays(prev, deltaWeeks * 7))
  }

  const chartData = weeklySales.map((d) => ({
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
                tickFormatter={(v) =>
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
                stroke="#dc2626"          // 🔴 red (Arby’s theme)
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
                connectNulls
              />

              <Line
                type="monotone"
                dataKey="lastYear"
                name="Last Year"
                stroke="#6b7280"          // ⚪ gray (neutral)
                strokeWidth={3}
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
                tickFormatter={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
              />
              <Tooltip
                formatter={(value) => [
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
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
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

// --- Existing What If Calculator ---
function WhatIfCalculator({ profile, locationId = 'default' }) {
  const [averageCheck, setAverageCheck] = useState(0)
  const [raise, setRaise] = useState('')
  const [transactionsPerDay, setTransactionsPerDay] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const { data: avgData, error } = await supabase
        .from('location_settings')
        .select('value')
        .eq('location_id', locationId)
        .eq('key', 'average_check')
        .single()

      if (!error && avgData) setAverageCheck(Number(avgData.value))
      setLoading(false)
    }
    load()
  }, [profile, locationId])

  if (loading) return <div className="p-4">Loading calculator…</div>

  const r = parseFloat(raise) || 0
  const t = parseInt(transactionsPerDay, 10) || 0
  const additionalPerYear = r * t * 365

  return (
    <div className="bg-white shadow rounded p-4 sm:p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">What If Calculator</h2>

      {/* Mobile-first form layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Average Check</label>
          <input
            type="number"
            step="0.01"
            value={averageCheck}
            disabled
            className="w-full border px-3 py-2 rounded bg-gray-50 text-gray-700"
          />
          <p className="text-xs text-gray-500 mt-1">From location settings</p>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Add-On Amount ($)</label>
          <input
            type="number"
            step="0.01"
            value={raise}
            onChange={e => setRaise(e.target.value)}
            onFocus={e => e.target.select()}
            inputMode="decimal"
            className="w-full border px-3 py-2 rounded"
            placeholder="0.50"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Transactions / Day</label>
          <input
            type="number"
            value={transactionsPerDay}
            onChange={e => setTransactionsPerDay(e.target.value)}
            onFocus={e => e.target.select()}
            inputMode="numeric"
            pattern="[0-9]*"
            className="w-full border px-3 py-2 rounded"
            placeholder="200"
          />
        </div>

        <div className="flex flex-col justify-end">
          <div className="text-sm text-gray-600 mb-1">Projected Annual Increase</div>
          <div className="text-2xl font-bold">
            $
            {additionalPerYear.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed">
        Tip: pick a realistic number of upsells per day (e.g., 10). Then enter the add-on (e.g., $2.59 for one turnover).
        That’s how you translate small wins into annual sales impact.
      </p>

      <p className="mt-2 text-sm italic">
        *Check out the speed page to see impact from increasing transactions with the current average check.
      </p>

      <button
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mt-4"
        onClick={() => navigate('/speed')}
      >
        Speed Page
      </button>
    </div>
  )
}

export default function SalesPage({ profile }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile) navigate('/')
  }, [profile, navigate])

  return (
    // mx-auto centers, px-* protects on phones, max-w keeps it readable
    <div className="w-full max-w-3xl mx-auto bg-white shadow p-4 sm:p-6 rounded px-4 sm:px-6">
      {/* Header row */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-red-700">Sales Dashboard</h1>

        <button
          className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-red-700 shrink-0"
          onClick={() => navigate('/App')}
          aria-label="Go back"
        >
          Go Back
        </button>
      </div>

      {/* NEW: Weekly YoY charts + summary */}
      <SalesTrendsSection profile={profile} />

      <WhatIfCalculator profile={profile} />

      {profile?.role === 'manager' && (
        <div className="border-t pt-4 mt-4">
          <h2 className="text-lg font-semibold text-red-600">Manager Tools</h2>
          <p>Only visible to managers — e.g. target goals, override entries, etc.</p>

          <CashControl />
        </div>
      )}
    </div>
  )
}
