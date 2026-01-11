// src/pages/FoodPage.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import DayDots from '../components/DayDots'
import DayDotsManagerCard from '../components/DayDotsManagerCard'

export default function FoodPage({ profile }) {
  const navigate = useNavigate()
  const [dayDotsOpen, setDayDotsOpen] = useState(false)
  const [dayDotsManagerOpen, setDayDotsManagerOpen] = useState(false)

  useEffect(() => {
    if (!profile) {
      navigate('/')
    }
  }, [profile, navigate])

  const locationId = profile?.location_id ?? 'holladay-3900'

  // Monday-start week helpers (local date math)
  function startOfWeekLocal(d = new Date()) {
    const day = d.getDay() // 0..6 (Sun..Sat)
    const diff = (day + 6) % 7 // Mon=0
    const s = new Date(d)
    s.setHours(0, 0, 0, 0)
    s.setDate(s.getDate() - diff)
    return s
  }
  function addDays(date, n) {
    const d = new Date(date)
    d.setDate(d.getDate() + n)
    return d
  }
  function ymdLocal(date) {
    const y = date.getFullYear(),
      m = String(date.getMonth() + 1).padStart(2, '0'),
      d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  function money(n) {
    return Number.isFinite(n)
      ? n.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
      : '—'
  }

  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const weekStart = useMemo(() => startOfWeekLocal(weekAnchor), [weekAnchor])
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])

  const [variance, setVariance] = useState(null) // { lbs_delta, pct_delta }
  const [pricing, setPricing] = useState({ cost: 0, pClassic: 0, pDouble: 0, pHalf: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      // 1) weekly variance
      const { data: v } = await supabase
        .from('beef_variance_weekly')
        .select('lbs_delta, pct_delta')
        .eq('location_id', locationId)
        .eq('week_start', ymdLocal(weekStart))
        .maybeSingle()

      // 2) pricing keys
      const { data: ks } = await supabase
        .from('location_settings')
        .select('key, value')
        .eq('location_id', 'default')
        .in('key', ['beef_cost_per_lb', 'profit_rb_classic', 'profit_rb_double', 'profit_rb_half'])

      if (cancelled) return

      setVariance(v ?? null)
      const map = Object.fromEntries((ks ?? []).map((r) => [r.key, Number(r.value)]))
      setPricing({
        cost: map.beef_cost_per_lb || 0,
        pClassic: map.profit_rb_classic || 0,
        pDouble: map.profit_rb_double || 0,
        pHalf: map.profit_rb_half || 0,
      })
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [locationId, weekStart])

  // Calculate summary values
  const lbs = variance ? Math.abs(Number(variance.lbs_delta || 0)) : 0
  const varianceSign = variance
    ? Number(variance.lbs_delta || 0) < 0
      ? 'short'
      : Number(variance.lbs_delta || 0) > 0
        ? 'over'
        : 'even'
    : null
  const costLost = lbs * (pricing.cost || 0)
  const ounces = lbs * 16
  const classicCount = ounces / 3

  const getVarianceColor = () => {
    if (!variance || variance.lbs_delta == null) return 'text-gray-500'
    const val = Number(variance.lbs_delta)
    if (val < 0) return 'text-red-600'
    if (val > 0) return 'text-amber-600'
    return 'text-green-600'
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-red-700">Food Dashboard</h1>
          <button
            className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-red-700 shrink-0"
            onClick={() => navigate('/App')}
            aria-label="Go back"
          >
            Go Back
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Week Beef Variance Card */}
        <div className="bg-white shadow rounded p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <span className="text-lg">🥩</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Week Variance</p>
              <p className={`text-lg font-semibold ${getVarianceColor()}`}>
                {loading ? '...' : variance ? `${variance.lbs_delta} lbs` : '—'}
              </p>
              {!loading && varianceSign && (
                <p className="text-xs text-gray-500">{varianceSign}</p>
              )}
            </div>
          </div>
        </div>

        {/* Product Cost Lost Card */}
        <div className="bg-white shadow rounded p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <span className="text-lg">💰</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Cost Impact</p>
              <p className="text-lg font-semibold text-gray-900">
                {loading ? '...' : variance ? money(costLost) : '—'}
              </p>
              <p className="text-xs text-gray-500">product cost</p>
            </div>
          </div>
        </div>

        {/* Equivalent Classic RBs Card */}
        <div className="bg-white shadow rounded p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <span className="text-lg">🍔</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Equiv. Classic RBs</p>
              <p className="text-lg font-semibold text-gray-900">
                {loading ? '...' : variance ? Math.round(classicCount) : '—'}
              </p>
              <p className="text-xs text-gray-500">sandwiches (3 oz)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white shadow rounded p-4 sm:p-6">
        {/* Week Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="text-sm text-gray-700">
            Week: {weekStart.toLocaleDateString()} – {weekEnd.toLocaleDateString()}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded border hover:bg-gray-50"
              onClick={() => setWeekAnchor(addDays(weekStart, -1))}
            >
              ← Prev
            </button>
            <button
              className="px-3 py-1.5 rounded border hover:bg-gray-50"
              onClick={() => setWeekAnchor(addDays(weekEnd, 1))}
            >
              Next →
            </button>
          </div>
        </div>

        {/* Beef usage summary */}
        <div className="bg-gray-50 rounded border p-4 sm:p-6 mb-4">
          <h2 className="text-lg font-semibold mb-2">Beef Usage (Variance)</h2>
          {!variance ? (
            <p className="text-sm text-gray-600">
              No beef variance saved for this week yet (enter it on the Manager page).
            </p>
          ) : (
            (() => {
              const lbsVal = Math.abs(Number(variance.lbs_delta || 0))
              const sign =
                Number(variance.lbs_delta || 0) < 0
                  ? 'short'
                  : Number(variance.lbs_delta || 0) > 0
                    ? 'over'
                    : 'even'
              const pct =
                variance.pct_delta == null ? '—' : `${Number(variance.pct_delta).toFixed(1)}%`

              const roasts = lbsVal / 10
              const ouncesVal = lbsVal * 16

              const classicCountVal = ouncesVal / 3
              const doubleCount = ouncesVal / 6
              const halfCount = ouncesVal / 8

              const costLostVal = lbsVal * (pricing.cost || 0)
              const revClassic = classicCountVal * (pricing.pClassic || 0)
              const revDouble = doubleCount * (pricing.pDouble || 0)
              const revHalf = halfCount * (pricing.pHalf || 0)

              return (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-white rounded p-2 border">
                      <div className="text-gray-600">Variance (lbs)</div>
                      <div className="font-semibold">
                        {variance.lbs_delta} lbs ({sign})
                      </div>
                    </div>
                    <div className="bg-white rounded p-2 border">
                      <div className="text-gray-600">Variance (%)</div>
                      <div className="font-semibold">{pct}</div>
                    </div>
                    <div className="bg-white rounded p-2 border">
                      <div className="text-gray-600">Roasts (10 lb)</div>
                      <div className="font-semibold">{roasts.toFixed(2)}</div>
                    </div>
                    <div className="bg-white rounded p-2 border">
                      <div className="text-gray-600">Ounces</div>
                      <div className="font-semibold">{ouncesVal.toFixed(1)} oz</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="bg-white rounded border p-2">
                      <div className="font-semibold">Classic RB (3 oz)</div>
                      <div>Count: {classicCountVal.toFixed(0)}</div>
                      <div>Potential profit: {money(revClassic)}</div>
                    </div>
                    <div className="bg-white rounded border p-2">
                      <div className="font-semibold">Double RB (6 oz)</div>
                      <div>Count: {doubleCount.toFixed(0)}</div>
                      <div>Potential profit: {money(revDouble)}</div>
                    </div>
                    <div className="bg-white rounded border p-2">
                      <div className="font-semibold">Half-Pound RB (8 oz)</div>
                      <div>Count: {halfCount.toFixed(0)}</div>
                      <div>Potential profit: {money(revHalf)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-red-50 rounded p-2 border border-red-200">
                      <div className="text-gray-700">Product cost lost</div>
                      <div className="font-semibold">{money(costLostVal)}</div>
                      <div className="text-xs text-gray-500">
                        Based on beef cost ${pricing.cost?.toFixed?.(2) ?? pricing.cost}/lb
                      </div>
                    </div>
                    <div className="bg-green-50 rounded p-2 border border-green-200">
                      <div className="text-gray-700">Max potential profit (by item)</div>
                      <div className="text-xs text-gray-600">
                        See totals above per sandwich type.
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()
          )}
        </div>

        {/* Day Dots Check Accordion */}
        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setDayDotsOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            aria-expanded={dayDotsOpen}
          >
            <div className="flex flex-col">
              <span className="font-medium">Day Dots Check</span>
              <span className="text-xs text-gray-500">
                Check each section for items that need day dots printed.
              </span>
            </div>
            <span className={`transform transition-transform ${dayDotsOpen ? 'rotate-90' : ''}`}>
              ▶
            </span>
          </button>

          {dayDotsOpen && (
            <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
              <DayDots locationId={locationId} />
            </div>
          )}
        </div>

        {/* Manager-only section */}
        {(profile?.role === 'manager' || profile?.role === 'MANAGER') && (
          <div className="border-t pt-4 mt-4">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Manager Tools</h2>
            <p className="text-sm text-gray-600 mb-4">Only visible to managers.</p>

            {/* Day Dots Manager Accordion */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setDayDotsManagerOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={dayDotsManagerOpen}
              >
                <div className="flex flex-col">
                  <span className="font-medium">Day Dots Manager</span>
                  <span className="text-xs text-gray-500">
                    Configure food items that need day dots and their sections.
                  </span>
                </div>
                <span
                  className={`transform transition-transform ${dayDotsManagerOpen ? 'rotate-90' : ''}`}
                >
                  ▶
                </span>
              </button>

              {dayDotsManagerOpen && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                  <DayDotsManagerCard locationId={locationId} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
