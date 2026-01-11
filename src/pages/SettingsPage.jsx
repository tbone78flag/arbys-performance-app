import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const ALL_DAYPARTS = [
  { key: '10am', label: '10 AM' },
  { key: '2pm', label: '2 PM' },
  { key: '5pm', label: '5 PM' },
  { key: 'close', label: 'Close' },
]

export default function SettingsPage({ profile }) {
  const navigate = useNavigate()
  const isEditor = ['Assistant Manager', 'General Manager'].includes(
    profile?.title
  )

  const locationId = profile?.location_id ?? 'holladay-3900'

  // Accordion state
  const [openSection, setOpenSection] = useState(null)

  // Location Settings state
  const [avgCheck, setAvgCheck] = useState('')
  const [beefCostPerLb, setBeefCostPerLb] = useState('')
  const [beefProfitMargin, setBeefProfitMargin] = useState('')
  const [enabledDayparts, setEnabledDayparts] = useState(['close'])
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState(null)

  const toggleSection = (id) => {
    setOpenSection((current) => (current === id ? null : id))
  }

  // Load location settings
  useEffect(() => {
    if (!locationId) return

    const loadSettings = async () => {
      const { data, error } = await supabase
        .from('location_settings')
        .select('key, value')
        .eq('location_id', 'default')
        .in('key', ['average_check', 'beef_cost_per_lb', 'beef_profit_margin', 'beef_dayparts'])

      if (!error && data) {
        data.forEach((row) => {
          if (row.key === 'average_check') setAvgCheck(row.value || '')
          if (row.key === 'beef_cost_per_lb') setBeefCostPerLb(row.value || '')
          if (row.key === 'beef_profit_margin') setBeefProfitMargin(row.value || '')
          if (row.key === 'beef_dayparts') {
            try {
              const parsed = typeof row.value === 'string'
                ? JSON.parse(row.value)
                : row.value
              if (Array.isArray(parsed) && parsed.length > 0) {
                setEnabledDayparts(parsed)
              }
            } catch {
              // Keep default
            }
          }
        })
      }
    }

    loadSettings()
  }, [locationId])

  const saveLocationSettings = async () => {
    setSettingsSaving(true)
    setSettingsMsg(null)

    try {
      const rows = [
        { location_id: 'default', key: 'average_check', value: avgCheck },
        { location_id: 'default', key: 'beef_cost_per_lb', value: beefCostPerLb },
        { location_id: 'default', key: 'beef_profit_margin', value: beefProfitMargin },
        { location_id: 'default', key: 'beef_dayparts', value: JSON.stringify(enabledDayparts) },
      ]

      const { error } = await supabase
        .from('location_settings')
        .upsert(rows, { onConflict: 'location_id,key' })

      if (error) throw error
      setSettingsMsg('Settings saved!')
    } catch (err) {
      console.error('Save settings failed', err)
      setSettingsMsg(`Save failed: ${err.message || err}`)
    } finally {
      setSettingsSaving(false)
    }
  }

  // Clear settings message after timeout
  useEffect(() => {
    if (!settingsMsg) return
    const t = setTimeout(() => setSettingsMsg(null), 4000)
    return () => clearTimeout(t)
  }, [settingsMsg])

  const toggleDaypart = (daypart) => {
    setEnabledDayparts((prev) => {
      if (prev.includes(daypart)) {
        // Don't allow removing all dayparts
        if (prev.length === 1) return prev
        return prev.filter((d) => d !== daypart)
      } else {
        return [...prev, daypart]
      }
    })
  }

  if (!profile) return <div className="p-6">Loading…</div>

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-red-700">Settings</h1>
          <button
            className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-red-700 shrink-0"
            onClick={() => navigate('/App')}
            aria-label="Go back"
          >
            Go Back
          </button>
        </div>
      </div>

      {/* Settings Sections */}
      {isEditor && (
        <div className="bg-white shadow rounded p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Configuration</h2>
          <p className="text-sm text-gray-600 mb-4">
            Manage location settings and preferences.
          </p>

          <div className="space-y-2">
            {/* Location Settings Accordion */}
            <div className="border rounded-lg overflow-hidden border-gray-200">
              <button
                type="button"
                onClick={() => toggleSection('location-settings')}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={openSection === 'location-settings'}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-gray-700">Location Settings</span>
                  <span className="text-xs text-gray-500">
                    Configure average check, beef pricing, and daypart settings.
                  </span>
                </div>
                <span
                  className={`transform transition-transform text-gray-600 ${
                    openSection === 'location-settings' ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {openSection === 'location-settings' && (
                <div className="px-4 pb-4 pt-2 bg-white border-t space-y-4">
                  {/* Average Check */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Average Check ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={avgCheck}
                      onChange={(e) => setAvgCheck(e.target.value)}
                      placeholder="e.g. 8.50"
                      className="border rounded px-3 py-2 w-full max-w-xs text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Used for calculating guest count estimates.
                    </p>
                  </div>

                  {/* Beef Pricing */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Beef Pricing</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Cost per Lb ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={beefCostPerLb}
                          onChange={(e) => setBeefCostPerLb(e.target.value)}
                          placeholder="e.g. 4.50"
                          className="border rounded px-3 py-2 w-full text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Profit Margin (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={beefProfitMargin}
                          onChange={(e) => setBeefProfitMargin(e.target.value)}
                          placeholder="e.g. 25"
                          className="border rounded px-3 py-2 w-full text-sm"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Used for variance cost calculations.
                    </p>
                  </div>

                  {/* Beef Count Dayparts */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Beef Count Dayparts</h4>
                    <p className="text-xs text-gray-500 mb-3">
                      Select which dayparts your location uses for beef counts.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {ALL_DAYPARTS.map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={enabledDayparts.includes(key)}
                            onChange={() => toggleDaypart(key)}
                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    {enabledDayparts.length === 1 && (
                      <p className="text-xs text-amber-600 mt-2">
                        At least one daypart must be selected.
                      </p>
                    )}
                  </div>

                  {/* Save Button */}
                  <div className="border-t pt-4 flex items-center gap-3">
                    <button
                      onClick={saveLocationSettings}
                      disabled={settingsSaving}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                    >
                      {settingsSaving ? 'Saving…' : 'Save Settings'}
                    </button>
                    {settingsMsg && (
                      <span
                        className={`text-sm ${
                          settingsMsg.includes('failed') ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {settingsMsg}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Non-editor message */}
      {!isEditor && (
        <div className="bg-white shadow rounded p-4 sm:p-6">
          <p className="text-gray-600">
            Settings can only be modified by Assistant Managers and General Managers.
          </p>
        </div>
      )}
    </div>
  )
}
