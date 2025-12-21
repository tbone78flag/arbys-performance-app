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
      { field: 'orientation_tour_1', description: 'Restaurant tour item 1' },
      { field: 'orientation_tour_2', description: 'Restaurant tour item 2' },
      { field: 'orientation_tour_3', description: 'Restaurant tour item 3' },
      { field: 'orientation_tour_4', description: 'Restaurant tour item 4' },
      { field: 'orientation_tour_5', description: 'Restaurant tour item 5' },
      { field: 'orientation_tour_6', description: 'Restaurant tour item 6' },
      { field: 'orientation_tour_7', description: 'Restaurant tour item 7' },
    ],
  },
  {
    title: 'Benefits - Expectations & What We Are About',
    items: [
      { field: 'orientation_benefits_1', description: 'Benefits item 1' },
      { field: 'orientation_benefits_2', description: 'Benefits item 2' },
      { field: 'orientation_benefits_3', description: 'Benefits item 3' },
      { field: 'orientation_benefits_4', description: 'Benefits item 4' },
    ],
  },
  {
    title: 'Team Member Responsibilities',
    items: [
      { field: 'orientation_responsibilities_1', description: 'TM Responsibilities item 1' },
      { field: 'orientation_responsibilities_2', description: 'TM Responsibilities item 2' },
      { field: 'orientation_responsibilities_3', description: 'TM Responsibilities item 3' },
      { field: 'orientation_responsibilities_4', description: 'TM Responsibilities item 4' },
      { field: 'orientation_responsibilities_5', description: 'TM Responsibilities item 5' },
    ],
  },
  {
    title: 'Complete Required Paperwork',
    items: [
      { field: 'orientation_paperwork_1', description: 'Paperwork item 1' },
      { field: 'orientation_paperwork_2', description: 'Paperwork item 2' },
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
                  <span className="text-sm text-gray-700">{item.description}</span>
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
