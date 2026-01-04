// src/components/goals/WeeklyCheckInForm.jsx
import { useState } from 'react'
import { useSubmitCheckin } from '../../hooks/useGoalsData'

const CHECKIN_PROMPTS = [
  {
    key: 'what_tried',
    question: 'What did you try this week?',
    example: 'I practiced reading the order screen faster and started greeting before the car fully pulled up',
    placeholder: 'Describe what actions you took this week...',
  },
  {
    key: 'did_it_help',
    question: 'Did it help?',
    example: 'Yes! I noticed customers seemed happier and my greeting times dropped from 8 seconds to about 4',
    placeholder: 'Reflect on whether your actions made a difference...',
  },
  {
    key: 'next_week_plan',
    question: 'What will you do different or the same next week?',
    example: 'Same approach, but I want to add using customer names more. I\'ll look for names on mobile orders.',
    placeholder: 'Plan your approach for next week...',
  },
]

export default function WeeklyCheckInForm({ goal, weekNumber, onClose }) {
  const [answers, setAnswers] = useState({
    what_tried: '',
    did_it_help: '',
    next_week_plan: '',
  })
  const [completedActions, setCompletedActions] = useState([])
  const [progressRating, setProgressRating] = useState(null)

  const submitCheckinMutation = useSubmitCheckin()

  const actionSteps = goal.action_steps || []

  const handleToggleAction = (idx) => {
    if (completedActions.includes(idx)) {
      setCompletedActions(completedActions.filter(i => i !== idx))
    } else {
      setCompletedActions([...completedActions, idx])
    }
  }

  const isValid = () => {
    return (
      answers.what_tried.trim() &&
      answers.did_it_help.trim() &&
      answers.next_week_plan.trim() &&
      progressRating
    )
  }

  const handleSubmit = async () => {
    try {
      await submitCheckinMutation.mutateAsync({
        goal_id: goal.id,
        week_number: weekNumber,
        what_tried: answers.what_tried.trim(),
        did_it_help: answers.did_it_help.trim(),
        next_week_plan: answers.next_week_plan.trim(),
        completed_actions: completedActions,
        progress_rating: progressRating,
      })
      onClose()
    } catch (err) {
      console.error('Failed to submit check-in:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg my-8">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              Week {weekNumber} Check-In
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Goal: {goal.goal_text}
          </p>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Action Steps Checklist */}
          {actionSteps.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Which action steps did you work on this week?
              </label>
              <div className="space-y-2">
                {actionSteps.map((step, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={completedActions.includes(idx)}
                      onChange={() => handleToggleAction(idx)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{step.step}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Check-in Questions */}
          {CHECKIN_PROMPTS.map((prompt) => (
            <div key={prompt.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {prompt.question}
              </label>
              <textarea
                value={answers[prompt.key]}
                onChange={(e) =>
                  setAnswers({ ...answers, [prompt.key]: e.target.value })
                }
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder={prompt.placeholder}
              />
              <p className="text-xs text-gray-400 italic mt-1">
                Example: {prompt.example}
              </p>
            </div>
          ))}

          {/* Progress Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How do you feel about your progress this week?
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setProgressRating('green')}
                className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                  progressRating === 'green'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="text-2xl mb-1">😊</div>
                <div className="text-xs font-medium text-green-700">
                  Good Progress
                </div>
              </button>

              <button
                onClick={() => setProgressRating('yellow')}
                className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                  progressRating === 'yellow'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-yellow-300'
                }`}
              >
                <div className="text-2xl mb-1">😐</div>
                <div className="text-xs font-medium text-yellow-700">
                  Mixed/Okay
                </div>
              </button>

              <button
                onClick={() => setProgressRating('red')}
                className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                  progressRating === 'red'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <div className="text-2xl mb-1">😟</div>
                <div className="text-xs font-medium text-red-700">
                  Struggling
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={!isValid() || submitCheckinMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitCheckinMutation.isPending ? 'Saving...' : 'Submit Check-In'}
          </button>
        </div>

        {submitCheckinMutation.isError && (
          <p className="px-4 pb-4 text-sm text-red-600">
            Error: {submitCheckinMutation.error?.message || 'Failed to save check-in'}
          </p>
        )}
      </div>
    </div>
  )
}
