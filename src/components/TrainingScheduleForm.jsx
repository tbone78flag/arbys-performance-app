// src/components/TrainingScheduleForm.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const TRAINING_TYPES = ['AIQ', 'LTO', 'Compliance']

const AIQ_COMPETENCIES = [
  'Welcome Path Orientation',
  "Arby's Safety First",
  'Backline Closing',
  'Backline Production (Phase 1 & 2)',
  'Cashier & Dining Room',
  'Drive-Thru Operations',
  'Food Preparation',
  'Frontline Closing',
  'Fry Station',
  'Guests Deserve Our Best',
  'Maintenance',
  'Runner',
  'Team Trainer',
]

const BACKLINE_PHASES = [
  'Phase 1 Specialty',
  'Phase 2 Roast Beef',
]

// Compliance courses categorized by who can take them
const COMPLIANCE_COURSES_MANAGER_ONLY = [
  'OSHA',
  'Credit Card Security - Manager 2023',
  'Heat Illness Prevention Managers',
  'POS Manager Functions 2023',
  'Scam Awareness',
]

const COMPLIANCE_COURSES_ALL = [
  'Cybersecurity Basics',
  'HazCom & SDC 2023',
  'Respect 2024',
  'Emergency Action Plan (EAP) 2025',
]

const COMPLIANCE_COURSES_TEAM_MEMBER_ONLY = [
  'POS Team Member 2023',
  'Credit Card Security Team Member 2023',
  'Heat Illness Prevention Team Member',
]

