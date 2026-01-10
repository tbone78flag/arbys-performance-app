import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { ymdLocal } from '../utils/dateHelpers'

export function BeefVarianceEntry({
  locationId,
  profile,
  weekStart,
  weekLabel,
  onPrevWeek,
  onNextWeek,
}) {
  const [beefLbs, setBeefLbs] = useState('')
  const [beefPct, setBeefPct] = useState('')
  const [savingBeef, setSavingBeef] = useState(false)
  const [beefMsg, setBeefMsg] = useState(null)

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-gray-700">{weekLabel}</div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded border text-sm"
            onClick={onPrevWeek}
          >
            ← Prev
          </button>
          <button
            className="px-3 py-1.5 rounded border text-sm"
            onClick={onNextWeek}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Weekly variance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <div className="flex items-center gap-3">
        <button
          onClick={saveBeefVariance}
          disabled={savingBeef || !canEdit}
          className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
        >
          {savingBeef ? 'Saving…' : 'Save Week Variance'}
        </button>
        {beefMsg && (
          <span className="text-sm text-gray-700">{beefMsg}</span>
        )}
      </div>
    </div>
  )
}
