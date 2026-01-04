// src/components/goals/GoalDetailModal.jsx
import { useState } from 'react'
import { useGoalDetail, useAddManagerComment } from '../../hooks/useGoalsData'

export default function GoalDetailModal({ goal, profile, onClose }) {
  const [activeTab, setActiveTab] = useState('overview') // 'overview', 'checkins', 'feedback'
  const [monthlyComment, setMonthlyComment] = useState(goal.manager_monthly_comment || '')
  const [monthlyRating, setMonthlyRating] = useState(goal.manager_monthly_rating || null)
  const [weeklyComments, setWeeklyComments] = useState({})

  const { data: goalDetail, isLoading } = useGoalDetail(goal.id)
  const addCommentMutation = useAddManagerComment()

  const fullGoal = goalDetail || goal
  const actionSteps = fullGoal.action_steps || []
  const checkins = fullGoal.checkins || []

  // Calculate completed action steps across all check-ins
  const completedSteps = new Set()
  checkins.forEach(c => {
    (c.completed_actions || []).forEach(idx => completedSteps.add(idx))
  })

  const handleSaveMonthlyFeedback = async () => {
    try {
      await addCommentMutation.mutateAsync({
        type: 'goal',
        id: goal.id,
        comment: monthlyComment,
        rating: monthlyRating,
      })
    } catch (err) {
      console.error('Failed to save feedback:', err)
    }
  }

  const handleSaveWeeklyComment = async (checkinId, comment, rating) => {
    try {
      await addCommentMutation.mutateAsync({
        type: 'checkin',
        id: checkinId,
        comment,
        rating,
      })
    } catch (err) {
      console.error('Failed to save weekly comment:', err)
    }
  }

  const getRatingColor = (rating) => {
    if (rating === 'green') return 'bg-green-500'
    if (rating === 'yellow') return 'bg-yellow-400'
    if (rating === 'red') return 'bg-red-500'
    return 'bg-gray-300'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{fullGoal.employee_name}</p>
              <h3 className="text-lg font-semibold text-gray-800">
                {fullGoal.goal_text}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                fullGoal.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : fullGoal.status === 'active'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {fullGoal.status}
            </span>
            <span className="text-xs text-gray-400">
              • {checkins.length} check-in{checkins.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {['overview', 'checkins', 'feedback'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* S.M.A.R.T. Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">S.M.A.R.T. Goal Details</h4>
                    <div className="grid gap-3 text-sm">
                      <div className="bg-gray-50 rounded p-3">
                        <span className="font-medium text-gray-600">Specific:</span>
                        <p className="text-gray-800">{fullGoal.smart_specific}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <span className="font-medium text-gray-600">Measurable:</span>
                        <p className="text-gray-800">{fullGoal.smart_measurable}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <span className="font-medium text-gray-600">Achievable:</span>
                        <p className="text-gray-800">{fullGoal.smart_achievable}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <span className="font-medium text-gray-600">Relevant:</span>
                        <p className="text-gray-800">{fullGoal.smart_relevant}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <span className="font-medium text-gray-600">Time-bound:</span>
                        <p className="text-gray-800">{fullGoal.smart_timebound}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Steps */}
                  {actionSteps.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-700">
                        Action Steps ({completedSteps.size}/{actionSteps.length} completed)
                      </h4>
                      <ul className="space-y-1">
                        {actionSteps.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span
                              className={`mt-0.5 ${
                                completedSteps.has(idx) ? 'text-green-600' : 'text-gray-400'
                              }`}
                            >
                              {completedSteps.has(idx) ? '✓' : '○'}
                            </span>
                            <span
                              className={
                                completedSteps.has(idx)
                                  ? 'text-gray-600 line-through'
                                  : 'text-gray-800'
                              }
                            >
                              {step.step}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Reflection (if completed) */}
                  {fullGoal.reflection_worked && (
                    <div className="space-y-2 border-t pt-4">
                      <h4 className="text-sm font-semibold text-gray-700">End of Month Reflection</h4>
                      <div className="grid gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">What worked:</span>
                          <p className="text-gray-800">{fullGoal.reflection_worked}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">What didn't work:</span>
                          <p className="text-gray-800">{fullGoal.reflection_didnt_work}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">What to change:</span>
                          <p className="text-gray-800">{fullGoal.reflection_change}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Check-ins Tab */}
              {activeTab === 'checkins' && (
                <div className="space-y-4">
                  {checkins.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No check-ins yet this month.
                    </p>
                  ) : (
                    checkins.map((checkin) => (
                      <div
                        key={checkin.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">
                              Week {checkin.week_number}
                            </span>
                            {checkin.progress_rating && (
                              <div
                                className={`w-3 h-3 rounded-full ${getRatingColor(
                                  checkin.progress_rating
                                )}`}
                                title={`Self-rating: ${checkin.progress_rating}`}
                              />
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(checkin.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Responses */}
                        <div className="grid gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">What they tried:</span>
                            <p className="text-gray-800">{checkin.what_tried}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Did it help?</span>
                            <p className="text-gray-800">{checkin.did_it_help}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Next week plan:</span>
                            <p className="text-gray-800">{checkin.next_week_plan}</p>
                          </div>
                        </div>

                        {/* Manager Comment Section */}
                        <div className="border-t pt-3">
                          {checkin.manager_comment ? (
                            <div className="bg-blue-50 rounded p-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-blue-800">
                                  Your feedback:
                                </span>
                                {checkin.manager_rating && (
                                  <div
                                    className={`w-2 h-2 rounded-full ${getRatingColor(
                                      checkin.manager_rating
                                    )}`}
                                  />
                                )}
                              </div>
                              <p className="text-sm text-blue-900">
                                {checkin.manager_comment}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="Add a comment for this check-in..."
                                className="w-full border rounded px-3 py-1.5 text-sm"
                                value={weeklyComments[checkin.id]?.comment || ''}
                                onChange={(e) =>
                                  setWeeklyComments({
                                    ...weeklyComments,
                                    [checkin.id]: {
                                      ...weeklyComments[checkin.id],
                                      comment: e.target.value,
                                    },
                                  })
                                }
                              />
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Rate:</span>
                                {['green', 'yellow', 'red'].map((r) => (
                                  <button
                                    key={r}
                                    onClick={() =>
                                      setWeeklyComments({
                                        ...weeklyComments,
                                        [checkin.id]: {
                                          ...weeklyComments[checkin.id],
                                          rating: r,
                                        },
                                      })
                                    }
                                    className={`w-4 h-4 rounded-full ${getRatingColor(r)} ${
                                      weeklyComments[checkin.id]?.rating === r
                                        ? 'ring-2 ring-offset-1 ring-gray-400'
                                        : ''
                                    }`}
                                  />
                                ))}
                                <button
                                  onClick={() =>
                                    handleSaveWeeklyComment(
                                      checkin.id,
                                      weeklyComments[checkin.id]?.comment,
                                      weeklyComments[checkin.id]?.rating
                                    )
                                  }
                                  disabled={!weeklyComments[checkin.id]?.comment}
                                  className="ml-auto text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Feedback Tab */}
              {activeTab === 'feedback' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Monthly Feedback
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">
                      This feedback will be visible to the employee.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Overall Rating
                        </label>
                        <div className="flex gap-3">
                          {[
                            { value: 'green', label: 'Great Progress', emoji: '😊' },
                            { value: 'yellow', label: 'Mixed/Okay', emoji: '😐' },
                            { value: 'red', label: 'Needs Support', emoji: '😟' },
                          ].map((r) => (
                            <button
                              key={r.value}
                              onClick={() => setMonthlyRating(r.value)}
                              className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                                monthlyRating === r.value
                                  ? r.value === 'green'
                                    ? 'border-green-500 bg-green-50'
                                    : r.value === 'yellow'
                                    ? 'border-yellow-500 bg-yellow-50'
                                    : 'border-red-500 bg-red-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="text-xl mb-1">{r.emoji}</div>
                              <div className="text-xs font-medium">{r.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Your Comment
                        </label>
                        <textarea
                          value={monthlyComment}
                          onChange={(e) => setMonthlyComment(e.target.value)}
                          rows={4}
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                          placeholder="Share feedback on their goal progress..."
                        />
                      </div>

                      <button
                        onClick={handleSaveMonthlyFeedback}
                        disabled={addCommentMutation.isPending}
                        className="w-full py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {addCommentMutation.isPending ? 'Saving...' : 'Save Feedback'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
