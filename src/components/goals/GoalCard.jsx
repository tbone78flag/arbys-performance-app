// src/components/goals/GoalCard.jsx
import { useState, useMemo } from 'react'

const EDIT_WINDOW_DAYS = 7

export default function GoalCard({ goal, showEmployeeName = false, onViewDetail, onEdit }) {
  const [expanded, setExpanded] = useState(false)

  const actionSteps = goal.action_steps || []
  const checkins = goal.checkins || []

  // Check if goal is within the 3-day edit window
  const canEdit = useMemo(() => {
    if (!goal.created_at) return false
    const createdAt = new Date(goal.created_at)
    const now = new Date()
    const diffTime = now.getTime() - createdAt.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)
    return diffDays <= EDIT_WINDOW_DAYS && goal.status === 'active'
  }, [goal.created_at, goal.status])

  // Calculate days remaining for editing
  const daysLeftToEdit = useMemo(() => {
    if (!goal.created_at) return 0
    const createdAt = new Date(goal.created_at)
    const now = new Date()
    const diffTime = now.getTime() - createdAt.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)
    const remaining = EDIT_WINDOW_DAYS - diffDays
    return Math.max(0, Math.ceil(remaining))
  }, [goal.created_at])

  // Calculate completed action steps across all check-ins
  const completedSteps = new Set()
  checkins.forEach(c => {
    (c.completed_actions || []).forEach(idx => completedSteps.add(idx))
  })

  // Determine status color
  let statusColor = 'bg-blue-100 text-blue-800'
  if (goal.status === 'completed') statusColor = 'bg-green-100 text-green-800'
  else if (goal.status === 'abandoned') statusColor = 'bg-gray-100 text-gray-600'
  else if (goal.status === 'carried_over') statusColor = 'bg-amber-100 text-amber-800'

  // Manager rating color
  const getRatingColor = (rating) => {
    if (rating === 'green') return 'bg-green-500'
    if (rating === 'yellow') return 'bg-yellow-400'
    if (rating === 'red') return 'bg-red-500'
    return 'bg-gray-300'
  }

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {showEmployeeName && (
              <p className="text-xs text-gray-500 mb-1">{goal.employee_name}</p>
            )}
            <h4 className="font-medium text-gray-800">{goal.goal_text}</h4>
          </div>
          <div className="flex items-center gap-2">
            {goal.manager_monthly_rating && (
              <div
                className={`w-3 h-3 rounded-full ${getRatingColor(goal.manager_monthly_rating)}`}
                title={`Manager rating: ${goal.manager_monthly_rating}`}
              />
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>
              {goal.status}
            </span>
          </div>
        </div>

        {/* Edit Button (only within 3-day window) */}
        {canEdit && onEdit && (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => onEdit(goal)}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>✏️</span> Edit Goal
            </button>
            <span className="text-xs text-gray-400">
              ({daysLeftToEdit} day{daysLeftToEdit !== 1 ? 's' : ''} left to edit)
            </span>
          </div>
        )}

        {/* Action Steps Progress */}
        {actionSteps.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-1">
              Action Steps ({completedSteps.size}/{actionSteps.length})
            </p>
            <div className="flex gap-1">
              {actionSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`flex-1 h-2 rounded ${
                    completedSteps.has(idx) ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                  title={step.step}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 border-t flex items-center justify-center gap-1"
      >
        {expanded ? 'Show Less' : 'Show More'}
        <span className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t bg-gray-50 p-4 space-y-4">
          {/* S.M.A.R.T. Breakdown */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-gray-600 uppercase">Goal Details</h5>

            <div className="grid gap-2">
              <div>
                <span className="text-xs font-medium text-gray-500">Specific:</span>
                <p className="text-sm text-gray-700">{goal.smart_specific}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">Measurable:</span>
                <p className="text-sm text-gray-700">{goal.smart_measurable}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">Achievable:</span>
                <p className="text-sm text-gray-700">{goal.smart_achievable}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">Relevant:</span>
                <p className="text-sm text-gray-700">{goal.smart_relevant}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">Time-bound:</span>
                <p className="text-sm text-gray-700">{goal.smart_timebound}</p>
              </div>
            </div>
          </div>

          {/* Action Steps Detail */}
          {actionSteps.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-gray-600 uppercase">Action Steps</h5>
              <ul className="space-y-1">
                {actionSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className={`mt-0.5 ${completedSteps.has(idx) ? 'text-green-600' : 'text-gray-400'}`}>
                      {completedSteps.has(idx) ? '✓' : '○'}
                    </span>
                    <span className={`text-sm ${completedSteps.has(idx) ? 'text-gray-600 line-through' : 'text-gray-700'}`}>
                      {step.step}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reflection (if completed) */}
          {goal.reflection_worked && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-gray-600 uppercase">End of Month Reflection</h5>
              <div className="grid gap-2 text-sm">
                <div>
                  <span className="text-gray-500">What worked:</span>
                  <p className="text-gray-700">{goal.reflection_worked}</p>
                </div>
                <div>
                  <span className="text-gray-500">What didn't work:</span>
                  <p className="text-gray-700">{goal.reflection_didnt_work}</p>
                </div>
                <div>
                  <span className="text-gray-500">What to change:</span>
                  <p className="text-gray-700">{goal.reflection_change}</p>
                </div>
              </div>
            </div>
          )}

          {/* Manager Comment */}
          {goal.manager_monthly_comment && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <h5 className="text-xs font-semibold text-blue-800 uppercase mb-1">Manager Feedback</h5>
              <p className="text-sm text-blue-900">{goal.manager_monthly_comment}</p>
            </div>
          )}

          {/* View Detail Button (for managers) */}
          {onViewDetail && (
            <button
              onClick={() => onViewDetail(goal)}
              className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
            >
              View Full Details
            </button>
          )}
        </div>
      )}
    </div>
  )
}
