import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import RewardsManager from '../components/RewardsManager'
import PointsHistory from '../components/PointsHistory'
import TrainingScheduleForm from '../components/TrainingScheduleForm'
import StoreGoalsEditor from '../components/goals/StoreGoalsEditor'

export default function GoalsPage({ profile }) {
  const navigate = useNavigate()
  const isEditor = ['Assistant Manager', 'General Manager'].includes(
    profile?.title
  )

  const locationId = profile?.location_id ?? 'holladay-3900'

  // Average check state
  const [averageCheck, setAverageCheck] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  // Beef pricing state
  const [beefCost, setBeefCost] = useState('')
  const [pClassic, setPClassic] = useState('')
  const [pDouble, setPDouble] = useState('')
  const [pHalf, setPHalf] = useState('')

  // Beef dayparts state - which dayparts this location uses for beef counts
  const [beefDayparts, setBeefDayparts] = useState(['close']) // default to close only

  // Accordion state for all sections
  const [openSection, setOpenSection] = useState(null)

  const toggleSection = (id) => {
    setOpenSection((current) => (current === id ? null : id))
  }

  // Load existing settings
  useEffect(() => {
    if (!profile) return

    const load = async () => {
      const keys = [
        'average_check',
        'beef_cost_per_lb',
        'profit_rb_classic',
        'profit_rb_double',
        'profit_rb_half',
        'beef_dayparts',
      ]

      const { data, error } = await supabase
        .from('location_settings')
        .select('key, value')
        .eq('location_id', 'default')
        .in('key', keys)

      if (!error && data) {
        const map = Object.fromEntries(data.map((r) => [r.key, r.value]))
        if (map.average_check != null) setAverageCheck(Number(map.average_check).toFixed(2))
        if (map.beef_cost_per_lb != null) setBeefCost(String(map.beef_cost_per_lb))
        if (map.profit_rb_classic != null) setPClassic(String(map.profit_rb_classic))
        if (map.profit_rb_double != null) setPDouble(String(map.profit_rb_double))
        if (map.profit_rb_half != null) setPHalf(String(map.profit_rb_half))
        if (map.beef_dayparts != null) {
          // Parse the stored JSON array or use default
          try {
            const parsed = typeof map.beef_dayparts === 'string'
              ? JSON.parse(map.beef_dayparts)
              : map.beef_dayparts
            if (Array.isArray(parsed) && parsed.length > 0) {
              setBeefDayparts(parsed)
            }
          } catch {
            // Keep default if parsing fails
          }
        }
      }

      setLoading(false)
    }

    load()
  }, [profile])

  const saveAllSettings = async () => {
    if (!isEditor) return
    setSavingSettings(true)

    try {
      const rows = [
        { key: 'average_check', value: Number(averageCheck || 0) },
        { key: 'beef_cost_per_lb', value: Number(beefCost || 0) },
        { key: 'profit_rb_classic', value: Number(pClassic || 0) },
        { key: 'profit_rb_double', value: Number(pDouble || 0) },
        { key: 'profit_rb_half', value: Number(pHalf || 0) },
        { key: 'beef_dayparts', value: JSON.stringify(beefDayparts) },
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
      console.error('Failed to save settings', error)
    } finally {
      setSavingSettings(false)
    }
  }

  if (!profile) return <div className="p-6">Loading…</div>
  if (loading) return <div className="p-6">Loading…</div>

  return (
    <div className="w-full max-w-3xl mx-auto bg-white shadow p-4 sm:p-6 rounded px-4 sm:px-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-red-700">Goals Management Page</h1>
        <button
          className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-red-700 shrink-0"
          onClick={() => navigate('/App')}
          aria-label="Go back"
        >
          Go Back
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Tap a section to expand and manage goals and rewards.
      </p>

      {/* Flat accordion list */}
      <div className="space-y-2">
        {/* Manager-only tools */}
        {isEditor && (
          <>
            {/* 1. Store Goals Accordion */}
            <div className="border rounded-lg overflow-hidden border-red-200">
              <button
                type="button"
                onClick={() => toggleSection('store-goals')}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-red-50 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={openSection === 'store-goals'}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-red-700">Store Goals</span>
                  <span className="text-xs text-red-600">
                    Set weekly and period focus for the entire team.
                  </span>
                </div>
                <span
                  className={`transform transition-transform text-red-600 ${
                    openSection === 'store-goals' ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {openSection === 'store-goals' && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                  <StoreGoalsEditor profile={profile} locationId={locationId} />
                </div>
              )}
            </div>

            {/* 2. Training Scheduler Accordion */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('training-scheduler')}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={openSection === 'training-scheduler'}
              >
                <div className="flex flex-col">
                  <span className="font-medium">Training Scheduler</span>
                  <span className="text-xs text-gray-500">
                    Schedule training sessions for team members.
                  </span>
                </div>
                <span
                  className={`transform transition-transform ${
                    openSection === 'training-scheduler' ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {openSection === 'training-scheduler' && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                  <TrainingScheduleForm profile={profile} locationId={locationId} />
                </div>
              )}
            </div>

            {/* 3. Points Rewards Manager Accordion */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('rewards-manager')}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={openSection === 'rewards-manager'}
              >
                <div className="flex flex-col">
                  <span className="font-medium">Points Rewards Manager</span>
                  <span className="text-xs text-gray-500">
                    Configure rewards that employees can redeem with their points.
                  </span>
                </div>
                <span
                  className={`transform transition-transform ${
                    openSection === 'rewards-manager' ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {openSection === 'rewards-manager' && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                  <RewardsManager locationId={locationId} />
                </div>
              )}
            </div>

            {/* 4. Points History Accordion */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('points-history')}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={openSection === 'points-history'}
              >
                <div className="flex flex-col">
                  <span className="font-medium">Points History</span>
                  <span className="text-xs text-gray-500">
                    View all points awarded and undo if needed.
                  </span>
                </div>
                <span
                  className={`transform transition-transform ${
                    openSection === 'points-history' ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {openSection === 'points-history' && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                  <PointsHistory locationId={locationId} profile={profile} />
                </div>
              )}
            </div>

            {/* 5. Location Pricing Settings Accordion */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('pricing-settings')}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={openSection === 'pricing-settings'}
              >
                <div className="flex flex-col">
                  <span className="font-medium">Location Pricing Settings</span>
                  <span className="text-xs text-gray-500">
                    Set average check and beef pricing for calculations.
                  </span>
                </div>
                <span
                  className={`transform transition-transform ${
                    openSection === 'pricing-settings' ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {openSection === 'pricing-settings' && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t space-y-4">
                  {/* Average Check */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Average Check</h3>
                    <div className="flex items-center gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Average Check ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={averageCheck}
                          onChange={(e) => setAverageCheck(e.target.value)}
                          className="border rounded px-2 py-1 w-28"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Used on the Sales page for the "what if" calculator.
                    </p>
                  </div>

                  <hr />

                  {/* Beef Pricing */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Beef Pricing</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Beef cost ($/lb)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          className="border rounded px-2 py-1 w-full"
                          value={beefCost}
                          onChange={(e) => setBeefCost(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Profit / Classic RB
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          className="border rounded px-2 py-1 w-full"
                          value={pClassic}
                          onChange={(e) => setPClassic(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Profit / Double RB
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          className="border rounded px-2 py-1 w-full"
                          value={pDouble}
                          onChange={(e) => setPDouble(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Profit / Half-Lb RB
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          className="border rounded px-2 py-1 w-full"
                          value={pHalf}
                          onChange={(e) => setPHalf(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <hr />

                  {/* Beef Count Dayparts */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Beef Count Dayparts</h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Select which dayparts your location uses for beef counts.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { key: '10am', label: '10 AM' },
                        { key: '2pm', label: '2 PM' },
                        { key: '5pm', label: '5 PM' },
                        { key: 'close', label: 'Close' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={beefDayparts.includes(key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setBeefDayparts((prev) => [...prev, key])
                              } else {
                                // Don't allow unchecking if it's the last one
                                if (beefDayparts.length > 1) {
                                  setBeefDayparts((prev) => prev.filter((d) => d !== key))
                                }
                              }
                            }}
                            className="rounded"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      At least one daypart must be selected. Common setups: Close only, or all four (10 AM, 2 PM, 5 PM, Close).
                    </p>
                  </div>

                  <button
                    onClick={saveAllSettings}
                    disabled={savingSettings}
                    className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                  >
                    {savingSettings ? 'Saving…' : 'Save All Settings'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
