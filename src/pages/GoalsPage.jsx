import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { BeefVarianceCard } from '../components/BeefVarianceCard'
import RewardsManager from '../components/RewardsManager'
import PointsHistory from '../components/PointsHistory'
import { startOfWeekLocal, addDays } from '../utils/dateHelpers'

export default function GoalsPage({ profile }) {
  const navigate = useNavigate()
  const isEditor = ['Assistant Manager', 'General Manager'].includes(
    profile?.title
  )

  const locationId = profile?.location_id ?? 'holladay-3900'

  // Average check + goals state
  const [averageCheck, setAverageCheck] = useState('')
  const [goalText, setGoalText] = useState('')
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingGoal, setSavingGoal] = useState(false)
  const [savingAvg, setSavingAvg] = useState(false)

  // Accordion state for all sections
  const [openSection, setOpenSection] = useState(null)

  const toggleSection = (id) => {
    setOpenSection((current) => (current === id ? null : id))
  }

  // Shared week anchor (for speed + beef)
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const weekStart = startOfWeekLocal(weekAnchor)
  const weekEnd = addDays(weekStart, 6)
  const weekLabel = `${weekStart.toLocaleDateString()} – ${weekEnd.toLocaleDateString()}`

  // Load existing average check + goals
  useEffect(() => {
    if (!profile) return

    const load = async () => {
      const { data: avgData } = await supabase
        .from('location_settings')
        .select('value')
        .eq('location_id', 'default')
        .eq('key', 'average_check')
        .single()

      if (avgData) setAverageCheck(Number(avgData.value).toFixed(2))

      const { data: goalsData } = await supabase
        .from('goals')
        .select('id, goal_text, created_at')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      if (goalsData) setGoals(goalsData)
      setLoading(false)
    }

    load()
  }, [profile])

  const saveAverage = async () => {
    if (!isEditor) return
    if (isNaN(Number(averageCheck)) || Number(averageCheck) < 0) return

    setSavingAvg(true)
    const numeric = parseFloat(averageCheck)

    const { error } = await supabase
      .from('location_settings')
      .upsert(
        {
          location_id: 'default',
          key: 'average_check',
          value: numeric,
          updated_by: profile.id,
        },
        { onConflict: ['location_id', 'key'] }
      )

    setSavingAvg(false)
    if (error) console.error('Failed to save average check', error)
  }

  const saveGoal = async () => {
    if (!goalText.trim()) return

    setSavingGoal(true)

    const { error } = await supabase
      .from('goals')
      .insert({ user_id: profile.id, goal_text: goalText })

    setSavingGoal(false)

    if (error) {
      console.error('Failed to save goal', error)
      return
    }

    setGoalText('')

    const { data: updatedGoals } = await supabase
      .from('goals')
      .select('id, goal_text, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })

    if (updatedGoals) setGoals(updatedGoals)
  }

  if (!profile) return <div className="p-6">Loading…</div>
  if (loading) return <div className="p-6">Loading goals…</div>

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
        {/* Beef Variance Accordion */}
        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('beef-variance')}
            className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            aria-expanded={openSection === 'beef-variance'}
          >
            <div className="flex flex-col">
              <span className="font-medium">Beef Variance & Pricing</span>
              <span className="text-xs text-gray-500">
                Track beef usage variance and pricing data.
              </span>
            </div>
            <span
              className={`transform transition-transform ${
                openSection === 'beef-variance' ? 'rotate-90' : ''
              }`}
            >
              ▶
            </span>
          </button>

          {openSection === 'beef-variance' && (
            <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
              <BeefVarianceCard
                locationId={locationId}
                profile={profile}
                weekStart={weekStart}
                weekLabel={weekLabel}
                onPrevWeek={() => setWeekAnchor(addDays(weekStart, -1))}
                onNextWeek={() => setWeekAnchor(addDays(weekEnd, 1))}
              />
            </div>
          )}
        </div>

        {/* Your Goals Accordion */}
        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection('your-goals')}
            className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            aria-expanded={openSection === 'your-goals'}
          >
            <div className="flex flex-col">
              <span className="font-medium">Your Goals</span>
              <span className="text-xs text-gray-500">
                Set and track your personal sales goals.
              </span>
            </div>
            <span
              className={`transform transition-transform ${
                openSection === 'your-goals' ? 'rotate-90' : ''
              }`}
            >
              ▶
            </span>
          </button>

          {openSection === 'your-goals' && (
            <div className="px-4 pb-4 pt-2 bg-gray-50 border-t space-y-3">
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  placeholder="Enter a sales goal..."
                  className="flex-1 border rounded p-2 text-sm"
                />
                <button
                  onClick={saveGoal}
                  disabled={savingGoal}
                  className="px-4 py-2 bg-green-600 text-white rounded text-sm disabled:opacity-50"
                >
                  {savingGoal ? 'Saving…' : 'Add Goal'}
                </button>
              </div>
              {goals.length > 0 && (
                <ul className="list-disc list-inside space-y-1">
                  {goals.map((g) => (
                    <li key={g.id} className="text-sm">
                      {g.goal_text}{' '}
                      <span className="text-xs text-gray-400">
                        ({new Date(g.created_at).toLocaleDateString()})
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Manager-only tools below */}
        {isEditor && (
          <>
            {/* Average Check Editor Accordion */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('average-check')}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={openSection === 'average-check'}
              >
                <div className="flex flex-col">
                  <span className="font-medium">Location Average Check</span>
                  <span className="text-xs text-gray-500">
                    Set the average check value used for sales calculations.
                  </span>
                </div>
                <span
                  className={`transform transition-transform ${
                    openSection === 'average-check' ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {openSection === 'average-check' && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                  <div className="flex items-center gap-3">
                    <div>
                      <label className="block text-sm">Average Check ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={averageCheck}
                        onChange={(e) => setAverageCheck(e.target.value)}
                        className="border rounded px-2 py-1 w-32"
                      />
                    </div>
                    <button
                      onClick={saveAverage}
                      disabled={savingAvg}
                      className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                    >
                      {savingAvg ? 'Saving…' : 'Save Average'}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    This value is used on the Sales page for the "what if" calculator.
                  </p>
                </div>
              )}
            </div>

            {/* Points Rewards Manager Accordion */}
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

            {/* Points History Accordion */}
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
          </>
        )}
      </div>
    </div>
  )
}
