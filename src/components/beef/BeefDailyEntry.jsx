import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { ymdLocal, addDays, parseYmdLocal } from '../../utils/dateHelpers'

const ALL_DAYPARTS = [
  { key: '10am', label: '10 AM' },
  { key: '2pm', label: '2 PM' },
  { key: '5pm', label: '5 PM' },
  { key: 'close', label: 'Close' },
]

export function BeefDailyEntry({ locationId, profile }) {
  const [entryDate, setEntryDate] = useState(() => ymdLocal(new Date()))
  const [form, setForm] = useState(() => createEmptyForm())
  const [countType, setCountType] = useState('daily')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [enabledDayparts, setEnabledDayparts] = useState(['close']) // default

  const canEdit =
    profile &&
    ['General Manager', 'Assistant Manager'].includes(profile.title)

  // Check if selected date is a Sunday
  const selectedDate = parseYmdLocal(entryDate)
  const isSunday = selectedDate.getDay() === 0

  // Filter dayparts based on location settings
  const activeDayparts = useMemo(() => {
    return ALL_DAYPARTS.filter(({ key }) => enabledDayparts.includes(key))
  }, [enabledDayparts])

  function createEmptyForm() {
    const empty = {}
    ALL_DAYPARTS.forEach(({ key }) => {
      empty[key] = {
        cases: '',
        roasts: '',
        lbs: '',
        varianceLbs: '',
        variancePct: '',
      }
    })
    return empty
  }

  // Load location settings for dayparts
  useEffect(() => {
    if (!locationId) return

    const loadSettings = async () => {
      const { data, error } = await supabase
        .from('location_settings')
        .select('value')
        .eq('location_id', 'default')
        .eq('key', 'beef_dayparts')
        .single()

      if (!error && data?.value) {
        try {
          const parsed = typeof data.value === 'string'
            ? JSON.parse(data.value)
            : data.value
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEnabledDayparts(parsed)
          }
        } catch {
          // Keep default
        }
      }
    }

    loadSettings()
  }, [locationId])

  // Load data for selected date
  useEffect(() => {
    if (!locationId) return

    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      setMessage(null)

      // Fetch both counts and variance in parallel
      const [countsRes, varianceRes] = await Promise.all([
        supabase
          .from('beef_counts_daily')
          .select('daypart, cases, roasts, lbs, count_type')
          .eq('location_id', locationId)
          .eq('count_date', entryDate),
        supabase
          .from('beef_variance_daypart')
          .select('daypart, lbs_delta, pct_delta')
          .eq('location_id', locationId)
          .eq('variance_date', entryDate),
      ])

      if (cancelled) return

      if (countsRes.error) {
        console.error('Load counts failed', countsRes.error)
        setMessage(`Load failed: ${countsRes.error.message}`)
        setLoading(false)
        return
      }

      if (varianceRes.error) {
        console.error('Load variance failed', varianceRes.error)
        setMessage(`Load failed: ${varianceRes.error.message}`)
        setLoading(false)
        return
      }

      const newForm = createEmptyForm()
      let foundCountType = 'daily'

      // Fill in counts
      if (countsRes.data && countsRes.data.length > 0) {
        countsRes.data.forEach((row) => {
          if (newForm[row.daypart]) {
            newForm[row.daypart].cases = row.cases != null ? String(row.cases) : ''
            newForm[row.daypart].roasts = row.roasts != null ? String(row.roasts) : ''
            newForm[row.daypart].lbs = row.lbs != null ? String(row.lbs) : ''
          }
          if (row.count_type) {
            foundCountType = row.count_type
          }
        })
      }

      // Fill in variance
      if (varianceRes.data && varianceRes.data.length > 0) {
        varianceRes.data.forEach((row) => {
          if (newForm[row.daypart]) {
            newForm[row.daypart].varianceLbs = row.lbs_delta != null ? String(row.lbs_delta) : ''
            newForm[row.daypart].variancePct = row.pct_delta != null ? String(row.pct_delta) : ''
          }
        })
      }

      setForm(newForm)
      setCountType(foundCountType)
      setLoading(false)
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [locationId, entryDate])

  const shiftDate = (days) => {
    const d = parseYmdLocal(entryDate)
    if (Number.isNaN(d.getTime())) return
    const shifted = addDays(d, days)
    setEntryDate(ymdLocal(shifted))
  }

  const handleChange = (daypart, field, value) => {
    setForm((prev) => ({
      ...prev,
      [daypart]: {
        ...prev[daypart],
        [field]: value,
      },
    }))
  }

  const saveAll = async () => {
    if (!canEdit) return
    setSaving(true)
    setMessage(null)

    try {
      const countsPayload = []
      const variancePayload = []

      // Only save for enabled dayparts
      for (const { key } of activeDayparts) {
        const row = form[key]

        // Counts - only include if at least one count field has data
        if (row.cases !== '' || row.roasts !== '' || row.lbs !== '') {
          countsPayload.push({
            location_id: locationId,
            count_date: entryDate,
            daypart: key,
            cases: row.cases === '' ? null : Number(row.cases),
            roasts: row.roasts === '' ? null : Number(row.roasts),
            lbs: row.lbs === '' ? null : Number(row.lbs),
            count_type: isSunday ? countType : 'daily',
            updated_by: profile.id,
          })
        }

        // Variance - only include if at least one variance field has data
        if (row.varianceLbs !== '' || row.variancePct !== '') {
          variancePayload.push({
            location_id: locationId,
            variance_date: entryDate,
            daypart: key,
            lbs_delta: row.varianceLbs === '' ? null : Number(row.varianceLbs),
            pct_delta: row.variancePct === '' ? null : Number(row.variancePct),
            updated_by: profile.id,
          })
        }
      }

      if (countsPayload.length === 0 && variancePayload.length === 0) {
        setMessage('No data to save.')
        setSaving(false)
        return
      }

      // Save both in parallel
      const promises = []
      if (countsPayload.length > 0) {
        promises.push(
          supabase
            .from('beef_counts_daily')
            .upsert(countsPayload, { onConflict: 'location_id,count_date,daypart' })
        )
      }
      if (variancePayload.length > 0) {
        promises.push(
          supabase
            .from('beef_variance_daypart')
            .upsert(variancePayload, { onConflict: 'location_id,variance_date,daypart' })
        )
      }

      const results = await Promise.all(promises)
      const errors = results.filter((r) => r.error)
      if (errors.length > 0) {
        throw errors[0].error
      }

      setMessage('Saved!')
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
      {/* Date navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded border text-sm"
            onClick={() => shiftDate(-1)}
          >
            ← Prev
          </button>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
          <button
            type="button"
            className="px-3 py-1.5 rounded border text-sm"
            onClick={() => shiftDate(1)}
          >
            Next →
          </button>
        </div>
        {loading && <span className="text-xs text-gray-500">Loading...</span>}
      </div>

      {/* Sunday count type selector */}
      {isSunday && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3">
          <p className="text-sm font-medium text-amber-800 mb-2">
            Sunday Count Type
          </p>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="countType"
                value="daily"
                checked={countType === 'daily'}
                onChange={() => setCountType('daily')}
              />
              Daily
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="countType"
                value="weekly"
                checked={countType === 'weekly'}
                onChange={() => setCountType('weekly')}
              />
              Weekly
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="countType"
                value="period"
                checked={countType === 'period'}
                onChange={() => setCountType('period')}
              />
              Period
            </label>
          </div>
        </div>
      )}

      {/* Daypart entries - only show enabled dayparts */}
      <div className="space-y-3">
        {activeDayparts.map(({ key, label }) => (
          <fieldset key={key} className="border rounded p-3">
            <legend className="text-sm font-medium px-1">{label}</legend>

            <div className="grid grid-cols-2 gap-4 mt-2">
              {/* Counts section */}
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Counts</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cases</label>
                    <input
                      type="number"
                      step="1"
                      inputMode="numeric"
                      value={form[key].cases}
                      onChange={(e) => handleChange(key, 'cases', e.target.value)}
                      className="border rounded px-2 py-1 w-full text-center text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Roasts</label>
                    <input
                      type="number"
                      step="1"
                      inputMode="numeric"
                      value={form[key].roasts}
                      onChange={(e) => handleChange(key, 'roasts', e.target.value)}
                      className="border rounded px-2 py-1 w-full text-center text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Lbs</label>
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={form[key].lbs}
                      onChange={(e) => handleChange(key, 'lbs', e.target.value)}
                      className="border rounded px-2 py-1 w-full text-center text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Variance section */}
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Variance</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Lbs</label>
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={form[key].varianceLbs}
                      onChange={(e) => handleChange(key, 'varianceLbs', e.target.value)}
                      className="border rounded px-2 py-1 w-full text-center text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">%</label>
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={form[key].variancePct}
                      onChange={(e) => handleChange(key, 'variancePct', e.target.value)}
                      className="border rounded px-2 py-1 w-full text-center text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </fieldset>
        ))}
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={saveAll}
          disabled={saving || !canEdit}
          className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Day'}
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
    </div>
  )
}
