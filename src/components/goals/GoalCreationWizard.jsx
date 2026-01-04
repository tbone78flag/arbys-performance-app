// src/components/goals/GoalCreationWizard.jsx
import { useState } from 'react'
import { useCreateGoal, usePreviousGoal, getCurrentPeriod } from '../../hooks/useGoalsData'

const SMART_QUESTIONS = [
  {
    key: 'smart_specific',
    label: 'Specific',
    question: 'What exactly do you want to accomplish?',
    example: "Instead of 'get better at customer service', try 'Greet every drive-thru customer within 5 seconds with a smile and use their name if I see it on the order'",
    placeholder: 'Be specific about what you want to achieve...',
  },
  {
    key: 'smart_measurable',
    label: 'Measurable',
    question: 'How will you know when you\'ve achieved it?',
    example: "I'll track how many customers I greet within 5 seconds each shift. Goal: 90% of customers",
    placeholder: 'How will you measure your progress...',
  },
  {
    key: 'smart_achievable',
    label: 'Achievable',
    question: 'What resources or skills do you need? Is this realistic?',
    example: 'I need to practice reading orders quickly. I can ask my trainer for tips.',
    placeholder: 'What do you need to accomplish this...',
  },
  {
    key: 'smart_relevant',
    label: 'Relevant',
    question: 'Why is this goal important to you or the team?',
    example: 'Faster greetings improve our speed scores and make customers feel welcomed',
    placeholder: 'Why does this goal matter...',
  },
  {
    key: 'smart_timebound',
    label: 'Time-bound',
    question: "What's your target date or milestone within this month?",
    example: "By the 15th, I want to hit 90% consistently. By month end, it should be habit.",
    placeholder: 'Set target dates within this month...',
  },
]

