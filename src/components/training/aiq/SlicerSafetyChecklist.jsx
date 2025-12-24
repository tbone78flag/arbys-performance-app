// src/components/training/aiq/SlicerSafetyChecklist.jsx
import { useState } from 'react'

// Section I - Training / Video Acknowledgement (1 checkbox)
const SECTION_1_ITEMS = [
  { field: 'slicer_sec1_1', description: 'Employee has completed the Learning Hub lesson and hands-on training session with Certified Trainer.' },
]

// Section II - Knowledge Verification - Slicer Safety (8 checkboxes)
const SECTION_2_ITEMS = [
  { field: 'slicer_sec2_1', description: 'Explain the various slicer parts and describe what functions they each have.' },
  { field: 'slicer_sec2_2', description: 'Why are stainless steel safety gloves used?' },
  { field: 'slicer_sec2_3', description: 'Why must the slicer thickness dial be closed prior to completing certain tasks?' },
  { field: 'slicer_sec2_4', description: 'Why must the meat gripper be used when progressing the beef / meat block?' },
  { field: 'slicer_sec2_5', description: 'Describe each step required when preparing to disassemble the slicer?' },
  { field: 'slicer_sec2_6', description: 'Why must the sliced meat fall onto the receiving tray before reaching for it?' },
  { field: 'slicer_sec2_7', description: 'How often must the slicer be cleaned and sanitized? What solution is used to clean it?' },
  { field: 'slicer_sec2_8', description: 'When must you notify a manager regarding the slicer?' },
]

// Section III - Skill Demonstration (6 checkboxes)
const SECTION_3_ITEMS = [
  { field: 'slicer_sec3_1', description: 'Disassemble the slicer.' },
  { field: 'slicer_sec3_2', description: 'Clean the slicer.' },
  { field: 'slicer_sec3_3', description: 'Assemble the slicer.' },
  { field: 'slicer_sec3_4', description: 'Adjust the thickness dial.' },
  { field: 'slicer_sec3_5', description: 'Adjust the speed.' },
  { field: 'slicer_sec3_6', description: 'Load a roast/meat block.' },
]

// Section IV - Skill Observation and Certification (1 checkbox)
const SECTION_4_ITEMS = [
  { field: 'slicer_sec4_1', description: 'Shows full attention while operating the slicer - never leaves the slicer unattended.' },
  { field: 'slicer_sec4_2', description: 'Wears stainless steel safety glove, covered by a vinyl glove as required.' },
  { field: 'slicer_sec4_3', description: 'Adjust the slice thickness dial to zero as appropriate (based on specific tasks).' },
  { field: 'slicer_sec4_4', description: 'Turns slicer off, and unplugs prior to completing a task that requires this action.' },
  { field: 'slicer_sec4_5', description: 'Handles the slicer / slicer parts properly and in accordance to the OSM guidelines.' },
  { field: 'slicer_sec4_6', description: 'Waits for sliced beef / food products to fall onto the receiving tray before removing.' },
]

// Get the list of database fields needed for this checklist
export function getSlicerSafetyFields() {
  return [
    ...SECTION_1_ITEMS.map((item) => item.field),
    ...SECTION_2_ITEMS.map((item) => item.field),
    ...SECTION_3_ITEMS.map((item) => item.field),
    ...SECTION_4_ITEMS.map((item) => item.field),
  ]
}

// Check if all items are completed
export function isSlicerSafetyComplete(session) {
  const sec1Complete = SECTION_1_ITEMS.every((item) => session[item.field])
  const sec2Complete = SECTION_2_ITEMS.every((item) => session[item.field])
  const sec3Complete = SECTION_3_ITEMS.every((item) => session[item.field])
  const sec4Complete = SECTION_4_ITEMS.every((item) => session[item.field])
  return sec1Complete && sec2Complete && sec3Complete && sec4Complete
}

