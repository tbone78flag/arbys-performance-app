// src/components/goals/TeamGoalsOverview.jsx
import { useState } from 'react'
import { useTeamGoals, getCurrentPeriod } from '../../hooks/useGoalsData'
import { useAwardPoints } from '../../hooks/usePointsData'
import GoalDetailModal from './GoalDetailModal'

export default function TeamGoalsOverview({ profile, locationId }) {
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [showAwardModal, setShowAwardModal] = useState(false)
  const [awardTarget, setAwardTarget] = useState(null)
  const [awardPoints, setAwardPoints] = useState('')
  const [awardReason, setAwardReason] = useState('')

  const { data: teamGoals, isLoading, error } = useTeamGoals(locationId)
  const awardPointsMutation = useAwardPoints()

  const { periodStart } = getCurrentPeriod()
  const monthLabel = periodStart.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  // Get trend color and label
  const getTrendInfo = (trend) => {
    switch (trend) {
      case 'mostly_positive':
        return { color: 'bg-green-500', label: 'Doing well', textColor: 'text-green-700' }
      case 'struggling':
        return { color: 'bg-red-500', label: 'Needs support', textColor: 'text-red-700' }
      case 'mixed':
        return { color: 'bg-yellow-400', label: 'Mixed progress', textColor: 'text-yellow-700' }
      default:
        return { color: 'bg-gray-300', label: 'No check-ins yet', textColor: 'text-gray-500' }
    }
  }

  const handleAwardPoints = (goal) => {
    setAwardTarget(goal)
    setShowAwardModal(true)
    setAwardPoints('')
    setAwardReason(`Goal progress: ${goal.goal_text.substring(0, 50)}...`)
  }

  const submitAward = async () => {
    if (!awardTarget || !awardPoints) return

    try {
      await awardPointsMutation.mutateAsync({
        employeeId: awardTarget.employee_id,
        locationId,
        points: parseInt(awardPoints, 10),
        reason: awardReason,
        awardedBy: profile.id,
      })
      setShowAwardModal(false)
      setAwardTarget(null)
    } catch (err) {
      console.error('Failed to award points:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 p-4">
        Loading team goals...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 p-4">
        Error loading team goals: {error.message}
      </div>
    )
  }

  const goalsWithData = teamGoals || []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Team Work Goals</h3>
          <p className="text-xs text-gray-500">{monthLabel}</p>
        </div>
        <div className="text-sm text-gray-500">
          {goalsWithData.length} goal{goalsWithData.length !== 1 ? 's' : ''} set
        </div>
      </div>

      {/* Goals List */}
      {goalsWithData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No team members have set work goals for this month yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goalsWithData.map((goal) => {
            const trendInfo = getTrendInfo(goal.trend)
            const checkins = goal.checkins || []
            const latestCheckin = checkins[checkins.length - 1]

            return (
              <div
                key={goal.id}
                className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {/* Employee Name */}
                    <p className="text-sm font-medium text-gray-800">
                      {goal.employee_name}
                    </p>

                    {/* Goal Text */}
                    <p className="text-sm text-gray-600 mt-1">
                      {goal.goal_text}
                    </p>

                    {/* Progress Indicator */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className={`w-2 h-2 rounded-full ${trendInfo.color}`} />
                      <span className={`text-xs ${trendInfo.textColor}`}>
                        {trendInfo.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        • {checkins.length} check-in{checkins.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Latest Check-in Preview */}
                    {latestCheckin && (
                      <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
                        <span className="font-medium">Week {latestCheckin.week_number}:</span>
                        {' '}{latestCheckin.what_tried?.substring(0, 100)}
                        {latestCheckin.what_tried?.length > 100 ? '...' : ''}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSelectedGoal(goal)}
                      className="px-3 py-1.5 text-xs text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => handleAwardPoints(goal)}
                      className="px-3 py-1.5 text-xs text-green-600 border border-green-600 rounded hover:bg-green-50"
                    >
                      Award Pts
                    </button>
                  </div>
                </div>

                {/* Manager Rating (if set) */}
                {goal.manager_monthly_rating && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Your rating:</span>
                      <div
                        className={`w-3 h-3 rounded-full ${
                          goal.manager_monthly_rating === 'green'
                            ? 'bg-green-500'
                            : goal.manager_monthly_rating === 'yellow'
                            ? 'bg-yellow-400'
                            : 'bg-red-500'
                        }`}
                      />
                    </div>
                    {goal.manager_monthly_comment && (
                      <p className="text-xs text-gray-600 mt-1">
                        "{goal.manager_monthly_comment}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <GoalDetailModal
          goal={selectedGoal}
          profile={profile}
          onClose={() => setSelectedGoal(null)}
        />
      )}

      {/* Award Points Modal */}
      {showAwardModal && awardTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                Award Points
              </h3>
              <p className="text-sm text-gray-500">
                To: {awardTarget.employee_name}
              </p>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points to Award
                </label>
                <input
                  type="number"
                  value={awardPoints}
                  onChange={(e) => setAwardPoints(e.target.value)}
                  min="1"
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={awardReason}
                  onChange={(e) => setAwardReason(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowAwardModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={submitAward}
                disabled={!awardPoints || awardPointsMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {awardPointsMutation.isPending ? 'Awarding...' : 'Award Points'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
