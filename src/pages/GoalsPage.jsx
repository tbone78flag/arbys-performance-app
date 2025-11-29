import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { DailySalesYoYCard } from '../components/DailySalesYoYCard'
import { SpeedWeekEntryCard } from '../components/SpeedWeekEntryCard'
import { BeefVarianceCard } from '../components/BeefVarianceCard'
import { startOfWeekLocal, addDays } from '../utils/dateHelpers'

export default function GoalsPage({ profile }) {
  const navigate = useNavigate()
  const isEditor = ['Assistant Manager', 'General Manager'].includes(
    profile?.title
  )

  const locationId = profile?.location_id ?? 'holladay-3900s'

  // Average check + goals state
  const [averageCheck, setAverageCheck] = useState('')
  const [goalText, setGoalText] = useState('')
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingGoal, setSavingGoal] = useState(false)
  const [savingAvg, setSavingAvg] = useState(false)

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
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Goals &amp; Settings</h1>
        <button
          className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-red-700 shrink-0"
          onClick={() => navigate('/App')}
          aria-label="Go back"
        >
          Go Back
        </button>
      </div>

      {/* Daily Sales YoY */}
      <DailySalesYoYCard locationId={locationId} isEditor={isEditor} />

      {/* Drive-Thru Speed Week Entry */}
      <SpeedWeekEntryCard
        locationId={locationId}
        weekStart={weekStart}
        weekEnd={weekEnd}
        weekLabel={weekLabel}
        onPrevWeek={() => setWeekAnchor(addDays(weekStart, -1))}
        onNextWeek={() => setWeekAnchor(addDays(weekEnd, 1))}
      />

      {/* Beef Variance & Pricing */}
      <BeefVarianceCard
        locationId={locationId}
        profile={profile}
        weekStart={weekStart}
        weekLabel={weekLabel}
        onPrevWeek={() => setWeekAnchor(addDays(weekStart, -1))}
        onNextWeek={() => setWeekAnchor(addDays(weekEnd, 1))}
      />

      {/* Average Check Editor */}
      {isEditor && (
        <div className="bg-white shadow rounded p-4">
          <h2 className="font-semibold mb-2">Location Average Check</h2>
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
            This value is used on the Sales page for the “what if” calculator.
          </p>
        </div>
      )}

      {/* Goal creator */}
      <div className="bg-white shadow rounded p-4">
        <h2 className="font-semibold mb-2">Your Goals</h2>
        <div className="flex gap-2">
          <textarea
            rows={2}
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            placeholder="Enter a sales goal..."
            className="flex-1 border rounded p-2"
          />
          <button
            onClick={saveGoal}
            disabled={savingGoal}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          >
            {savingGoal ? 'Saving…' : 'Add Goal'}
          </button>
        </div>
        {goals.length > 0 && (
          <ul className="mt-3 list-disc list-inside space-y-1">
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
    </div>
  )
}