export default function GoalCreationWizard({ profile, goalType, onClose, onComplete }) {
  const [step, setStep] = useState(1) // 1: Continue/New, 2: Goal + SMART, 3: Actions, 4: Review
  const [continuationChoice, setContinuationChoice] = useState(null)

  // Form data
  const [goalText, setGoalText] = useState('')
  const [smartAnswers, setSmartAnswers] = useState({
    smart_specific: '',
    smart_measurable: '',
    smart_achievable: '',
    smart_relevant: '',
    smart_timebound: '',
  })
  const [actionSteps, setActionSteps] = useState(['', ''])

  const { data: previousGoal, isLoading: loadingPrevious } = usePreviousGoal(profile?.id, goalType)
  const createGoalMutation = useCreateGoal()

  const { periodStart } = getCurrentPeriod()
  const monthLabel = periodStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  // If there's a previous goal and we're on step 1, show continuation choice
  const showContinuationStep = previousGoal && step === 1

  const handleContinue = (choice) => {
    setContinuationChoice(choice)
    if (choice === 'continue') {
      // Pre-fill with previous goal data
      setGoalText(previousGoal.goal_text)
      setSmartAnswers({
        smart_specific: previousGoal.smart_specific,
        smart_measurable: previousGoal.smart_measurable,
        smart_achievable: previousGoal.smart_achievable,
        smart_relevant: previousGoal.smart_relevant,
        smart_timebound: previousGoal.smart_timebound,
      })
      setActionSteps(previousGoal.action_steps?.map(s => s.step) || ['', ''])
    } else if (choice === 'adjust') {
      // Pre-fill but let them edit
      setGoalText(previousGoal.goal_text)
      setSmartAnswers({
        smart_specific: previousGoal.smart_specific,
        smart_measurable: previousGoal.smart_measurable,
        smart_achievable: previousGoal.smart_achievable,
        smart_relevant: previousGoal.smart_relevant,
        smart_timebound: previousGoal.smart_timebound,
      })
      setActionSteps(previousGoal.action_steps?.map(s => s.step) || ['', ''])
    }
    // For 'new', leave everything blank
    setStep(2)
  }

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

  const validateStep2 = () => {
    if (!goalText.trim()) return false
    return Object.values(smartAnswers).every(v => v.trim())
  }

  const validateStep3 = () => {
    const filledActions = actionSteps.filter(a => a.trim())
    return filledActions.length >= 2
  }

  const handleSubmit = async () => {
    try {
      await createGoalMutation.mutateAsync({
        employee_id: profile.id,
        location_id: profile.location_id,
        goal_type: goalType,
        goal_text: goalText.trim(),
        ...smartAnswers,
        action_steps: actionSteps
          .filter(a => a.trim())
          .map((step, order) => ({ step: step.trim(), order })),
        previous_goal_id: previousGoal?.id || null,
        continuation_choice: continuationChoice || 'new',
      })
      onComplete()
    } catch (err) {
      console.error('Failed to create goal:', err)
    }
  }

  // Loading previous goal check
  if (loadingPrevious) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg my-8">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              Set Your {goalType === 'work' ? 'Work' : 'Personal'} Goal
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-500">{monthLabel}</p>
        </div>

        {/* Progress Indicator */}
        <div className="px-4 pt-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`flex-1 h-1 rounded ${
                  s <= step ? 'bg-red-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Step {step} of 4
          </p>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Step 1: Continuation Choice */}
          {showContinuationStep && (
            <div className="space-y-4">
              <div className="bg-gray-50 border rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Last month's goal:</p>
                <p className="font-medium text-gray-800">{previousGoal.goal_text}</p>
              </div>

              <p className="text-sm text-gray-700">
                Would you like to continue, adjust, or set a new goal?
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => handleContinue('continue')}
                  className="w-full p-3 border rounded-lg text-left hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-800">Continue as-is</span>
                  <p className="text-xs text-gray-500">Keep the same goal and actions</p>
                </button>

                <button
                  onClick={() => handleContinue('adjust')}
                  className="w-full p-3 border rounded-lg text-left hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-800">Adjust it</span>
                  <p className="text-xs text-gray-500">Modify the goal based on what you learned</p>
                </button>

                <button
                  onClick={() => handleContinue('new')}
                  className="w-full p-3 border rounded-lg text-left hover:bg-gray-50"
                >
                  <span className="font-medium text-gray-800">Start fresh</span>
                  <p className="text-xs text-gray-500">Set a completely new goal</p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Goal + S.M.A.R.T. (or Step 1 if no previous goal) */}
          {((step === 2) || (!previousGoal && step === 1)) && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {/* Goal Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What is your main {goalType === 'work' ? 'work' : 'personal'} goal for this month?
                </label>
                <textarea
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder={
                    goalType === 'work'
                      ? 'e.g., Improve my drive-thru greeting speed'
                      : 'e.g., Read one book this month'
                  }
                />
              </div>

              {/* S.M.A.R.T. Questions */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-800 mb-3">
                  Let's make it a S.M.A.R.T. goal:
                </p>

                {SMART_QUESTIONS.map((q) => (
                  <div key={q.key} className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <span className="text-red-600">{q.label[0]}</span>
                      {q.label.slice(1)}: {q.question}
                    </label>
                    <textarea
                      value={smartAnswers[q.key]}
                      onChange={(e) =>
                        setSmartAnswers({ ...smartAnswers, [q.key]: e.target.value })
                      }
                      rows={2}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder={q.placeholder}
                    />
                    <p className="text-xs text-gray-400 italic mt-1">
                      Example: {q.example}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Action Steps */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What 2-4 actions will you take each week to make progress?
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  These should be specific things you can do during a normal work week.
                </p>
              </div>

              <div className="space-y-3">
                {actionSteps.map((action, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-sm text-gray-400 pt-2">{idx + 1}.</span>
                    <input
                      type="text"
                      value={action}
                      onChange={(e) => handleActionChange(idx, e.target.value)}
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      placeholder={
                        idx === 0
                          ? 'e.g., Practice reading orders faster during first hour'
                          : idx === 1
                          ? 'e.g., Ask a coworker to time my greetings'
                          : 'Add another action...'
                      }
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
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add another action
                </button>
              )}

              <p className="text-xs text-gray-400 italic">
                Tip: Good action steps are things you control. "Get faster times" is a result.
                "Practice during slow periods" is an action you can take.
              </p>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Your Goal:</p>
                  <p className="font-medium text-gray-800">{goalText}</p>
                </div>

                <div className="border-t pt-3 grid gap-2">
                  {SMART_QUESTIONS.map((q) => (
                    <div key={q.key}>
                      <p className="text-xs text-gray-500">{q.label}:</p>
                      <p className="text-sm text-gray-700">{smartAnswers[q.key]}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3">
                  <p className="text-xs text-gray-500 mb-1">Weekly Actions:</p>
                  <ul className="space-y-1">
                    {actionSteps.filter(a => a.trim()).map((action, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-gray-400">{idx + 1}.</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Look good? You'll get weekly reminders to check in on your progress.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between">
          {step > 1 && !showContinuationStep && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Back
            </button>
          )}

          {showContinuationStep ? (
            <div /> // Empty div for spacing
          ) : step < 4 || (!previousGoal && step === 1) ? (
            <button
              onClick={() => {
                if (!previousGoal && step === 1) {
                  setStep(2)
                } else if (step === 2 && validateStep2()) {
                  setStep(3)
                } else if (step === 3 && validateStep3()) {
                  setStep(4)
                }
              }}
              disabled={
                (step === 2 && !validateStep2()) ||
                (step === 3 && !validateStep3())
              }
              className="ml-auto px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!previousGoal && step === 1 ? 'Get Started' : 'Next'}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createGoalMutation.isPending}
              className="ml-auto px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {createGoalMutation.isPending ? 'Saving...' : 'Set This Goal'}
            </button>
          )}
        </div>

        {createGoalMutation.isError && (
          <p className="px-4 pb-4 text-sm text-red-600">
            Error: {createGoalMutation.error?.message || 'Failed to save goal'}
          </p>
        )}
      </div>
    </div>
  )
}
