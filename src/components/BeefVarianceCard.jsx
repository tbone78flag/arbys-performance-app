import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { ymdLocal } from '../utils/dateHelpers'

export function BeefVarianceCard({
  locationId,
  profile,
  weekStart,
  weekLabel,
  onPrevWeek,
  onNextWeek,
}) {
  const [beefLbs, setBeefLbs] = useState('') // string input, e.g., "-16.5"
  const [beefPct, setBeefPct] = useState('')
  const [savingBeef, setSavingBeef] = useState(false)
  const [beefMsg, setBeefMsg] = useState(null)

  // Pricing settings (location_settings)
  const [beefCost, setBeefCost] = useState('') // $/lb
  const [pClassic, setPClassic] = useState('') // profit per classic RB
  const [pDouble, setPDouble] = useState('') // profit per double RB
  const [pHalf, setPHalf] = useState('') // profit per half-pound RB
  const [savingBeefPricing, setSavingBeefPricing] = useState(false)

  const canEdit =
    profile &&
    ['General Manager', 'Assistant Manager'].includes(profile.title)

  // Load this week's variance row
  useEffect(() => {
    if (!locationId) return

    let cancelled = false

    ;(async () => {
      const ws = ymdLocal(weekStart)
      const { data, error } = await supabase
        .from('beef_variance_weekly')
        .select('lbs_delta, pct_delta')
        .eq('location_id', locationId)
        .eq('week_start', ws)
        .single()

      if (cancelled) return

      if (!error && data) {
        setBeefLbs(String(data.lbs_delta ?? ''))
        setBeefPct(String(data.pct_delta ?? ''))
      } else {
        setBeefLbs('')
        setBeefPct('')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [locationId, weekStart])

  // Load pricing keys (once)
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const keys = [
        'beef_cost_per_lb',
        'profit_rb_classic',
        'profit_rb_double',
        'profit_rb_half',
      ]
      const { data, error } = await supabase
        .from('location_settings')
        .select('key, value')
        .eq('location_id', 'default')
        .in('key', keys)

      if (cancelled) return
      if (error) {
        console.error('Failed to load pricing', error)
        return
      }

      const map = Object.fromEntries(
        (data ?? []).map((r) => [r.key, r.value])
      )

      if (map.beef_cost_per_lb != null)
        setBeefCost(String(map.beef_cost_per_lb))
      if (map.profit_rb_classic != null)
        setPClassic(String(map.profit_rb_classic))
      if (map.profit_rb_double != null)
        setPDouble(String(map.profit_rb_double))
      if (map.profit_rb_half != null)
        setPHalf(String(map.profit_rb_half))
    })()

    return () => {
      cancelled = true
    }
  }, [])

  async function saveBeefVariance() {
    if (!canEdit) return
    setSavingBeef(true)
    setBeefMsg(null)

    try {
      const ws = ymdLocal(weekStart)
      const payload = {
        location_id: locationId,
        week_start: ws,
        lbs_delta: beefLbs === '' ? 0 : Number(beefLbs),
        pct_delta: beefPct === '' ? null : Number(beefPct),
        updated_by: profile.id,
      }

      const { error } = await supabase
        .from('beef_variance_weekly')
        .upsert(payload, {
          onConflict: ['location_id', 'week_start'],
        })

      if (error) throw error

      setBeefMsg('Saved beef variance for this week.')
    } catch (e) {
      console.error('Save beef variance failed', e)
      setBeefMsg(`Save failed: ${e.message || e}`)
    } finally {
      setSavingBeef(false)
    }
  }

  async function saveBeefPricing() {
    if (!canEdit) return
    setSavingBeefPricing(true)

    try {
      const rows = [
        { key: 'beef_cost_per_lb', value: Number(beefCost || 0) },
        { key: 'profit_rb_classic', value: Number(pClassic || 0) },
        { key: 'profit_rb_double', value: Number(pDouble || 0) },
        { key: 'profit_rb_half', value: Number(pHalf || 0) },
      ].map((r) => ({
        location_id: 'default',
        ...r,
        updated_by: profile.id,
      }))

      const { error } = await supabase
        .from('location_settings')
        .upsert(rows, { onConflict: ['location_id', 'key'] })

      if (error) throw error
    } catch (error) {
      console.error('Save pricing failed', error)
    } finally {
      setSavingBeefPricing(false)
    }
  }

  return (
    <div className="bg-white shadow rounded p-4 sm:p-6">
      <h2 className="font-semibold text-red-700 mb-3">
        Beef Variance &amp; Pricing
      </h2>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-sm text-gray-700">{weekLabel}</div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded border"
            onClick={onPrevWeek}
          >
            ← Prev
          </button>
          <button
            className="px-3 py-1.5 rounded border"
            onClick={onNextWeek}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Weekly variance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Beef variance (lbs)
          </label>
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={beefLbs}
            onChange={(e) => setBeefLbs(e.target.value)}
            className="border rounded px-2 py-1 w-36"
            placeholder="-16.5"
          />
          <p className="text-xs text-gray-500 mt-1">
            Negative = short; Positive = over.
          </p>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Beef variance (%)
          </label>
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={beefPct}
            onChange={(e) => setBeefPct(e.target.value)}
            className="border rounded px-2 py-1 w-28"
            placeholder="-3.2"
          />
        </div>
      </div>

      <button
        onClick={saveBeefVariance}
        disabled={savingBeef || !canEdit}
        className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
      >
        {savingBeef ? 'Saving…' : 'Save Week Variance'}
      </button>
      {beefMsg && (
        <span className="ml-3 text-sm text-gray-700">{beefMsg}</span>
      )}

      <hr className="my-5" />

      {/* Pricing keys */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Beef cost ($/lb)
          </label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            className="border rounded px-2 py-1 w-28"
            value={beefCost}
            onChange={(e) => setBeefCost(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Profit / Classic RB
          </label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            className="border rounded px-2 py-1 w-28"
            value={pClassic}
            onChange={(e) => setPClassic(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Profit / Double RB
          </label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            className="border rounded px-2 py-1 w-28"
            value={pDouble}
            onChange={(e) => setPDouble(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Profit / Half-Pound RB
          </label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            className="border rounded px-2 py-1 w-28"
            value={pHalf}
            onChange={(e) => setPHalf(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={saveBeefPricing}
        disabled={savingBeefPricing || !canEdit}
        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {savingBeefPricing ? 'Saving…' : 'Save Pricing'}
      </button>
    </div>
  )
}
