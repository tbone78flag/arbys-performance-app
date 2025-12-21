// src/components/training/aiq/OrientationChecklist.jsx

// Define the checklist sections for Orientation training
// Each section has ONE checkbox, with items/subItems as informational text
const ORIENTATION_SECTIONS = [
  {
    field: 'orientation_welcome',
    title: 'Welcome',
    items: [
      { description: 'Introductions to the team' },
      { description: 'Receive uniform and Team Takeaway Booklet' },
    ],
  },
  {
    field: 'orientation_tour',
    title: 'Restaurant Tour',
    items: [
      {
        description: 'Exterior',
        subItems: [
          'Guest perception',
          'Parking lot',
          'Dumpster / waste area',
          'Drive-thru',
        ],
      },
      {
        description: 'Dining Room/Lobby',
        subItems: [
          'Guest perception',
          'Safety',
          'Condiments',
          'Restrooms',
        ],
      },
      {
        description: 'Frontline',
        subItems: [
          'Guest perception (employee greetings, smiles, eye contact, thanks and cleanliness)',
          'Equipment review',
        ],
      },
      {
        description: 'Fry Station',
        subItems: [
          'Safety (fryer age and safety procedures)',
          'Hot oil, fire extinguisher, ansul system location',
          'Equipment review',
        ],
      },
      {
        description: 'Backline',
        subItems: [
          'Safety (slicer age and safety procedures)',
          'Equipment review',
        ],
      },
      { description: 'Kitchen Safety' },
      {
        description: 'Storage/Break Area',
        subItems: [
          'Safety (lifting properly, organization)',
          'Dry storage',
          'Cooler / freezer door release system',
          'Back door exit (see OSM for guidelines)',
        ],
      },
    ],
  },
  {
    field: 'orientation_benefits',
    title: 'Benefits - Expectations & What We Are About',
    items: [
      {
        description: 'Guests Deserve Our Best',
        subItems: [
          'Friendly Interactions',
          'Knowledgeable Team Members',
          'Accurate Orders',
          'Enthusiastic Service',
        ],
      },
      {
        description: 'BLAST - Arby\'s approach to handling complaints',
        subItems: [
          'Believe, Listen, Apologize, Solve it, Thank',
        ],
      },
      { description: 'Restaurant priorities - Arby\'s Ops Review' },
      {
        description: 'Arby\'s Values',
        subItems: [
          'Dream Big',
          'Work Hard',
          'Get It Done',
          'Play Fair',
          'Have Fun',
          'Make a Difference',
        ],
      },
    ],
  },
  {
    field: 'orientation_responsibilities',
    title: 'Team Member Responsibilities',
    items: [
      {
        description: 'Team Member Top 5 Priorities',
        subItems: [
          '1. Guest Focused Service',
          '2. Speed & Accuracy',
          '3. Quality Product Made Right',
          '4. Cleanliness Guest View & Work Area',
          '5. Safety: Food & Personal',
        ],
        numbered: true,
      },
      { description: 'Deployment Guide and Post Rush / secondary responsibilities' },
      { description: 'C.A.Y.G. - Clean As You Go' },
      { description: 'Teamwork' },
      {
        description: 'Review standards for appearance',
        subItems: [
          'Uniform / non-slip shoes / name tag / grooming / health and hygiene',
        ],
      },
    ],
  },
  {
    field: 'orientation_paperwork',
    title: 'Complete Required Paperwork',
    items: [
      { description: 'Complete I-9 Verification' },
      {
        description: 'Watch Learning Hub Training',
        subItems: [
          'Watch Welcome Path (Orientation)',
        ],
      },
    ],
  },
  {
    field: 'orientation_policies',
    title: 'Review Policies',
    items: [
      { description: 'Review company policies, safety procedures, and employee handbook.' },
    ],
  },
]

// Get the list of database fields needed for this checklist (just 6 fields now)
export function getOrientationFields() {
  return ORIENTATION_SECTIONS.map((section) => section.field)
}

// Check if all orientation sections are completed
export function isOrientationComplete(session) {
  return ORIENTATION_SECTIONS.every((section) => session[section.field])
}

export default function OrientationChecklist({
  session,
  schedule,
  saving,
  onCheckboxChange,
  onComplete,
}) {
  const isComplete = isOrientationComplete(session)

  return (
    <>
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <p className="text-sm font-medium text-purple-800">
          Orientation Training - Welcome Path
        </p>
        <p className="text-xs text-purple-600 mt-1">
          Complete all sections for {schedule.trainee?.display_name}
        </p>
      </div>

      {/* Orientation Checklist - One checkbox per section */}
      <div className="space-y-4">
        {ORIENTATION_SECTIONS.map((section) => (
          <div key={section.field} className="border rounded-lg overflow-hidden">
            {/* Section Header with Checkbox */}
            <label className="flex items-start gap-3 px-3 py-3 bg-gray-100 border-b cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={session[section.field] || false}
                onChange={(e) => onCheckboxChange(session.id, section.field, e.target.checked)}
                disabled={saving}
                className="mt-0.5 h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="font-medium text-sm text-gray-800">{section.title}</span>
            </label>

            {/* Section Items (informational, no checkboxes) */}
            <div className="px-4 py-3 bg-white space-y-2">
              {section.items.map((item, idx) => (
                <div key={idx} className="text-sm">
                  <div className="text-gray-700 font-medium">{item.description}</div>
                  {item.subItems && item.subItems.length > 0 && (
                    <ul className="mt-1 ml-4 text-xs text-gray-500 space-y-0.5">
                      {item.subItems.map((subItem, subIdx) => (
                        <li key={subIdx} className="flex items-start gap-1">
                          {!item.numbered && <span className="text-gray-400">•</span>}
                          <span>{subItem}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
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
