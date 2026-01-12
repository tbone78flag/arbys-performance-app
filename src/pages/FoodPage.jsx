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
  const [pricing, setPricing] = useState({
    beefCostPerLb: 0,
    classic: { menuPrice: 0, foodCost: 0 },
    double: { menuPrice: 0, foodCost: 0 },
    half_lb: { menuPrice: 0, foodCost: 0 },
  })
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

      // 2) pricing keys - fetch new sandwich pricing settings
      const { data: ks } = await supabase
        .from('location_settings')
        .select('key, value')
        .eq('location_id', 'default')
        .in('key', [
          'beef_cost_per_lb',
          'sandwich_classic_price',
          'sandwich_classic_cost',
          'sandwich_double_price',
          'sandwich_double_cost',
          'sandwich_half_lb_price',
          'sandwich_half_lb_cost',
        ])

      if (cancelled) return

      setVariance(v ?? null)
      const map = Object.fromEntries((ks ?? []).map((r) => [r.key, Number(r.value) || 0]))
      setPricing({
        beefCostPerLb: map.beef_cost_per_lb || 0,
        classic: {
          menuPrice: map.sandwich_classic_price || 0,
          foodCost: map.sandwich_classic_cost || 0,
        },
        double: {
          menuPrice: map.sandwich_double_price || 0,
          foodCost: map.sandwich_double_cost || 0,
        },
        half_lb: {
          menuPrice: map.sandwich_half_lb_price || 0,
          foodCost: map.sandwich_half_lb_cost || 0,
        },
      })
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [locationId, weekStart])

  // Calculate profit per sandwich (menuPrice - foodCost)
  const getProfit = (sandwichKey) => {
    const sw = pricing[sandwichKey]
    if (sw.menuPrice > 0 && sw.foodCost > 0) {
      return sw.menuPrice - sw.foodCost
    }
    return 0
  }

  // Calculate summary values
  const lbs = variance ? Math.abs(Number(variance.lbs_delta || 0)) : 0
  const varianceSign = variance
    ? Number(variance.lbs_delta || 0) < 0
      ? 'short'
      : Number(variance.lbs_delta || 0) > 0
        ? 'over'
        : 'even'
    : null
  const costLost = lbs * (pricing.beefCostPerLb || 0)
  const ounces = lbs * 16
  const classicCount = ounces / 3

  // Calculate potential profit lost based on sandwich profit
  const classicProfit = getProfit('classic')
  const potentialProfitLost = classicCount * classicProfit

  const getVarianceColor = () => {
    if (!variance || variance.lbs_delta == null) return 'text-gray-500'
    const val = Number(variance.lbs_delta)
    if (val < 0) return 'text-red-600'
    if (val > 0) return 'text-amber-600'
    return 'text-green-600'
  }

  // Check if pricing is configured
  const hasPricingConfigured = classicProfit > 0

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
              <p className="text-xs text-gray-500 uppercase tracking-wide">Beef Cost</p>
              <p className="text-lg font-semibold text-gray-900">
                {loading ? '...' : variance ? money(costLost) : '—'}
              </p>
              <p className="text-xs text-gray-500">raw product cost</p>
            </div>
          </div>
        </div>

        {/* Potential Profit Lost Card */}
        <div className="bg-white shadow rounded p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <span className="text-lg">📉</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Profit Impact</p>
              <p className="text-lg font-semibold text-gray-900">
                {loading ? '...' : variance && hasPricingConfigured ? money(potentialProfitLost) : '—'}
              </p>
              <p className="text-xs text-gray-500">
                {hasPricingConfigured ? `~${Math.round(classicCount)} Classic RBs` : 'configure pricing'}
              </p>
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

              const costLostVal = lbsVal * (pricing.beefCostPerLb || 0)

              // Calculate profit lost per sandwich type
              const classicProfitPer = getProfit('classic')
              const doubleProfitPer = getProfit('double')
              const halfProfitPer = getProfit('half_lb')

              const profitLostClassic = classicCountVal * classicProfitPer
              const profitLostDouble = doubleCount * doubleProfitPer
              const profitLostHalf = halfCount * halfProfitPer

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
                      {classicProfitPer > 0 ? (
                        <div className="text-green-600">Profit lost: {money(profitLostClassic)}</div>
                      ) : (
                        <div className="text-gray-400 text-xs">Set pricing in Settings</div>
                      )}
                    </div>
                    <div className="bg-white rounded border p-2">
                      <div className="font-semibold">Double RB (6 oz)</div>
                      <div>Count: {doubleCount.toFixed(0)}</div>
                      {doubleProfitPer > 0 ? (
                        <div className="text-green-600">Profit lost: {money(profitLostDouble)}</div>
                      ) : (
                        <div className="text-gray-400 text-xs">Set pricing in Settings</div>
                      )}
                    </div>
                    <div className="bg-white rounded border p-2">
                      <div className="font-semibold">Half-Pound RB (8 oz)</div>
                      <div>Count: {halfCount.toFixed(0)}</div>
                      {halfProfitPer > 0 ? (
                        <div className="text-green-600">Profit lost: {money(profitLostHalf)}</div>
                      ) : (
                        <div className="text-gray-400 text-xs">Set pricing in Settings</div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-red-50 rounded p-2 border border-red-200">
                      <div className="text-gray-700">Raw beef cost</div>
                      <div className="font-semibold">{money(costLostVal)}</div>
                      <div className="text-xs text-gray-500">
                        @ ${pricing.beefCostPerLb?.toFixed?.(2) ?? pricing.beefCostPerLb}/lb
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded p-2 border border-amber-200">
                      <div className="text-gray-700">Profit impact (Classic RB basis)</div>
                      <div className="font-semibold">
                        {classicProfitPer > 0 ? money(profitLostClassic) : '—'}
                      </div>
                      {classicProfitPer > 0 ? (
                        <div className="text-xs text-gray-500">
                          ${classicProfitPer.toFixed(2)} profit × {classicCountVal.toFixed(0)} sandwiches
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          Configure sandwich pricing in Settings
                        </div>
                      )}
                    </div>
                  </div>

                  {!hasPricingConfigured && (
                    <div className="bg-blue-50 rounded p-3 border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Tip:</strong> Set up sandwich pricing in Settings to see accurate profit impact calculations.
                        Enter the menu price and food cost for each sandwich type.
                      </p>
                      <button
                        onClick={() => navigate('/settings')}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Go to Settings →
                      </button>
                    </div>
                  )}
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
