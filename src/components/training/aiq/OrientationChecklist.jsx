// src/components/training/aiq/OrientationChecklist.jsx

// Define the checklist sections for Orientation training
const ORIENTATION_SECTIONS = [
  {
    title: 'Welcome',
    items: [
      { field: 'orientation_welcome_1', description: 'Introductions to the team' },
      { field: 'orientation_welcome_2', description: 'Receive uniform and Team Takeaway Booklet' },
    ],
  },
  {
    title: 'Restaurant Tour',
    items: [
      {
        field: 'orientation_tour_exterior',
        description: 'Exterior',
        subItems: [
          'Guest perception',
          'Parking lot',
          'Dumpster / waste area',
          'Drive-thru',
        ],
      },
      {
        field: 'orientation_tour_dining',
        description: 'Dining Room/Lobby',
        subItems: [
          'Guest perception',
          'Safety',
          'Condiments',
          'Restrooms',
        ],
      },
      {
        field: 'orientation_tour_frontline',
        description: 'Frontline',
        subItems: [
          'Sub-point 1',
          'Sub-point 2',
        ],
      },
      {
        field: 'orientation_tour_backline',
        description: 'Backline',
        subItems: [
          'Sub-point 1',
        ],
      },
      {
        field: 'orientation_tour_safety',
        description: 'Kitchen Safety',
      },
      {
        field: 'orientation_tour_storage',
        description: 'Storage/Break Area',
        subItems: [
          'Sub-point 1',
          'Sub-point 2',
          'Sub-point 3',
          'Sub-point 4',
        ],
      },
    ],
  },
  {
    title: 'Benefits - Expectations & What We Are About',
    items: [
      {
        field: 'orientation_benefits_guests',
        description: 'Guests Deserve Our Best',
        subItems: [
          'Sub-point 1',
          'Sub-point 2',
          'Sub-point 3',
          'Sub-point 4',
        ],
      },
      {
        field: 'orientation_benefits_blast',
        description: 'BLAST - Arby\'s approach to handling complaints',
        subItems: [
          'Sub-point 1',
        ],
      },
      {
        field: 'orientation_benefits_priorities',
        description: 'Restaurant priorities - Arby\'s Ops Review',
      },
      {
        field: 'orientation_benefits_values',
        description: 'Arby\'s Values',
        subItems: [
          'Sub-point 1',
          'Sub-point 2',
          'Sub-point 3',
          'Sub-point 4',
          'Sub-point 5',
          'Sub-point 6',
        ],
      },
    ],
  },
  {
    title: 'Team Member Responsibilities',
    items: [
      {
        field: 'orientation_responsibilities_top5',
        description: 'Team Member Top 5 Priorities',
        subItems: [
          '1. Sub-point 1',
          '2. Sub-point 2',
          '3. Sub-point 3',
          '4. Sub-point 4',
          '5. Sub-point 5',
        ],
        numbered: true,
      },
      {
        field: 'orientation_responsibilities_deployment',
        description: 'Deployment Guide and Post Rush / secondary responsibilities',
      },
      {
        field: 'orientation_responsibilities_cayg',
        description: 'C.A.Y.G. - Clean As You Go',
      },
      {
        field: 'orientation_responsibilities_teamwork',
        description: 'Teamwork',
      },
      {
        field: 'orientation_responsibilities_appearance',
        description: 'Review standards for appearance',
        subItems: [
          'Sub-point 1',
        ],
      },
    ],
  },
  {
    title: 'Complete Required Paperwork',
    items: [
      {
        field: 'orientation_paperwork_i9',
        description: 'Complete I-9 Verification',
      },
      {
        field: 'orientation_paperwork_learninghub',
        description: 'Watch Learning Hub Training',
        subItems: [
          'Sub-point 1',
        ],
      },
    ],
  },
  {
    title: 'Review Policies',
    items: [
      { field: 'orientation_policies_1', description: 'Review company policies, safety procedures, and employee handbook.' },
    ],
  },
]

// Get all items flattened from sections
function getAllItems() {
  return ORIENTATION_SECTIONS.flatMap((section) => section.items)
}

// Check if all orientation items are completed
export function isOrientationComplete(session) {
  return getAllItems().every((item) => session[item.field])
}

// Get the list of database fields needed for this checklist
export function getOrientationFields() {
  return getAllItems().map((item) => item.field)
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
          Complete all checkpoints for {schedule.trainee?.display_name}
        </p>
      </div>

      {/* Orientation Checklist - Grouped by Section */}
      <div className="space-y-4">
        {ORIENTATION_SECTIONS.map((section) => (
          <div key={section.title} className="border rounded-lg overflow-hidden">
            {/* Section Header */}
            <div className="bg-gray-100 px-3 py-2 border-b">
              <h4 className="font-medium text-sm text-gray-800">{section.title}</h4>
            </div>

            {/* Section Items */}
            <div className="divide-y">
              {section.items.map((item) => (
                <label
                  key={item.field}
                  className="flex items-start gap-3 p-3 bg-white cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={session[item.field] || false}
                    onChange={(e) => onCheckboxChange(session.id, item.field, e.target.checked)}
                    disabled={saving}
                    className="mt-0.5 h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-gray-700 font-medium">{item.description}</span>
                    {item.subItems && item.subItems.length > 0 && (
                      <ul className="mt-1 ml-1 text-xs text-gray-500 space-y-0.5">
                        {item.subItems.map((subItem, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            {!item.numbered && <span className="text-gray-400">•</span>}
                            <span>{subItem}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </label>
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
