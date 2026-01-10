import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { ymdLocal, addDays, parseYmdLocal } from '../../utils/dateHelpers'

const DAYPARTS = [
  { key: '10am', label: '10 AM' },
  { key: '2pm', label: '2 PM' },
  { key: '5pm', label: '5 PM' },
  { key: 'close', label: 'Close' },
]

const FIELDS = ['cases', 'roasts', 'lbs']

export function BeefCountsEntry({ locationId, profile }) {
  const [countDate, setCountDate] = useState(() => ymdLocal(new Date()))
  const [form, setForm] = useState(() => createEmptyForm())
  const [countType, setCountType] = useState('daily')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const canEdit =
    profile &&
    ['General Manager', 'Assistant Manager'].includes(profile.title)

  // Check if selected date is a Sunday
  const selectedDate = parseYmdLocal(countDate)
  const isSunday = selectedDate.getDay() === 0

  function createEmptyForm() {
    const empty = {}
    DAYPARTS.forEach(({ key }) => {
      empty[key] = { cases: '', roasts: '', lbs: '' }
    })
    return empty
  }

  // Load data for selected date
  useEffect(() => {
    if (!locationId) return

    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      setMessage(null)

      const { data, error } = await supabase
        .from('beef_counts_daily')
        .select('daypart, cases, roasts, lbs, count_type')
        .eq('location_id', locationId)
        .eq('count_date', countDate)

      if (cancelled) return

      if (error) {
        console.error('Load failed', error)
        setMessage(`Load failed: ${error.message}`)
        setLoading(false)
        return
      }

      const newForm = createEmptyForm()
      let foundCountType = 'daily'

      if (data && data.length > 0) {
        data.forEach((row) => {
          if (newForm[row.daypart]) {
            newForm[row.daypart] = {
              cases: row.cases != null ? String(row.cases) : '',
              roasts: row.roasts != null ? String(row.roasts) : '',
              lbs: row.lbs != null ? String(row.lbs) : '',
            }
          }
          if (row.count_type) {
            foundCountType = row.count_type
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
  }, [locationId, countDate])

  const shiftDate = (days) => {
    const d = parseYmdLocal(countDate)
    if (Number.isNaN(d.getTime())) return
    const shifted = addDays(d, days)
    setCountDate(ymdLocal(shifted))
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

  const saveCounts = async () => {
    if (!canEdit) return
    setSaving(true)
    setMessage(null)

    try {
      const payload = []

      for (const { key } of DAYPARTS) {
        const row = form[key]
        // Only include if at least one field has data
        if (row.cases !== '' || row.roasts !== '' || row.lbs !== '') {
          payload.push({
            location_id: locationId,
            count_date: countDate,
            daypart: key,
            cases: row.cases === '' ? null : Number(row.cases),
            roasts: row.roasts === '' ? null : Number(row.roasts),
            lbs: row.lbs === '' ? null : Number(row.lbs),
            count_type: isSunday ? countType : 'daily',
            updated_by: profile.id,
          })
        }
      }

      if (payload.length === 0) {
        setMessage('No data to save.')
        setSaving(false)
        return
      }

      const { error } = await supabase
        .from('beef_counts_daily')
        .upsert(payload, { onConflict: 'location_id,count_date,daypart' })

      if (error) throw error

      setMessage('Counts saved.')
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
            value={countDate}
            onChange={(e) => setCountDate(e.target.value)}
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

      {/* Daypart counts grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DAYPARTS.map(({ key, label }) => (
          <fieldset key={key} className="border rounded p-3">
            <legend className="text-sm font-medium px-1">{label}</legend>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {FIELDS.map((field) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1 capitalize">
                    {field}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={form[key][field]}
                    onChange={(e) => handleChange(key, field, e.target.value)}
                    className="border rounded px-2 py-1 w-full text-center"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={saveCounts}
          disabled={saving || !canEdit}
          className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Counts'}
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
        Enter beef counts for each daypart. On Sundays, select whether this is a
        daily, weekly, or period count.
      </p>
    </div>
  )
}
