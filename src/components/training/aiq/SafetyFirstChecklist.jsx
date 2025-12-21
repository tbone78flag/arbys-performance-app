// src/components/training/aiq/SafetyFirstChecklist.jsx
import { useState } from 'react'

// Observation items (8 checkboxes)
const OBSERVATION_ITEMS = [
  { field: 'safety_obs_1', description: 'Employee has completed the Learning Hub lesson and hands-on training session with Certified Trainer.' },
  { field: 'safety_obs_2', description: 'Ensures hot foods are maintained at 135°F or above at all times (140°F if required by health department).' },
  { field: 'safety_obs_3', description: 'Ensures cold foods are maintained at 41°F or below at all times.' },
  { field: 'safety_obs_4', description: 'Properly cleans and sanitizes food and hand contact surfaces.' },
  { field: 'safety_obs_5', description: 'Maintains proper hygiene and appearances.' },
  { field: 'safety_obs_6', description: 'Uses approved chemicals properly.' },
  { field: 'safety_obs_7', description: 'Follows proper handwashing procedures.' },
  { field: 'safety_obs_8', description: 'Follows proper glove usage procedures.' },
]

// Demonstration items (4 checkboxes)
const DEMONSTRATION_ITEMS = [
  { field: 'safety_demo_1', description: 'Complete 4-hour cleaning process (excluding slicer).' },
  { field: 'safety_demo_2', description: 'Show location and explain how to use SDS.' },
  { field: 'safety_demo_3', description: 'Demonstrate proper method for changing gloves.' },
  { field: 'safety_demo_4', description: 'Change waters in compartment sink - test sanitizer strength.' },
]

// Questions (7 numbered items - informational only, not checkboxes)
const QUESTIONS = [
  { text: '1. How often should you wash your hands?' },
  { text: '2. What is cross-contamination?' },
  { text: '3. How often are sanitized waters changed?' },
  { text: '4. What is the temperature danger zone?' },
  { text: '5. Why is it important to complete the 4-hour cleaning?' },
  { text: '6. What are the two things that you can do to ensure personal safety when you are working?' },
  {
    text: '7. Identify all foods below that are primary causes for allergic reaction:',
    subItems: [
      'Milk/Dairy',
      'Shellfish',
      'Lettuce',
      'Pecans',
      'Fish',
      'French Fries',
      'Egg Products',
      'Peanut Products',
      'Soy Products',
      'Sesame Products',
      'Wheat Products',
    ],
  },
]

// Get the list of database fields needed for this checklist
export function getSafetyFirstFields() {
  return [
    ...OBSERVATION_ITEMS.map((item) => item.field),
    ...DEMONSTRATION_ITEMS.map((item) => item.field),
    'safety_questions_completed',
  ]
}

// Check if all safety first items are completed
export function isSafetyFirstComplete(session) {
  const observationComplete = OBSERVATION_ITEMS.every((item) => session[item.field])
  const demonstrationComplete = DEMONSTRATION_ITEMS.every((item) => session[item.field])
  const questionsComplete = session.safety_questions_completed
  return observationComplete && demonstrationComplete && questionsComplete
}

export default function SafetyFirstChecklist({
  session,
  schedule,
  saving,
  onCheckboxChange,
  onComplete,
}) {
  const [trainersGuideOpen, setTrainersGuideOpen] = useState(true)
  const isComplete = isSafetyFirstComplete(session)

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm font-medium text-blue-800">
          Arby's Safety First - AIQ Training
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Complete all sections for {schedule.trainee?.display_name}
        </p>
      </div>

      {/* Trainer's Guide Dropdown */}
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setTrainersGuideOpen(!trainersGuideOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-50 focus:outline-none"
        >
          <span className="font-medium text-sm text-gray-800">Trainer's Guide</span>
          <span className={`transform transition-transform text-gray-500 ${trainersGuideOpen ? 'rotate-90' : ''}`}>
            ▶
          </span>
        </button>

        {trainersGuideOpen && (
          <div className="p-4 bg-white space-y-6">
            {/* Observation Section */}
            <div>
              <h4 className="font-medium text-sm text-gray-800 mb-3 pb-2 border-b">
                Observation
              </h4>
              <div className="space-y-2">
                {OBSERVATION_ITEMS.map((item) => (
                  <label
                    key={item.field}
                    className="flex items-start gap-3 p-2 rounded cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={session[item.field] || false}
                      onChange={(e) => onCheckboxChange(session.id, item.field, e.target.checked)}
                      disabled={saving}
                      className="mt-0.5 h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">{item.description}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Demonstration Section */}
            <div>
              <h4 className="font-medium text-sm text-gray-800 mb-3 pb-2 border-b">
                Demonstration
              </h4>
              <div className="space-y-2">
                {DEMONSTRATION_ITEMS.map((item) => (
                  <label
                    key={item.field}
                    className="flex items-start gap-3 p-2 rounded cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={session[item.field] || false}
                      onChange={(e) => onCheckboxChange(session.id, item.field, e.target.checked)}
                      disabled={saving}
                      className="mt-0.5 h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">{item.description}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Questions Section */}
            <div>
              <h4 className="font-medium text-sm text-gray-800 mb-3 pb-2 border-b">
                Questions
              </h4>
              <div className="space-y-2 mb-4">
                {QUESTIONS.map((question, idx) => (
                  <div key={idx} className="text-sm text-gray-700">
                    <div className="py-1">
                      <span>{question.text}</span>
                    </div>
                    {question.subItems && question.subItems.length > 0 && (
                      <ul className="ml-4 mt-1 text-xs text-gray-500 space-y-0.5">
                        {question.subItems.map((subItem, subIdx) => (
                          <li key={subIdx} className="flex items-start gap-1">
                            <span className="text-gray-400">•</span>
                            <span>{subItem}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
              <label className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100">
                <input
                  type="checkbox"
                  checked={session.safety_questions_completed || false}
                  onChange={(e) => onCheckboxChange(session.id, 'safety_questions_completed', e.target.checked)}
                  disabled={saving}
                  className="mt-0.5 h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <div>
                  <span className="text-sm font-medium text-blue-800">Questions Completed</span>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Check this box after asking and discussing all questions with the trainee.
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Done Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => onComplete(session)}
          disabled={saving || !isComplete}
          className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Done'}
        </button>
      </div>
    </>
  )
}
