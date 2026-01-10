import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { ymdLocal, addDays } from '../../utils/dateHelpers'

const DAYPARTS = [
  { key: '10am', label: '10 AM' },
  { key: '2pm', label: '2 PM' },
  { key: '5pm', label: '5 PM' },
  { key: 'close', label: 'Close' },
]

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function BeefVarianceDaypart({
  locationId,
  profile,
  weekStart,
  weekLabel,
  onPrevWeek,
  onNextWeek,
}) {
  // Form structure: { '10am': [{ lbs: '', pct: '' }, ...7 days], ... }
  const emptyForm = useMemo(() => {
    const form = {}
    DAYPARTS.forEach(({ key }) => {
      form[key] = Array(7)
        .fill(null)
        .map(() => ({ lbs: '', pct: '' }))
    })
    return form
  }, [])

  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const canEdit =
    profile &&
    ['General Manager', 'Assistant Manager'].includes(profile.title)

  // Check if any data exists
  const hasData = useMemo(() => {
    return DAYPARTS.some(({ key }) =>
      form[key].some((day) => day.lbs !== '' || day.pct !== '')
    )
  }, [form])

  // Load week data
  useEffect(() => {
    if (!locationId || !weekStart) return

    let cancelled = false

    const loadWeek = async () => {
      setLoading(true)
      setMessage(null)

      const weekEnd = addDays(weekStart, 6)
      const { data, error } = await supabase
        .from('beef_variance_daypart')
        .select('variance_date, daypart, lbs_delta, pct_delta')
        .eq('location_id', locationId)
        .gte('variance_date', ymdLocal(weekStart))
        .lte('variance_date', ymdLocal(weekEnd))

      if (cancelled) return

      if (error) {
        console.error('Load failed', error)
        setMessage(`Load failed: ${error.message}`)
        setLoading(false)
        return
      }

      // Build date index map
      const dateToIdx = {}
      for (let i = 0; i < 7; i++) {
        dateToIdx[ymdLocal(addDays(weekStart, i))] = i
      }

      // Create fresh form
      const newForm = {}
      DAYPARTS.forEach(({ key }) => {
        newForm[key] = Array(7)
          .fill(null)
          .map(() => ({ lbs: '', pct: '' }))
      })

      // Fill in data
      if (data) {
        data.forEach((row) => {
          const idx = dateToIdx[row.variance_date]
          if (idx != null && newForm[row.daypart]) {
            newForm[row.daypart][idx] = {
              lbs: row.lbs_delta != null ? String(row.lbs_delta) : '',
              pct: row.pct_delta != null ? String(row.pct_delta) : '',
            }
          }
        })
      }

      setForm(newForm)
      setLoading(false)
    }

    loadWeek()
    return () => {
      cancelled = true
    }
  }, [locationId, weekStart])

  const handleChange = (daypart, dayIdx, field, value) => {
    setForm((prev) => {
      const newForm = { ...prev }
      newForm[daypart] = [...prev[daypart]]
      newForm[daypart][dayIdx] = {
        ...prev[daypart][dayIdx],
        [field]: value,
      }
      return newForm
    })
  }

  const saveVariance = async () => {
    if (!canEdit) return
    setSaving(true)
    setMessage(null)

    try {
      const payload = []

      for (let i = 0; i < 7; i++) {
        const dateStr = ymdLocal(addDays(weekStart, i))
        for (const { key } of DAYPARTS) {
          const cell = form[key][i]
          // Only include if at least one field has data
          if (cell.lbs !== '' || cell.pct !== '') {
            payload.push({
              location_id: locationId,
              variance_date: dateStr,
              daypart: key,
              lbs_delta: cell.lbs === '' ? null : Number(cell.lbs),
              pct_delta: cell.pct === '' ? null : Number(cell.pct),
              updated_by: profile.id,
            })
          }
        }
      }

      if (payload.length === 0) {
        setMessage('No variance data to save.')
        setSaving(false)
        return
      }

      const { error } = await supabase
        .from('beef_variance_daypart')
        .upsert(payload, { onConflict: 'location_id,variance_date,daypart' })

      if (error) throw error

      setMessage('Variance saved for this week.')
    } catch (err) {
      console.error('Save failed', err)
      setMessage(`Save failed: ${err.message || err}`)
    } finally {
      setSaving(false)
    }
  }

  // Clear message after timeout
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 4000)
    return () => clearTimeout(t)
  }, [message])

  return (
    <div className="space-y-4">
      {/* Week navigation */}
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
        {loading && <span className="text-xs text-gray-500">Loading...</span>}
      </div>

      {/* Variance grid by daypart */}
      <div className="space-y-4">
        {DAYPARTS.map(({ key, label }) => (
          <fieldset key={key} className="border rounded p-3">
            <legend className="text-sm font-medium px-1">{label}</legend>

            {/* Day headers */}
            <div className="grid grid-cols-8 gap-1 text-xs text-gray-500 mt-2">
              <div></div>
              {DOW.map((d) => (
                <div key={d} className="text-center">
                  {d}
                </div>
              ))}
            </div>

            {/* Lbs row */}
            <div className="grid grid-cols-8 gap-1 mt-1 items-center">
              <div className="text-xs text-gray-600 text-right pr-1">Lbs</div>
              {DOW.map((_, i) => (
                <input
                  key={`lbs-${i}`}
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={form[key][i].lbs}
                  onChange={(e) => handleChange(key, i, 'lbs', e.target.value)}
                  className="border rounded px-1 py-1 text-xs text-center w-full"
                  placeholder="0"
                />
              ))}
            </div>

            {/* Pct row */}
            <div className="grid grid-cols-8 gap-1 mt-1 items-center">
              <div className="text-xs text-gray-600 text-right pr-1">%</div>
              {DOW.map((_, i) => (
                <input
                  key={`pct-${i}`}
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={form[key][i].pct}
                  onChange={(e) => handleChange(key, i, 'pct', e.target.value)}
                  className="border rounded px-1 py-1 text-xs text-center w-full"
                  placeholder="0"
                />
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={saveVariance}
          disabled={saving || !canEdit || !hasData}
          className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Week Variance'}
        </button>
        {message && (
          <span
            className={`text-sm ${
              message.includes('failed') ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {message}
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Enter the variance (lbs and %) from the back office for each daypart.
        Negative = short, Positive = over.
      </p>
    </div>
  )
}
