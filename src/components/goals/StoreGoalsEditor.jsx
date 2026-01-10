// src/components/goals/StoreGoalsEditor.jsx
import { useState } from 'react'
import {
  useCurrentStoreGoals,
  useSetStoreGoal,
  useCopyPreviousGoal,
} from '../../hooks/useStoreGoals'

export default function StoreGoalsEditor({ profile, locationId }) {
  const [weekMessage, setWeekMessage] = useState('')
  const [periodMessage, setPeriodMessage] = useState('')
  const [editingWeek, setEditingWeek] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState(false)

  const { data: goals, isLoading } = useCurrentStoreGoals(locationId)
  const setGoalMutation = useSetStoreGoal()
  const copyPreviousMutation = useCopyPreviousGoal()

  const weekGoal = goals?.weekGoal
  const periodGoal = goals?.periodGoal

  // Start editing with current value pre-filled
  const startEditWeek = () => {
    setWeekMessage(weekGoal?.message || '')
    setEditingWeek(true)
  }

  const startEditPeriod = () => {
    setPeriodMessage(periodGoal?.message || '')
    setEditingPeriod(true)
  }

  const saveWeekGoal = async () => {
    if (!weekMessage.trim()) return
    await setGoalMutation.mutateAsync({
      locationId,
      goalType: 'week',
      message: weekMessage.trim(),
      createdBy: profile.id,
    })
    setEditingWeek(false)
  }

  const savePeriodGoal = async () => {
    if (!periodMessage.trim()) return
    await setGoalMutation.mutateAsync({
      locationId,
      goalType: 'period',
      message: periodMessage.trim(),
      createdBy: profile.id,
    })
    setEditingPeriod(false)
  }

  const copyLastWeek = async () => {
    try {
      await copyPreviousMutation.mutateAsync({
        locationId,
        goalType: 'week',
        createdBy: profile.id,
      })
    } catch (err) {
      alert(err.message)
    }
  }

  const copyLastPeriod = async () => {
    try {
      await copyPreviousMutation.mutateAsync({
        locationId,
        goalType: 'period',
        createdBy: profile.id,
      })
    } catch (err) {
      alert(err.message)
    }
  }

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading store goals...</div>
  }

  return (
    <div className="space-y-6">
      {/* Weekly Goal */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-800">This Week's Focus</h3>
          {!editingWeek && (
            <button
              onClick={startEditWeek}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {weekGoal ? 'Edit' : 'Set Goal'}
            </button>
          )}
        </div>

        {editingWeek ? (
          <div className="space-y-2">
            <textarea
              value={weekMessage}
              onChange={(e) => setWeekMessage(e.target.value)}
              placeholder="What should the team focus on this week?"
              className="w-full border rounded-lg p-3 text-sm"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={saveWeekGoal}
                disabled={setGoalMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {setGoalMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setEditingWeek(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : weekGoal ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-gray-800">{weekGoal.message}</p>
            <p className="text-xs text-gray-500 mt-1">
              Set by {weekGoal.creator?.full_name || 'Manager'}
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500 mb-2">No weekly goal set yet</p>
            <button
              onClick={copyLastWeek}
              disabled={copyPreviousMutation.isPending}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Copy from last week
            </button>
          </div>
        )}
      </div>

      {/* Period Goal */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-800">This Period's Focus</h3>
          {!editingPeriod && (
            <button
              onClick={startEditPeriod}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {periodGoal ? 'Edit' : 'Set Goal'}
            </button>
          )}
        </div>

        {editingPeriod ? (
          <div className="space-y-2">
            <textarea
              value={periodMessage}
              onChange={(e) => setPeriodMessage(e.target.value)}
              placeholder="What's the focus for this month/period?"
              className="w-full border rounded-lg p-3 text-sm"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={savePeriodGoal}
                disabled={setGoalMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {setGoalMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setEditingPeriod(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : periodGoal ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-gray-800">{periodGoal.message}</p>
            <p className="text-xs text-gray-500 mt-1">
              Set by {periodGoal.creator?.full_name || 'Manager'}
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500 mb-2">No period goal set yet</p>
            <button
              onClick={copyLastPeriod}
              disabled={copyPreviousMutation.isPending}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Copy from last period
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        These goals will be displayed on everyone's dashboard at this location.
      </p>
    </div>
  )
}
