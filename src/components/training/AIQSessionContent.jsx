// src/components/training/AIQSessionContent.jsx
import OrientationChecklist, { getOrientationFields } from './aiq/OrientationChecklist'
import SafetyFirstChecklist, { getSafetyFirstFields } from './aiq/SafetyFirstChecklist'
import GuestsDeserveOurBestChecklist, { getGuestsDeserveOurBestFields } from './aiq/GuestsDeserveOurBestChecklist'

// Export all AIQ-related database fields needed for the query
export function getAIQSessionFields() {
  return [
    // Orientation-specific fields
    ...getOrientationFields(),
    // Safety First fields
    ...getSafetyFirstFields(),
    // Guests Deserve Our Best fields
    ...getGuestsDeserveOurBestFields(),
    // Add more competency fields here as they are created
    // ...getFrontlineFields(),
    // ...getBacklineFields(),
    // ...getTeamTrainerFields(),
  ]
}

// Generic AIQ checklist for competencies that don't have a specific component yet
function GenericAIQChecklist({
  session,
  schedule,
  saving,
  onCheckboxChange,
  onComplete,
}) {
  // For now, generic AIQ has no specific checkboxes - just a done button
  // This will be expanded as more competency types are added

  return (
    <>
      <p className="text-sm text-gray-600">
        Complete the AIQ training for {schedule.trainee?.display_name}:
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm font-medium text-blue-800">
          {schedule.competency_type || 'AIQ Training'}
        </p>
        {schedule.competency_phase && (
          <p className="text-xs text-blue-600 mt-1">
            Phase: {schedule.competency_phase}
          </p>
        )}
      </div>

      <p className="text-sm text-gray-500 italic">
        Specific checklist for this competency type coming soon...
      </p>

      {/* Done Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => onComplete(session)}
          disabled={saving}
          className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Done'}
        </button>
      </div>
    </>
  )
}

export default function AIQSessionContent({
  session,
  schedule,
  saving,
  onCheckboxChange,
  onComplete,
}) {
  const competencyType = schedule.competency_type

  // Route to the appropriate checklist component based on competency type
  switch (competencyType) {
    case 'Welcome Path Orientation':
      return (
        <OrientationChecklist
          session={session}
          schedule={schedule}
          saving={saving}
          onCheckboxChange={onCheckboxChange}
          onComplete={onComplete}
        />
      )

    case "Arby's Safety First":
      return (
        <SafetyFirstChecklist
          session={session}
          schedule={schedule}
          saving={saving}
          onCheckboxChange={onCheckboxChange}
          onComplete={onComplete}
        />
      )

    case 'Guests Deserve Our Best':
      return (
        <GuestsDeserveOurBestChecklist
          session={session}
          schedule={schedule}
          saving={saving}
          onCheckboxChange={onCheckboxChange}
          onComplete={onComplete}
        />
      )

    // Add more cases here as you create new checklist components:
    // case 'Frontline Production':
    //   return <FrontlineChecklist ... />
    // case 'Backline Production (Phase 1 & 2)':
    //   return <BacklineChecklist ... />
    // case 'Team Trainer':
    //   return <TeamTrainerChecklist ... />

    default:
      // Fall back to generic AIQ checklist for competencies without specific components
      return (
        <GenericAIQChecklist
          session={session}
          schedule={schedule}
          saving={saving}
          onCheckboxChange={onCheckboxChange}
          onComplete={onComplete}
        />
      )
  }
}
