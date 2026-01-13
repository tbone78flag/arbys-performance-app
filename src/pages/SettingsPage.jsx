import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const ALL_DAYPARTS = [
  { key: '10am', label: '10 AM' },
  { key: '2pm', label: '2 PM' },
  { key: '5pm', label: '5 PM' },
  { key: 'close', label: 'Close' },
]

// Speed dayparts (different from beef count dayparts)
const SPEED_DAYPARTS = [
  { key: 'breakfast', label: 'Breakfast (open–11a)' },
  { key: 'lunch', label: 'Lunch (11a–2p)' },
  { key: 'afternoon', label: 'Afternoon (2p–5p)' },
  { key: 'dinner', label: 'Dinner (5p–8p)' },
  { key: 'late_night', label: 'Late Night (8p–close)' },
]

// Default enabled speed dayparts (no breakfast by default)
const DEFAULT_SPEED_DAYPARTS = ['lunch', 'afternoon', 'dinner', 'late_night']

// Sandwich types for pricing
const SANDWICH_TYPES = [
  { key: 'classic', label: 'Classic RB', oz: 3 },
  { key: 'double', label: 'Double RB', oz: 6 },
  { key: 'half_lb', label: 'Half-Pound RB', oz: 8 },
]

export default function SettingsPage({ profile }) {
  const navigate = useNavigate()
  const isEditor = ['Assistant Manager', 'General Manager'].includes(
    profile?.title
  )

  const locationId = profile?.location_id ?? 'holladay-3900'

  // Accordion state
  const [openSection, setOpenSection] = useState(null)

  // Speed settings state
  const [enabledSpeedDayparts, setEnabledSpeedDayparts] = useState(DEFAULT_SPEED_DAYPARTS)
  const [speedGoals, setSpeedGoals] = useState({
    breakfast: '',
    lunch: '',
    afternoon: '',
    dinner: '',
    late_night: '',
  })
  const [speedSaving, setSpeedSaving] = useState(false)
  const [speedMsg, setSpeedMsg] = useState(null)

  // Beef/Food settings state
  const [avgCheck, setAvgCheck] = useState('')
  const [beefCostPerLb, setBeefCostPerLb] = useState('')
  const [enabledDayparts, setEnabledDayparts] = useState(['close'])
  const [sandwichPricing, setSandwichPricing] = useState({
    classic: { menuPrice: '', foodCost: '' },
    double: { menuPrice: '', foodCost: '' },
    half_lb: { menuPrice: '', foodCost: '' },
  })
  const [beefSaving, setBeefSaving] = useState(false)
  const [beefMsg, setBeefMsg] = useState(null)

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
        .in('key', [
          'average_check',
          'beef_cost_per_lb',
          'beef_dayparts',
          'sandwich_classic_price',
          'sandwich_classic_cost',
          'sandwich_double_price',
          'sandwich_double_cost',
          'sandwich_half_lb_price',
          'sandwich_half_lb_cost',
          // Speed daypart enabled flags (1 = enabled, 0 = disabled)
          'speed_daypart_breakfast',
          'speed_daypart_lunch',
          'speed_daypart_afternoon',
          'speed_daypart_dinner',
          'speed_daypart_late_night',
          // Speed goals
          'speed_goal_breakfast',
          'speed_goal_lunch',
          'speed_goal_afternoon',
          'speed_goal_dinner',
          'speed_goal_late_night',
        ])

      if (!error && data) {
        const newPricing = { ...sandwichPricing }
        const newSpeedGoals = { ...speedGoals }
        const newEnabledSpeedDayparts = []
        let hasSpeedDaypartSettings = false

        data.forEach((row) => {
          if (row.key === 'average_check') setAvgCheck(row.value || '')
          if (row.key === 'beef_cost_per_lb') setBeefCostPerLb(row.value || '')
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
          // Sandwich pricing
          if (row.key === 'sandwich_classic_price') newPricing.classic.menuPrice = row.value || ''
          if (row.key === 'sandwich_classic_cost') newPricing.classic.foodCost = row.value || ''
          if (row.key === 'sandwich_double_price') newPricing.double.menuPrice = row.value || ''
          if (row.key === 'sandwich_double_cost') newPricing.double.foodCost = row.value || ''
          if (row.key === 'sandwich_half_lb_price') newPricing.half_lb.menuPrice = row.value || ''
          if (row.key === 'sandwich_half_lb_cost') newPricing.half_lb.foodCost = row.value || ''
          // Speed dayparts enabled (stored as individual keys with 1 = enabled)
          SPEED_DAYPARTS.forEach(({ key }) => {
            if (row.key === `speed_daypart_${key}`) {
              hasSpeedDaypartSettings = true
              if (Number(row.value) === 1) {
                newEnabledSpeedDayparts.push(key)
              }
            }
          })
          // Speed goals
          if (row.key === 'speed_goal_breakfast') newSpeedGoals.breakfast = row.value || ''
          if (row.key === 'speed_goal_lunch') newSpeedGoals.lunch = row.value || ''
          if (row.key === 'speed_goal_afternoon') newSpeedGoals.afternoon = row.value || ''
          if (row.key === 'speed_goal_dinner') newSpeedGoals.dinner = row.value || ''
          if (row.key === 'speed_goal_late_night') newSpeedGoals.late_night = row.value || ''
        })
        setSandwichPricing(newPricing)
        setSpeedGoals(newSpeedGoals)
        // Only update enabled dayparts if we found settings in the database
        if (hasSpeedDaypartSettings && newEnabledSpeedDayparts.length > 0) {
          setEnabledSpeedDayparts(newEnabledSpeedDayparts)
        }
      }
    }

    loadSettings()
  }, [locationId])

  // Save speed settings only
  const saveSpeedSettings = async () => {
    setSpeedSaving(true)
    setSpeedMsg(null)

    try {
      const rows = []

      // Save each speed daypart enabled state as individual key (1 = enabled, 0 = disabled)
      SPEED_DAYPARTS.forEach(({ key }) => {
        const isEnabled = enabledSpeedDayparts.includes(key) ? 1 : 0
        rows.push({ location_id: locationId, key: `speed_daypart_${key}`, value: isEnabled })
      })

      // Only save goals that have actual numeric values
      SPEED_DAYPARTS.forEach(({ key }) => {
        const val = speedGoals[key]
        if (val !== '' && val !== null && val !== undefined) {
          rows.push({ location_id: locationId, key: `speed_goal_${key}`, value: val })
        }
      })

      const { error } = await supabase
        .from('location_settings')
        .upsert(rows, { onConflict: 'location_id,key' })

      if (error) throw error
      setSpeedMsg('Speed settings saved!')
    } catch (err) {
      console.error('Save speed settings failed', err)
      setSpeedMsg(`Save failed: ${err.message || err}`)
    } finally {
      setSpeedSaving(false)
    }
  }

  // Save beef/food settings only
  const saveBeefSettings = async () => {
    setBeefSaving(true)
    setBeefMsg(null)

    try {
      const rows = [
        { location_id: locationId, key: 'beef_dayparts', value: JSON.stringify(enabledDayparts) },
      ]

      // Only add numeric values if they exist
      if (avgCheck !== '') {
        rows.push({ location_id: locationId, key: 'average_check', value: avgCheck })
      }
      if (beefCostPerLb !== '') {
        rows.push({ location_id: locationId, key: 'beef_cost_per_lb', value: beefCostPerLb })
      }

      // Sandwich pricing - only save if values exist
      SANDWICH_TYPES.forEach(({ key }) => {
        const pricing = sandwichPricing[key]
        if (pricing.menuPrice !== '') {
          rows.push({ location_id: locationId, key: `sandwich_${key}_price`, value: pricing.menuPrice })
        }
        if (pricing.foodCost !== '') {
          rows.push({ location_id: locationId, key: `sandwich_${key}_cost`, value: pricing.foodCost })
        }
      })

      const { error } = await supabase
        .from('location_settings')
        .upsert(rows, { onConflict: 'location_id,key' })

      if (error) throw error
      setBeefMsg('Beef & pricing settings saved!')
    } catch (err) {
      console.error('Save beef settings failed', err)
      setBeefMsg(`Save failed: ${err.message || err}`)
    } finally {
      setBeefSaving(false)
    }
  }

  // Clear messages after timeout
  useEffect(() => {
    if (!speedMsg) return
    const t = setTimeout(() => setSpeedMsg(null), 4000)
    return () => clearTimeout(t)
  }, [speedMsg])

  useEffect(() => {
    if (!beefMsg) return
    const t = setTimeout(() => setBeefMsg(null), 4000)
    return () => clearTimeout(t)
  }, [beefMsg])

  const toggleDaypart = (daypart) => {
    setEnabledDayparts((prev) => {
      if (prev.includes(daypart)) {
        if (prev.length === 1) return prev
        return prev.filter((d) => d !== daypart)
      } else {
        return [...prev, daypart]
      }
    })
  }

  const toggleSpeedDaypart = (daypart) => {
    setEnabledSpeedDayparts((prev) => {
      if (prev.includes(daypart)) {
        if (prev.length === 1) return prev
        return prev.filter((d) => d !== daypart)
      } else {
        return [...prev, daypart]
      }
    })
  }

  const updateSandwichPricing = (sandwichKey, field, value) => {
    setSandwichPricing((prev) => ({
      ...prev,
      [sandwichKey]: {
        ...prev[sandwichKey],
        [field]: value,
      },
    }))
  }

  const calculateProfit = (sandwichKey) => {
    const pricing = sandwichPricing[sandwichKey]
    const menuPrice = parseFloat(pricing.menuPrice) || 0
    const foodCost = parseFloat(pricing.foodCost) || 0
    if (menuPrice > 0 && foodCost > 0) {
      return (menuPrice - foodCost).toFixed(2)
    }
    return null
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
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Location Settings</h2>
          <p className="text-sm text-gray-600 mb-4">
            Configure location-specific settings and preferences.
          </p>

          <div className="space-y-2">
            {/* Speed Settings Accordion */}
            <div className="border rounded-lg overflow-hidden border-gray-200">
              <button
                type="button"
                onClick={() => toggleSection('speed-settings')}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={openSection === 'speed-settings'}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-gray-700">Speed Settings</span>
                  <span className="text-xs text-gray-500">
                    Configure drive-thru speed dayparts and goals.
                  </span>
                </div>
                <span
                  className={`transform transition-transform text-gray-600 ${
                    openSection === 'speed-settings' ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {openSection === 'speed-settings' && (
                <div className="px-4 pb-4 pt-2 bg-white border-t space-y-4">
                  {/* Speed Dayparts */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Speed Tracking Dayparts</h4>
                    <p className="text-xs text-gray-500 mb-3">
                      Select which dayparts your location uses for speed tracking. Enable Breakfast if your store serves a breakfast menu.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {SPEED_DAYPARTS.map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={enabledSpeedDayparts.includes(key)}
                            onChange={() => toggleSpeedDaypart(key)}
                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    {enabledSpeedDayparts.length === 1 && (
                      <p className="text-xs text-amber-600 mt-2">
                        At least one daypart must be selected.
                      </p>
                    )}
                  </div>

                  {/* Speed Goals */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Drive-Thru Speed Goals</h4>
                    <p className="text-xs text-gray-500 mb-3">
                      Set target speed (in seconds per order) for each enabled daypart. These goals will appear as reference lines on the Speed page charts.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {SPEED_DAYPARTS.filter(({ key }) => enabledSpeedDayparts.includes(key)).map(({ key, label }) => (
                        <div key={key} className="bg-gray-50 rounded p-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {label}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              value={speedGoals[key]}
                              onChange={(e) => setSpeedGoals(prev => ({ ...prev, [key]: e.target.value }))}
                              placeholder="e.g. 45"
                              className="border rounded px-3 py-2 w-24 text-sm"
                            />
                            <span className="text-sm text-gray-500">seconds</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Save Speed Settings Button */}
                  <div className="border-t pt-4 flex items-center gap-3">
                    <button
                      onClick={saveSpeedSettings}
                      disabled={speedSaving}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                    >
                      {speedSaving ? 'Saving…' : 'Save Speed Settings'}
                    </button>
                    {speedMsg && (
                      <span
                        className={`text-sm ${
                          speedMsg.includes('failed') ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {speedMsg}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Beef & Pricing Settings Accordion */}
            <div className="border rounded-lg overflow-hidden border-gray-200">
              <button
                type="button"
                onClick={() => toggleSection('beef-settings')}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-gray-50 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={openSection === 'beef-settings'}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-gray-700">Beef & Pricing Settings</span>
                  <span className="text-xs text-gray-500">
                    Configure beef count dayparts, average check, and sandwich pricing.
                  </span>
                </div>
                <span
                  className={`transform transition-transform text-gray-600 ${
                    openSection === 'beef-settings' ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {openSection === 'beef-settings' && (
                <div className="px-4 pb-4 pt-2 bg-white border-t space-y-4">
                  {/* Beef Count Dayparts */}
                  <div>
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

                  {/* Average Check */}
                  <div className="border-t pt-4">
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

                  {/* Beef Cost */}
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Beef Cost per Lb ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={beefCostPerLb}
                      onChange={(e) => setBeefCostPerLb(e.target.value)}
                      placeholder="e.g. 4.50"
                      className="border rounded px-3 py-2 w-full max-w-xs text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Raw beef cost used for variance calculations.
                    </p>
                  </div>

                  {/* Sandwich Pricing */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Sandwich Pricing</h4>
                    <p className="text-xs text-gray-500 mb-3">
                      Enter the menu price and total food cost for each sandwich type.
                      This is used to calculate potential profit lost from beef variance.
                    </p>

                    <div className="space-y-4">
                      {SANDWICH_TYPES.map(({ key, label, oz }) => {
                        const profit = calculateProfit(key)
                        return (
                          <div key={key} className="bg-gray-50 rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                {label} ({oz} oz beef)
                              </span>
                              {profit && (
                                <span className="text-xs text-green-600 font-medium">
                                  Profit: ${profit}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                  Menu Price ($)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={sandwichPricing[key].menuPrice}
                                  onChange={(e) => updateSandwichPricing(key, 'menuPrice', e.target.value)}
                                  placeholder="e.g. 5.99"
                                  className="border rounded px-3 py-2 w-full text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                  Food Cost ($)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={sandwichPricing[key].foodCost}
                                  onChange={(e) => updateSandwichPricing(key, 'foodCost', e.target.value)}
                                  placeholder="e.g. 2.50"
                                  className="border rounded px-3 py-2 w-full text-sm"
                                />
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              Food cost includes beef, bun, sauce, wrap, etc.
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Save Beef Settings Button */}
                  <div className="border-t pt-4 flex items-center gap-3">
                    <button
                      onClick={saveBeefSettings}
                      disabled={beefSaving}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                    >
                      {beefSaving ? 'Saving…' : 'Save Beef & Pricing Settings'}
                    </button>
                    {beefMsg && (
                      <span
                        className={`text-sm ${
                          beefMsg.includes('failed') ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {beefMsg}
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
