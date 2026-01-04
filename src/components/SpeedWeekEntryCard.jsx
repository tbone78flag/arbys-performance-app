import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { ymdLocal, addDays } from '../utils/dateHelpers'

const DAYPARTS = [
  { key: 'lunch',      label: 'Lunch (11a–2p)' },
  { key: 'afternoon',  label: 'Afternoon (2p–5p)' },
  { key: 'dinner',     label: 'Dinner (5p–8p)' },
  { key: 'late_night', label: 'Late Night (8p–close)' },
]

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function SpeedWeekEntryCard({
  locationId,
  weekStart,
  weekEnd,
  weekLabel,
  onPrevWeek,
  onNextWeek,
}) {
  // form = { lunch:[7], afternoon:[7], dinner:[7], late_night:[7] }
  const emptyRow = useMemo(() => Array(7).fill(''), [])
  const emptyForm = useMemo(
    () => ({
      lunch: Array(7).fill(''),
      afternoon: Array(7).fill(''),
      dinner: Array(7).fill(''),
      late_night: Array(7).fill(''),
    }),
    []
  )

  const [form, setForm] = useState(emptyForm)
  const hasData = useMemo(
    () => DAYPARTS.some(({ key }) => form[key].some((v) => v !== '')),
    [form]
  )

  const [loadingSpeed, setLoadingSpeed] = useState(false)
  const [savingSpeed, setSavingSpeed] = useState(false)
  const [speedMsg, setSpeedMsg] = useState(null)

  // Load current week of speed_dayparts → prefill the form
  useEffect(() => {
    if (!locationId) return

    let cancelled = false

    const loadWeek = async () => {
      setLoadingSpeed(true)
      setSpeedMsg(null)

      const { data, error } = await supabase
        .from('speed_dayparts')
        .select('day, daypart, avg_time_seconds')
        .eq('location_id', locationId)
        .eq('service', 'drive_thru')
        .gte('day', ymdLocal(weekStart))
        .lte('day', ymdLocal(weekEnd))

      if (cancelled) return

      if (error) {
        console.error('Load failed', error)
        setSpeedMsg(`Load failed: ${error.message}`)
      } else {
        // Build label map YYYY-MM-DD -> dow index
        const dowIndexByYMD = {}
        for (let i = 0; i < 7; i++) {
          const d = addDays(weekStart, i)
          dowIndexByYMD[ymdLocal(d)] = i // 0..6 (Mon..Sun)
        }

        const next = {
          lunch: [...emptyRow],
          afternoon: [...emptyRow],
          dinner: [...emptyRow],
          late_night: [...emptyRow],
        }

        for (const r of Array.isArray(data) ? data : []) {
          const idx = dowIndexByYMD[r.day]
          if (idx == null || !next[r.daypart]) continue
          next[r.daypart][idx] = String(r.avg_time_seconds ?? '')
        }

        setForm(next)
      }

      setLoadingSpeed(false)
    }

    loadWeek()
    return () => {
      cancelled = true
    }
  }, [locationId, weekStart, weekEnd, emptyRow])

  // handlers
  const handleChange = (partKey, dowIdx, value) => {
    setForm((prev) => {
      const copy = { ...prev, [partKey]: [...prev[partKey]] }
      copy[partKey][dowIdx] = value.replace(/[^\d]/g, '') // digits only
      return copy
    })
  }

  const saveSpeedWeek = async () => {
    setSavingSpeed(true)
    setSpeedMsg(null)

    try {
      const payload = []

      for (let i = 0; i < 7; i++) {
        const dayStr = ymdLocal(addDays(weekStart, i))
        for (const { key } of DAYPARTS) {
          const raw = form[key][i]
          if (raw === '' || raw == null) continue
          const seconds = parseInt(raw, 10)
          if (!Number.isFinite(seconds) || seconds < 0) continue
          payload.push({
            location_id: locationId,
            service: 'drive_thru',
            day: dayStr,
            daypart: key,
            avg_time_seconds: seconds,
            sample_size: 0, // optional for now
          })
        }
      }

      if (payload.length === 0) {
        setSpeedMsg('Nothing to save.')
        setSavingSpeed(false)
        return
      }

      const { error } = await supabase
        .from('speed_dayparts')
        .upsert(payload, { onConflict: ['location_id', 'day', 'daypart'] })

      if (error) throw error

      setSpeedMsg('Saved this week’s speeds.')
    } catch (err) {
      console.error('Save failed', err)
      setSpeedMsg(`Save failed: ${err.message || err}`)
    } finally {
      setSavingSpeed(false)
    }
  }

  // Speed message timeout
  useEffect(() => {
    if (!speedMsg) return
    const t = setTimeout(() => setSpeedMsg(null), 4000)
    return () => clearTimeout(t)
  }, [speedMsg])

  return (
    <div className="bg-white shadow rounded p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="font-semibold text-red-700">
          Drive-Thru Speed — Week Entry
        </h2>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded border"
            onClick={onPrevWeek}
            aria-label="Previous week"
          >
            ← Prev
          </button>
          <div className="text-sm text-gray-700 min-w-[12ch] text-center">
            {weekLabel}
          </div>
          <button
            className="px-3 py-1.5 rounded border"
            onClick={onNextWeek}
            aria-label="Next week"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">
          Enter average seconds for each daypart
        </span>
        {loadingSpeed && (
          <span
            className="text-xs text-gray-500"
            aria-live="polite"
          >
            Syncing…
          </span>
        )}
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6"
        aria-busy={loadingSpeed ? 'true' : 'false'}
      >
        {DAYPARTS.map(({ key, label }) => (
          <fieldset key={key} className="border rounded p-3">
            <legend className="text-sm font-medium">{label}</legend>

            {/* Day labels */}
            <div className="grid grid-cols-7 gap-2 text-xs text-gray-500 mt-2">
              {DOW.map((d) => (
                <div key={d} className="text-center">
                  {d}
                </div>
              ))}
            </div>

            {/* Inputs Mon..Sun */}
            <div className="grid grid-cols-7 gap-2 mt-1">
              {DOW.map((_, i) => (
                <input
                  key={i}
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={form[key][i]}
                  onChange={(e) => handleChange(key, i, e.target.value)}
                  className="border rounded px-2 py-1 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="sec"
                  aria-label={`${label} ${DOW[i]}`}
                />
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={saveSpeedWeek}
          disabled={savingSpeed || !hasData}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
        >
          {savingSpeed ? 'Saving…' : 'Save Week'}
        </button>
        {speedMsg && (
          <div
            aria-live="polite"
            className={`text-sm ${
              speedMsg.startsWith('Saved')
                ? 'text-green-700'
                : 'text-amber-700'
            }`}
          >
            {speedMsg}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Tip: Enter whole-second averages. The Speed page reads this table by
        week and location and updates automatically after save.
      </p>
    </div>
  )
}
