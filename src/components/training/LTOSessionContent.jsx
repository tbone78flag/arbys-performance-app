// src/components/training/LTOSessionContent.jsx

// Export all LTO-related database fields needed for the query
export function getLTOSessionFields() {
  return [
    // Generic LTO fields
    'lto_learninghub_completed',
    'lto_handson_completed',
    // Add more LTO-specific fields here as they are created
  ]
}

// Generic LTO checklist for all LTO competencies
function GenericLTOChecklist({
  session,
  schedule,
  saving,
  onCheckboxChange,
  onComplete,
}) {
  const canComplete = session.lto_learninghub_completed && session.lto_handson_completed

  return (
    <>
      <p className="text-sm text-gray-600">
        Complete the following checklist for {schedule.trainee?.display_name}:
      </p>

      {/* LTO Checklist */}
      <div className="space-y-3">
        <label className="flex items-start gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={session.lto_learninghub_completed || false}
            onChange={(e) =>
              onCheckboxChange(session.id, 'lto_learninghub_completed', e.target.checked)
            }
            disabled={saving}
            className="mt-0.5 h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <div>
            <span className="font-medium text-sm">LearningHub Training</span>
            <p className="text-xs text-gray-500 mt-0.5">
              Did the employee complete the LearningHub training with a passing score?
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={session.lto_handson_completed || false}
            onChange={(e) =>
              onCheckboxChange(session.id, 'lto_handson_completed', e.target.checked)
            }
            disabled={saving}
            className="mt-0.5 h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <div>
            <span className="font-medium text-sm">Hands-on Training</span>
            <p className="text-xs text-gray-500 mt-0.5">
              Did the employee complete the hands-on training?
            </p>
          </div>
        </label>
      </div>

      {/* Done Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => onComplete(session)}
          disabled={saving || !canComplete}
          className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Done'}
        </button>
      </div>
    </>
  )
}

export default function LTOSessionContent({
  session,
  schedule,
  saving,
  onCheckboxChange,
  onComplete,
}) {
  // For now, all LTO training uses the generic checklist
  // Add specific LTO competency components here if needed in the future
  return (
    <GenericLTOChecklist
      session={session}
      schedule={schedule}
      saving={saving}
      onCheckboxChange={onCheckboxChange}
      onComplete={onComplete}
    />
  )
}