export default function SlicerSafetyChecklist({
  session,
  schedule,
  saving,
  onCheckboxChange,
  onComplete,
}) {
  const [trainersGuideOpen, setTrainersGuideOpen] = useState(false)
  const [section1Open, setSection1Open] = useState(true)
  const [section2Open, setSection2Open] = useState(true)
  const [section3Open, setSection3Open] = useState(true)
  const [section4Open, setSection4Open] = useState(false)

  const isComplete = isSlicerSafetyComplete(session)

  // Check section completion status
  const section1Complete = SECTION_1_ITEMS.every((item) => session[item.field])
  const section2Complete = SECTION_2_ITEMS.every((item) => session[item.field])
  const section3Complete = SECTION_3_ITEMS.every((item) => session[item.field])
  const section4Complete = SECTION_4_ITEMS.every((item) => session[item.field])

  // Sections 1-3 must be complete before Section 4 can be opened
  const sections1Through3Complete = section1Complete && section2Complete && section3Complete

  return (
    <>
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-sm font-medium text-red-800">
          Slicer Safety - AIQ Training
        </p>
        <p className="text-xs text-red-600 mt-1">
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

      {/* Section I - Training / Video Acknowledgement */}
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setSection1Open(!section1Open)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-50 focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-800">Section I - Training / Video Acknowledgement</span>
            {section1Complete ? (
              <span className="text-green-600 text-sm">✓</span>
            ) : (
              <span className="text-red-500 text-sm">✗</span>
            )}
          </div>
          <span className={`transform transition-transform text-gray-500 ${section1Open ? 'rotate-90' : ''}`}>
            ▶
          </span>
        </button>
        {section1Open && (
          <div className="p-4 bg-white space-y-2 border-t">
            {SECTION_1_ITEMS.map((item) => (
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

      {/* Section II - Knowledge Verification - Slicer Safety */}
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setSection2Open(!section2Open)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-50 focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-800">Section II - Knowledge Verification - Slicer Safety</span>
            {section2Complete ? (
              <span className="text-green-600 text-sm">✓</span>
            ) : (
              <span className="text-red-500 text-sm">✗</span>
            )}
          </div>
          <span className={`transform transition-transform text-gray-500 ${section2Open ? 'rotate-90' : ''}`}>
            ▶
          </span>
        </button>
        {section2Open && (
          <div className="p-4 bg-white space-y-2 border-t">
            {SECTION_2_ITEMS.map((item) => (
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

      {/* Section III - Skill Demonstration */}
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setSection3Open(!section3Open)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-50 focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-800">Section III - Skill Demonstration</span>
            {section3Complete ? (
              <span className="text-green-600 text-sm">✓</span>
            ) : (
              <span className="text-red-500 text-sm">✗</span>
            )}
          </div>
          <span className={`transform transition-transform text-gray-500 ${section3Open ? 'rotate-90' : ''}`}>
            ▶
          </span>
        </button>
        {section3Open && (
          <div className="p-4 bg-white space-y-2 border-t">
            {SECTION_3_ITEMS.map((item) => (
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

      {/* Warning Message */}
      <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
        <p className="text-sm font-bold text-yellow-800">
          Sections I-III above must be completed satisfactorily prior to operating the slicer for skill observation & certification.
        </p>
      </div>

      {/* Section IV - Skill Observation and Certification */}
      <div className={`border rounded-lg overflow-hidden ${!sections1Through3Complete ? 'opacity-50' : ''}`}>
        <button
          type="button"
          onClick={() => sections1Through3Complete && setSection4Open(!section4Open)}
          disabled={!sections1Through3Complete}
          className={`w-full flex items-center justify-between px-4 py-3 bg-gray-100 focus:outline-none ${sections1Through3Complete ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-not-allowed'}`}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-800">Section IV - Skill Observation and Certification</span>
            {section4Complete ? (
              <span className="text-green-600 text-sm">✓</span>
            ) : (
              <span className="text-red-500 text-sm">✗</span>
            )}
            {!sections1Through3Complete && (
              <span className="text-xs text-gray-500 italic ml-2">(Complete Sections I-III first)</span>
            )}
          </div>
          <span className={`transform transition-transform text-gray-500 ${section4Open ? 'rotate-90' : ''}`}>
            ▶
          </span>
        </button>
        {section4Open && sections1Through3Complete && (
          <div className="p-4 bg-white space-y-2 border-t">
            {SECTION_4_ITEMS.map((item) => (
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
