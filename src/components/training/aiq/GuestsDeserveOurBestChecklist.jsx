// src/components/training/aiq/GuestsDeserveOurBestChecklist.jsx
import { useState } from 'react'

// Observation items (9 checkboxes, 2nd has 6 dotted sub-items)
const OBSERVATION_ITEMS = [
  { field: 'gdob_obs_1', description: 'Employee has completed the Learning Hub lesson and hands-on training session with Certified Trainer.' },
  {
    field: 'gdob_obs_2',
    description: 'Demonstrates Delivering Our Best:',
    subItems: [
      'Bring Your Best Self',
      'Follow the Golden Rule',
      'Follow the Service Steps',
      'Create Happiness',
      'Build Guest Confidence',
      'Follow BLAST principles',
    ],
  },
  { field: 'gdob_obs_3', description: 'Welcoming, positive and eager to assist to our guests' },
  { field: 'gdob_obs_4', description: 'Proper uniform - shows pride and wears a smile' },
  { field: 'gdob_obs_5', description: 'Repeats large or complicated orders' },
  { field: 'gdob_obs_6', description: 'Offers sauces & ensures every order includes requested condiments' },
  { field: 'gdob_obs_7', description: 'Can explain menu items in a knowledgeable and appealing way' },
  { field: 'gdob_obs_8', description: 'Keeps guest view areas clean and well stocked' },
  { field: 'gdob_obs_9', description: 'Shows a sense of urgency and hustle to deliver on speed goals' },
]

// Demonstration items (1 checkbox)
const DEMONSTRATION_ITEMS = [
  { field: 'gdob_demo_1', description: 'Role play how to handle a guest complaint' },
]

// Questions (5 numbered items - informational only, not checkboxes)
const QUESTIONS = [
  { text: '1. How can you bring your best self?' },
  { text: '2. What are some ways to create happiness?' },
  { text: '3. How do you build guest confidence?' },
  { text: '4. Why do we repeat complicated orders?' },
  { text: '5. What are a few ways you can show hustle?' },
]

// Get the list of database fields needed for this checklist
export function getGuestsDeserveOurBestFields() {
  return [
    ...OBSERVATION_ITEMS.map((item) => item.field),
    ...DEMONSTRATION_ITEMS.map((item) => item.field),
    'gdob_questions_completed',
  ]
}

// Check if all items are completed
export function isGuestsDeserveOurBestComplete(session) {
  const observationComplete = OBSERVATION_ITEMS.every((item) => session[item.field])
  const demonstrationComplete = DEMONSTRATION_ITEMS.every((item) => session[item.field])
  const questionsComplete = session.gdob_questions_completed
  return observationComplete && demonstrationComplete && questionsComplete
}

export default function GuestsDeserveOurBestChecklist({
  session,
  schedule,
  saving,
  onCheckboxChange,
  onComplete,
}) {
  const [trainersGuideOpen, setTrainersGuideOpen] = useState(false)
  const [observationOpen, setObservationOpen] = useState(true)
  const [demonstrationOpen, setDemonstrationOpen] = useState(true)
  const [questionsOpen, setQuestionsOpen] = useState(true)

  const isComplete = isGuestsDeserveOurBestComplete(session)

  // Check section completion status
  const observationComplete = OBSERVATION_ITEMS.every((item) => session[item.field])
  const demonstrationComplete = DEMONSTRATION_ITEMS.every((item) => session[item.field])
  const questionsComplete = session.gdob_questions_completed

  return (
    <>
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <p className="text-sm font-medium text-green-800">
          Guests Deserve Our Best - AIQ Training
        </p>
        <p className="text-xs text-green-600 mt-1">
          Complete all sections for {schedule.trainee?.display_name}
        </p>
      </div>

      {/* Trainer's Guide Dropdown - placeholder for future content */}
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
          <div className="p-4 bg-white">
            <p className="text-sm text-gray-500 italic">
              Trainer's guide content coming soon...
            </p>
          </div>
        )}
      </div>

      {/* Observation Section */}
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setObservationOpen(!observationOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-50 focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-800">Observation</span>
            {observationComplete ? (
              <span className="text-green-600 text-sm">✓</span>
            ) : (
              <span className="text-red-500 text-sm">✗</span>
            )}
          </div>
          <span className={`transform transition-transform text-gray-500 ${observationOpen ? 'rotate-90' : ''}`}>
            ▶
          </span>
        </button>
        {observationOpen && (
          <div className="p-4 bg-white space-y-2 border-t">
            {OBSERVATION_ITEMS.map((item) => (
              <div key={item.field}>
                <label
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
                {item.subItems && item.subItems.length > 0 && (
                  <ul className="ml-10 mt-1 text-xs text-gray-500 space-y-0.5">
                    {item.subItems.map((subItem, subIdx) => (
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
        )}
      </div>

      {/* Demonstration Section */}
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setDemonstrationOpen(!demonstrationOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-50 focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-800">Demonstration</span>
            {demonstrationComplete ? (
              <span className="text-green-600 text-sm">✓</span>
            ) : (
              <span className="text-red-500 text-sm">✗</span>
            )}
          </div>
          <span className={`transform transition-transform text-gray-500 ${demonstrationOpen ? 'rotate-90' : ''}`}>
            ▶
          </span>
        </button>
        {demonstrationOpen && (
          <div className="p-4 bg-white space-y-2 border-t">
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
        )}
      </div>

      {/* Questions Section */}
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setQuestionsOpen(!questionsOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-50 focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-800">Questions</span>
            {questionsComplete ? (
              <span className="text-green-600 text-sm">✓</span>
            ) : (
              <span className="text-red-500 text-sm">✗</span>
            )}
          </div>
          <span className={`transform transition-transform text-gray-500 ${questionsOpen ? 'rotate-90' : ''}`}>
            ▶
          </span>
        </button>
        {questionsOpen && (
          <div className="p-4 bg-white space-y-4 border-t">
            <div className="space-y-2">
              {QUESTIONS.map((question, idx) => (
                <div key={idx} className="text-sm text-gray-700">
                  <div className="py-1">
                    <span>{question.text}</span>
                  </div>
                </div>
              ))}
            </div>
            <label className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100">
              <input
                type="checkbox"
                checked={session.gdob_questions_completed || false}
                onChange={(e) => onCheckboxChange(session.id, 'gdob_questions_completed', e.target.checked)}
                disabled={saving}
                className="mt-0.5 h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <div>
                <span className="text-sm font-medium text-green-800">Questions Completed</span>
                <p className="text-xs text-green-600 mt-0.5">
                  Check this box after asking and discussing all questions with the trainee.
                </p>
              </div>
            </label>
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
