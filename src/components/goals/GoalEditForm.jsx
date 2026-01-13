// src/components/goals/GoalEditForm.jsx
import { useState } from 'react'
import { useUpdateGoal } from '../../hooks/useGoalsData'

const SMART_FIELDS = [
  { key: 'smart_specific', label: 'Specific', question: 'What exactly do you want to accomplish?' },
  { key: 'smart_measurable', label: 'Measurable', question: 'How will you know when you\'ve achieved it?' },
  { key: 'smart_achievable', label: 'Achievable', question: 'What resources or skills do you need?' },
  { key: 'smart_relevant', label: 'Relevant', question: 'Why is this goal important?' },
  { key: 'smart_timebound', label: 'Time-bound', question: 'What\'s your target date or milestone?' },
]

export default function GoalEditForm({ goal, onClose }) {
  const [goalText, setGoalText] = useState(goal.goal_text || '')
  const [smartAnswers, setSmartAnswers] = useState({
    smart_specific: goal.smart_specific || '',
    smart_measurable: goal.smart_measurable || '',
    smart_achievable: goal.smart_achievable || '',
    smart_relevant: goal.smart_relevant || '',
    smart_timebound: goal.smart_timebound || '',
  })
  const [actionSteps, setActionSteps] = useState(
    (goal.action_steps || []).map(s => s.step || s)
  )

  const updateGoalMutation = useUpdateGoal()

  const handleAddAction = () => {
    if (actionSteps.length < 4) {
      setActionSteps([...actionSteps, ''])
    }
  }

  const handleRemoveAction = (idx) => {
    if (actionSteps.length > 2) {
      setActionSteps(actionSteps.filter((_, i) => i !== idx))
    }
  }

  const handleActionChange = (idx, value) => {
    const updated = [...actionSteps]
    updated[idx] = value
    setActionSteps(updated)
  }

  const validateForm = () => {
    if (!goalText.trim()) return false
    if (!Object.values(smartAnswers).every(v => v.trim())) return false
    const filledActions = actionSteps.filter(a => a.trim())
    return filledActions.length >= 2
  }

  const handleSubmit = async () => {
    try {
      await updateGoalMutation.mutateAsync({
        goalId: goal.id,
        updates: {
          goal_text: goalText.trim(),
          ...smartAnswers,
          action_steps: actionSteps
            .filter(a => a.trim())
            .map((step, order) => ({ step: step.trim(), order })),
        },
      })
      onClose()
    } catch (err) {
      console.error('Failed to update goal:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              Edit {goal.goal_type === 'work' ? 'Work' : 'Personal'} Goal
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-amber-600 mt-1">
            You can edit your goal within the first week of creating it.
          </p>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Goal Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Goal
            </label>
            <textarea
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="What is your main goal?"
            />
          </div>

          {/* S.M.A.R.T. Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">S.M.A.R.T. Details</h4>
            {SMART_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <span className="text-red-600">{field.label[0]}</span>
                  {field.label.slice(1)}: {field.question}
                </label>
                <textarea
                  value={smartAnswers[field.key]}
                  onChange={(e) =>
                    setSmartAnswers({ ...smartAnswers, [field.key]: e.target.value })
                  }
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>

          {/* Action Steps */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action Steps (2-4 required)
            </label>
            <div className="space-y-2">
              {actionSteps.map((action, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-sm text-gray-400 pt-2">{idx + 1}.</span>
                  <input
                    type="text"
                    value={action}
                    onChange={(e) => handleActionChange(idx, e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    placeholder="Action step..."
                  />
                  {actionSteps.length > 2 && (
                    <button
                      onClick={() => handleRemoveAction(idx)}
                      className="text-red-500 hover:text-red-700 px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {actionSteps.length < 4 && (
              <button
                onClick={handleAddAction}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                + Add another action
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t sticky bottom-0 bg-white flex justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!validateForm() || updateGoalMutation.isPending}
            className="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateGoalMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {updateGoalMutation.isError && (
          <p className="px-4 pb-4 text-sm text-red-600">
            Error: {updateGoalMutation.error?.message || 'Failed to update goal'}
          </p>
        )}
      </div>
    </div>
  )
}
