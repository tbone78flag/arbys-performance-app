// src/components/goals/MonthEndReflection.jsx
import { useState } from 'react'
import { useSubmitReflection } from '../../hooks/useGoalsData'

const REFLECTION_PROMPTS = [
  {
    key: 'worked',
    question: 'What worked well?',
    example: 'Practicing during slow periods really helped. Having a specific time to focus made it easier to remember.',
    placeholder: 'What strategies or actions were effective...',
  },
  {
    key: 'didntWork',
    question: "What didn't work?",
    example: 'Trying to practice during rush hour was too stressful and I kept forgetting.',
    placeholder: 'What challenges did you face or what should you avoid...',
  },
  {
    key: 'change',
    question: 'What would you do differently next time?',
    example: 'I would set a reminder on my phone and ask a coworker to help hold me accountable.',
    placeholder: 'What adjustments would improve your approach...',
  },
]

export default function MonthEndReflection({ goal, onClose }) {
  const [reflection, setReflection] = useState({
    worked: '',
    didntWork: '',
    change: '',
  })

  const submitReflectionMutation = useSubmitReflection()

  const isValid = () => {
    return (
      reflection.worked.trim() &&
      reflection.didntWork.trim() &&
      reflection.change.trim()
    )
  }

  const handleSubmit = async () => {
    try {
      await submitReflectionMutation.mutateAsync({
        goalId: goal.id,
        reflection: {
          worked: reflection.worked.trim(),
          didntWork: reflection.didntWork.trim(),
          change: reflection.change.trim(),
        },
      })
      onClose()
    } catch (err) {
      console.error('Failed to submit reflection:', err)
    }
  }

  // Calculate progress stats
  const checkins = goal.checkins || []
  const totalWeeks = checkins.length
  const greenWeeks = checkins.filter(c => c.progress_rating === 'green').length
  const actionSteps = goal.action_steps || []
  const completedSteps = new Set()
  checkins.forEach(c => {
    (c.completed_actions || []).forEach(idx => completedSteps.add(idx))
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg my-8">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              End of Month Reflection
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
          {/* Progress Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Your Month at a Glance
            </h4>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {totalWeeks}
                </div>
                <div className="text-xs text-gray-500">Check-ins completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {greenWeeks}
                </div>
                <div className="text-xs text-gray-500">"Good progress" weeks</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">
                  {completedSteps.size}/{actionSteps.length}
                </div>
                <div className="text-xs text-gray-500">Action steps tried</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((totalWeeks / 4) * 100)}%
                </div>
                <div className="text-xs text-gray-500">Consistency rate</div>
              </div>
            </div>
          </div>

          {/* Reflection Questions */}
          {REFLECTION_PROMPTS.map((prompt) => (
            <div key={prompt.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {prompt.question}
              </label>
              <textarea
                value={reflection[prompt.key]}
                onChange={(e) =>
                  setReflection({ ...reflection, [prompt.key]: e.target.value })
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

          {/* Encouragement */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Nice work completing this month!</span>
              {' '}Your reflection will help you set an even better goal next month.
            </p>
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
            disabled={!isValid() || submitReflectionMutation.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitReflectionMutation.isPending ? 'Saving...' : 'Complete Goal'}
          </button>
        </div>

        {submitReflectionMutation.isError && (
          <p className="px-4 pb-4 text-sm text-red-600">
            Error: {submitReflectionMutation.error?.message || 'Failed to save reflection'}
          </p>
        )}
      </div>
    </div>
  )
}
