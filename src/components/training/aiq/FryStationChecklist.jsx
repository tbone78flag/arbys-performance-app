// src/components/training/aiq/FryStationChecklist.jsx
import { useState } from 'react'

// Observation items (10 checkboxes)
const OBSERVATION_ITEMS = [
  { field: 'fry_obs_1', description: 'Employee has completed the Learning Hub lesson and hands-on training session with Certified Trainer.' },
  { field: 'fry_obs_2', description: 'Stops task to serve guests immediately.' },
  { field: 'fry_obs_3', description: 'Wears a headset or works from the speaker system.' },
  { field: 'fry_obs_4', description: 'Bumps orders as soon as they are assembled and ready for pickup.' },
  { field: 'fry_obs_5', description: 'Follows safety procedures.' },
  { field: 'fry_obs_6', description: 'Portions product accurately: serves only top quality products.' },
  { field: 'fry_obs_7', description: 'Follows time ans temperature guidelines' },
  { field: 'fry_obs_8', description: 'Keeps station clean and sanitized - CAYG' },
  { field: 'fry_obs_9', description: 'Eager to help achieve service time goals-Hustle!' },
  { field: 'fry_obs_10', description: 'Uses correct tongs when handling products.' },
]

// Demonstration items (4 checkboxes)
const DEMONSTRATION_ITEMS = [
  { field: 'fry_demo_1', description: 'Wash hands.' },
  { field: 'fry_demo_2', description: 'How to prepare, hold and portion each product.' },
  { field: 'fry_demo_3', description: 'Fryer filtering, test shortening quality.' },
  { field: 'fry_demo_4', description: 'Follows proper fill levels in fry baskets.' },
]

// Knowledge items (6 numbered questions - informational only, not checkboxes)
const KNOWLEDGE_ITEMS = [
  { text: '1. How often should you wash your hands?' },
  { text: '2. What is the hold time for curly fries?' },
  { text: '3. What resource can you refer to if you do not remember a product hold time?' },
  { text: '4. What temperature must the fry freezer maintain?' },
  { text: '5. What is the temperature of the fryers?' },
  { text: '6. Explain how to use the bin charts.' },
]

// Get the list of database fields needed for this checklist
export function getFryStationFields() {
  return [
    ...OBSERVATION_ITEMS.map((item) => item.field),
    ...DEMONSTRATION_ITEMS.map((item) => item.field),
    'fry_knowledge_completed',
  ]
}

// Check if all items are completed
export function isFryStationComplete(session) {
  const observationComplete = OBSERVATION_ITEMS.every((item) => session[item.field])
  const demonstrationComplete = DEMONSTRATION_ITEMS.every((item) => session[item.field])
  const knowledgeComplete = session.fry_knowledge_completed
  return observationComplete && demonstrationComplete && knowledgeComplete
}

export default function FryStationChecklist({
  session,
  schedule,
  saving,
  onCheckboxChange,
  onComplete,
}) {
  const [trainersGuideOpen, setTrainersGuideOpen] = useState(false)
  const [observationOpen, setObservationOpen] = useState(true)
  const [demonstrationOpen, setDemonstrationOpen] = useState(true)
  const [knowledgeOpen, setKnowledgeOpen] = useState(true)

  const isComplete = isFryStationComplete(session)

  // Check section completion status
  const observationComplete = OBSERVATION_ITEMS.every((item) => session[item.field])
  const demonstrationComplete = DEMONSTRATION_ITEMS.every((item) => session[item.field])
  const knowledgeComplete = session.fry_knowledge_completed

  return (
    <>
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <p className="text-sm font-medium text-orange-800">
          Fry Station - AIQ Training
        </p>
        <p className="text-xs text-orange-600 mt-1">
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

      {/* Knowledge Section */}
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setKnowledgeOpen(!knowledgeOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-50 focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-800">Knowledge</span>
            {knowledgeComplete ? (
              <span className="text-green-600 text-sm">✓</span>
            ) : (
              <span className="text-red-500 text-sm">✗</span>
            )}
          </div>
          <span className={`transform transition-transform text-gray-500 ${knowledgeOpen ? 'rotate-90' : ''}`}>
            ▶
          </span>
        </button>
        {knowledgeOpen && (
          <div className="p-4 bg-white space-y-4 border-t">
            <div className="space-y-2">
              {KNOWLEDGE_ITEMS.map((item, idx) => (
                <div key={idx} className="text-sm text-gray-700">
                  <div className="py-1">
                    <span>{item.text}</span>
                  </div>
                </div>
              ))}
            </div>
            <label className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-100">
              <input
                type="checkbox"
                checked={session.fry_knowledge_completed || false}
                onChange={(e) => onCheckboxChange(session.id, 'fry_knowledge_completed', e.target.checked)}
                disabled={saving}
                className="mt-0.5 h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <div>
                <span className="text-sm font-medium text-orange-800">Knowledge Questions Completed</span>
                <p className="text-xs text-orange-600 mt-0.5">
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