export default function TrainingScheduleForm({ profile, locationId }) {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Form state
  const [traineeId, setTraineeId] = useState('')
  const [trainerId, setTrainerId] = useState('')
  const [trainingType, setTrainingType] = useState('')
  const [competencyType, setCompetencyType] = useState('')
  const [competencyPhase, setCompetencyPhase] = useState('')
  const [complianceCourse, setComplianceCourse] = useState('')
  const [trainingDate, setTrainingDate] = useState('')
  const [shiftStart, setShiftStart] = useState('')
  const [shiftEnd, setShiftEnd] = useState('')
  const [notes, setNotes] = useState('')

  // Upcoming scheduled training
  const [upcomingTraining, setUpcomingTraining] = useState([])
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)

  // Fetch employees for this location
  useEffect(() => {
    async function fetchEmployees() {
      const { data, error } = await supabase
        .from('employees')
        .select('id, display_name, role')
        .eq('location_id', locationId)
        .eq('is_active', true)
        .order('display_name')

      if (error) {
        console.error('Error fetching employees:', error)
      } else {
        setEmployees(data || [])
      }
      setLoading(false)
    }

    fetchEmployees()
  }, [locationId])

  // Fetch upcoming training sessions
  useEffect(() => {
    async function fetchUpcoming() {
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('training_schedule')
        .select(`
          id,
          training_type,
          competency_type,
          competency_phase,
          training_date,
          shift_start,
          shift_end,
          notes,
          trainee:trainee_id(id, display_name),
          trainer:trainer_id(id, display_name)
        `)
        .eq('location_id', locationId)
        .gte('training_date', today)
        .order('training_date', { ascending: true })
        .limit(10)

      if (error) {
        console.error('Error fetching upcoming training:', error)
      } else {
        setUpcomingTraining(data || [])
      }
      setLoadingUpcoming(false)
    }

    fetchUpcoming()
  }, [locationId, success]) // Refetch when a new training is added

  const resetForm = () => {
    setTraineeId('')
    setTrainerId('')
    setTrainingType('')
    setCompetencyType('')
    setCompetencyPhase('')
    setComplianceCourse('')
    setTrainingDate('')
    setShiftStart('')
    setShiftEnd('')
    setNotes('')
  }

  // Reset competency fields when training type changes
  const handleTrainingTypeChange = (value) => {
    setTrainingType(value)
    setCompetencyType('')
    setCompetencyPhase('')
    setComplianceCourse('')
  }

  // Get available compliance courses based on trainee's role
  const getComplianceCourses = () => {
    const selectedTrainee = employees.find(emp => emp.id === traineeId)
    const traineeRole = selectedTrainee?.role || 'EMPLOYEE'

    if (traineeRole === 'MANAGER') {
      // Managers see manager-only courses + all courses
      return [...COMPLIANCE_COURSES_MANAGER_ONLY, ...COMPLIANCE_COURSES_ALL]
    } else {
      // Team members see team-member-only courses + all courses
      return [...COMPLIANCE_COURSES_ALL, ...COMPLIANCE_COURSES_TEAM_MEMBER_ONLY]
    }
  }

  // Reset phase when competency type changes
  const handleCompetencyTypeChange = (value) => {
    setCompetencyType(value)
    setCompetencyPhase('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!traineeId || !trainerId || !trainingType || !trainingDate || !shiftStart || !shiftEnd) {
      setError('Please fill in all required fields.')
      return
    }

    // Validate AIQ requires competency
    if (trainingType === 'AIQ' && !competencyType) {
      setError('Please select a competency type for AIQ training.')
      return
    }

    // Validate Backline Production requires phase
    if (competencyType === 'Backline Production (Phase 1 & 2)' && !competencyPhase) {
      setError('Please select a phase for Backline Production training.')
      return
    }

    // Validate Compliance requires course selection
    if (trainingType === 'Compliance' && !complianceCourse) {
      setError('Please select a compliance course.')
      return
    }

    if (traineeId === trainerId) {
      setError('Trainee and trainer cannot be the same person.')
      return
    }

    setSaving(true)

    // Determine competency_type based on training type
    let finalCompetencyType = null
    if (trainingType === 'AIQ') {
      finalCompetencyType = competencyType
    } else if (trainingType === 'Compliance') {
      finalCompetencyType = complianceCourse
    }

    const { error: insertError } = await supabase
      .from('training_schedule')
      .insert({
        location_id: locationId,
        trainee_id: traineeId,
        trainer_id: trainerId,
        training_type: trainingType,
        competency_type: finalCompetencyType,
        competency_phase: competencyType === 'Backline Production (Phase 1 & 2)' ? competencyPhase : null,
        training_date: trainingDate,
        shift_start: shiftStart,
        shift_end: shiftEnd,
        notes: notes.trim() || null,
        created_by: profile.id,
      })

    setSaving(false)

    if (insertError) {
      console.error('Error scheduling training:', insertError)
      setError('Failed to schedule training. Please try again.')
      return
    }

    setSuccess('Training scheduled successfully!')
    resetForm()
  }

  const handleDelete = async (trainingId) => {
    if (!confirm('Are you sure you want to delete this training session?')) return

    const { error } = await supabase
      .from('training_schedule')
      .delete()
      .eq('id', trainingId)

    if (error) {
      console.error('Error deleting training:', error)
      setError('Failed to delete training.')
    } else {
      setUpcomingTraining((prev) => prev.filter((t) => t.id !== trainingId))
      setSuccess('Training deleted.')
    }
  }

  const formatTime = (time) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours, 10)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  // Format competency display for upcoming list
  const formatCompetency = (t) => {
    if (!t.competency_type) return null
    // Show competency for both AIQ and Compliance training types
    if (t.training_type !== 'AIQ' && t.training_type !== 'Compliance') return null
    let text = t.competency_type
    if (t.competency_phase) {
      text += ` (${t.competency_phase})`
    }
    return text
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading...</p>
  }

  return (
    <div className="space-y-6">
      {/* Schedule Training Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h4 className="font-medium text-gray-700">Schedule New Training</h4>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-600 bg-green-50 p-2 rounded">{success}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Trainee */}
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 mb-1">Trainee *</label>
            <select
              value={traineeId}
              onChange={(e) => setTraineeId(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm"
            >
              <option value="">Select trainee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Trainer */}
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 mb-1">Trainer *</label>
            <select
              value={trainerId}
              onChange={(e) => setTrainerId(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm"
            >
              <option value="">Select trainer...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Training Type */}
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 mb-1">Training Type *</label>
            <select
              value={trainingType}
              onChange={(e) => handleTrainingTypeChange(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm"
            >
              <option value="">Select type...</option>
              {TRAINING_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* AIQ Competency Type - Only shown when AIQ is selected */}
          {trainingType === 'AIQ' && (
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">Competency Type *</label>
              <select
                value={competencyType}
                onChange={(e) => handleCompetencyTypeChange(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              >
                <option value="">Select competency...</option>
                {AIQ_COMPETENCIES.map((comp) => (
                  <option key={comp} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Backline Production Phase - Only shown when Backline Production is selected */}
          {competencyType === 'Backline Production (Phase 1 & 2)' && (
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">Phase *</label>
              <select
                value={competencyPhase}
                onChange={(e) => setCompetencyPhase(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              >
                <option value="">Select phase...</option>
                {BACKLINE_PHASES.map((phase) => (
                  <option key={phase} value={phase}>
                    {phase}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Compliance Course - Only shown when Compliance is selected and trainee is chosen */}
          {trainingType === 'Compliance' && traineeId && (
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">Compliance Course *</label>
              <select
                value={complianceCourse}
                onChange={(e) => setComplianceCourse(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm"
              >
                <option value="">Select course...</option>
                {getComplianceCourses().map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Compliance Course - Show message if no trainee selected */}
          {trainingType === 'Compliance' && !traineeId && (
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">Compliance Course *</label>
              <p className="text-xs text-gray-500 italic py-1.5">Select a trainee first to see available courses</p>
            </div>
          )}

          {/* Training Date */}
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 mb-1">Date *</label>
            <input
              type="date"
              value={trainingDate}
              onChange={(e) => setTrainingDate(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm"
            />
          </div>

          {/* Shift Start */}
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 mb-1">Shift Start *</label>
            <input
              type="time"
              value={shiftStart}
              onChange={(e) => setShiftStart(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm"
            />
          </div>

          {/* Shift End */}
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-600 mb-1">Shift End *</label>
            <input
              type="time"
              value={shiftEnd}
              onChange={(e) => setShiftEnd(e.target.value)}
              className="border rounded px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="flex flex-col">
          <label className="text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any additional notes..."
            className="border rounded px-2 py-1.5 text-sm"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Scheduling...' : 'Schedule Training'}
          </button>
        </div>
      </form>

      {/* Upcoming Training List */}
      <div className="border-t pt-4">
        <h4 className="font-medium text-gray-700 mb-3">Upcoming Training Sessions</h4>

        {loadingUpcoming ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : upcomingTraining.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming training scheduled.</p>
        ) : (
          <div className="space-y-2">
            {upcomingTraining.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between bg-gray-50 border rounded p-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      t.training_type === 'AIQ' ? 'bg-blue-100 text-blue-700' :
                      t.training_type === 'LTO' ? 'bg-purple-100 text-purple-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {t.training_type}
                    </span>
                    {formatCompetency(t) && (
                      <span className="text-xs text-gray-600">
                        {formatCompetency(t)}
                      </span>
                    )}
                    <span className="text-sm font-medium">
                      {new Date(t.training_date + 'T00:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <p className="text-sm mt-1">
                    <span className="font-medium">{t.trainee?.display_name}</span>
                    <span className="text-gray-500"> trained by </span>
                    <span className="font-medium">{t.trainer?.display_name}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTime(t.shift_start)} - {formatTime(t.shift_end)}
                    {t.notes && ` • ${t.notes}`}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-xs text-red-600 hover:underline ml-2"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
