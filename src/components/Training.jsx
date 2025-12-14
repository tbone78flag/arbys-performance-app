// src/components/Training.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { startOfWeekLocal, addDays } from '../utils/dateHelpers'

const TRAINING_TYPES = ['AIQ', 'LTO', 'Compliance']

export default function Training({ profile, locationId }) {
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [trainingData, setTrainingData] = useState([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState([])

  // Filters
  const [trainerFilter, setTrainerFilter] = useState('mine') // 'all', 'mine', 'others'
  const [typeFilter, setTypeFilter] = useState('all') // 'all', 'AIQ', 'LTO', 'Compliance'

  // Modal state
  const [selectedTraining, setSelectedTraining] = useState(null)
  const [modalView, setModalView] = useState('actions') // 'actions', 'reassign', 'reschedule', 'info'
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState(null)

  // Reassign form state
  const [reassignTrainerId, setReassignTrainerId] = useState('')
  const [reassignDate, setReassignDate] = useState('')
  const [reassignShiftStart, setReassignShiftStart] = useState('')
  const [reassignShiftEnd, setReassignShiftEnd] = useState('')

  // Reschedule form state
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleShiftStart, setRescheduleShiftStart] = useState('')
  const [rescheduleShiftEnd, setRescheduleShiftEnd] = useState('')

  // Start session state
  const [startingSession, setStartingSession] = useState(false)
  const [undoingCompletion, setUndoingCompletion] = useState(false)

  const weekStart = startOfWeekLocal(weekAnchor)
  const weekEnd = addDays(weekStart, 6)

  // Create stable string representations for useEffect dependencies
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const weekEndStr = weekEnd.toISOString().split('T')[0]

  // Generate array of days for the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Get today's date string for comparison
  const todayStr = new Date().toISOString().split('T')[0]

  // Check if user is GM or AM
  const isGMorAM = ['General Manager', 'Assistant Manager'].includes(profile?.title)

  // Fetch training data for the week
  useEffect(() => {
    async function fetchTraining() {
      setLoading(true)

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
          trainee_id,
          trainer_id,
          created_at,
          status,
          trainee:trainee_id(id, display_name),
          trainer:trainer_id(id, display_name)
        `)
        .eq('location_id', locationId)
        .gte('training_date', weekStartStr)
        .lte('training_date', weekEndStr)
        .order('shift_start', { ascending: true })

      if (error) {
        console.error('Error fetching training:', error)
      } else {
        setTrainingData(data || [])
      }
      setLoading(false)
    }

    fetchTraining()
  }, [locationId, weekStartStr, weekEndStr])

  // Fetch employees for dropdowns
  useEffect(() => {
    async function fetchEmployees() {
      const { data } = await supabase
        .from('employees')
        .select('id, display_name')
        .eq('location_id', locationId)
        .eq('is_active', true)
        .order('display_name')

      if (data) {
        setEmployees(data)
      }
    }
    fetchEmployees()
  }, [locationId])

  // Filter training data
  const filteredTraining = trainingData.filter((t) => {
    // Trainer filter
    if (trainerFilter === 'mine' && t.trainer_id !== profile.id) return false
    if (trainerFilter === 'others' && t.trainer_id === profile.id) return false

    // Type filter
    if (typeFilter !== 'all' && t.training_type !== typeFilter) return false

    return true
  })

  // Get training for a specific day
  const getTrainingForDay = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return filteredTraining.filter((t) => t.training_date === dateStr)
  }

  // Get today's trainees for current user (trainer)
  const todaysMyTrainees = trainingData.filter(
    (t) => t.training_date === todayStr && t.trainer_id === profile.id
  )

  const formatTime = (time) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours, 10)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  const formatDateHeader = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const isToday = (date) => {
    return date.toISOString().split('T')[0] === todayStr
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'AIQ':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'LTO':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'Compliance':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  // Open modal with training session
  const openTrainingModal = (training) => {
    setSelectedTraining(training)
    setModalView('actions')
    setModalError(null)
    // Reset form states
    setReassignTrainerId('')
    setReassignDate(training.training_date)
    setReassignShiftStart(training.shift_start)
    setReassignShiftEnd(training.shift_end)
    setRescheduleDate(training.training_date)
    setRescheduleShiftStart(training.shift_start)
    setRescheduleShiftEnd(training.shift_end)
  }

  const closeModal = () => {
    setSelectedTraining(null)
    setModalView('actions')
    setModalError(null)
  }

  // Handle reassign (GM/AM only)
  const handleReassign = async () => {
    if (!reassignTrainerId || !reassignDate || !reassignShiftStart || !reassignShiftEnd) {
      setModalError('Please fill in all fields.')
      return
    }

    setSaving(true)
    setModalError(null)

    const { error } = await supabase
      .from('training_schedule')
      .update({
        trainer_id: reassignTrainerId,
        training_date: reassignDate,
        shift_start: reassignShiftStart,
        shift_end: reassignShiftEnd,
      })
      .eq('id', selectedTraining.id)

    setSaving(false)

    if (error) {
      console.error('Error reassigning:', error)
      setModalError('Failed to reassign training.')
      return
    }

    // Update local state
    setTrainingData((prev) =>
      prev.map((t) =>
        t.id === selectedTraining.id
          ? {
              ...t,
              trainer_id: reassignTrainerId,
              training_date: reassignDate,
              shift_start: reassignShiftStart,
              shift_end: reassignShiftEnd,
              trainer: employees.find((e) => e.id === reassignTrainerId),
            }
          : t
      )
    )
    closeModal()
  }

  // Handle reschedule (trainer can reschedule their own)
  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleShiftStart || !rescheduleShiftEnd) {
      setModalError('Please fill in all fields.')
      return
    }

    setSaving(true)
    setModalError(null)

    const { error } = await supabase
      .from('training_schedule')
      .update({
        training_date: rescheduleDate,
        shift_start: rescheduleShiftStart,
        shift_end: rescheduleShiftEnd,
      })
      .eq('id', selectedTraining.id)

    setSaving(false)

    if (error) {
      console.error('Error rescheduling:', error)
      setModalError('Failed to reschedule training.')
      return
    }

    // Update local state
    setTrainingData((prev) =>
      prev.map((t) =>
        t.id === selectedTraining.id
          ? {
              ...t,
              training_date: rescheduleDate,
              shift_start: rescheduleShiftStart,
              shift_end: rescheduleShiftEnd,
            }
          : t
      )
    )
    closeModal()
  }

  // Check if current user can reschedule (is the trainer)
  const canReschedule = selectedTraining?.trainer_id === profile.id

  // Check if current user can start a session (is the trainer and training not completed)
  const canStartSession = selectedTraining?.trainer_id === profile.id && selectedTraining?.status !== 'completed'

  // Check if training is already completed
  const isTrainingCompleted = selectedTraining?.status === 'completed'

  // Handle starting a training session
  const handleStartSession = async () => {
    if (!selectedTraining) return

    setStartingSession(true)
    setModalError(null)

    // Check if session already exists for this training schedule
    const { data: existingSession } = await supabase
      .from('training_sessions')
      .select('id')
      .eq('training_schedule_id', selectedTraining.id)
      .eq('status', 'in_progress')
      .single()

    if (existingSession) {
      setModalError('A training session is already in progress for this schedule.')
      setStartingSession(false)
      return
    }

    // Create new training session
    const { error } = await supabase
      .from('training_sessions')
      .insert({
        training_schedule_id: selectedTraining.id,
        trainer_id: profile.id,
        trainee_id: selectedTraining.trainee_id,
        started_at: new Date().toISOString(),
        status: 'in_progress',
      })

    setStartingSession(false)

    if (error) {
      console.error('Error starting session:', error)
      setModalError('Failed to start training session. Please try again.')
      return
    }

    // Close modal and show success
    closeModal()
    // The TrainingSession component will pick up the new session when it refreshes
  }

  // Handle undoing a completed training (reset to scheduled)
  const handleUndoCompletion = async () => {
    if (!selectedTraining) return

    setUndoingCompletion(true)
    setModalError(null)

    // Reset training_schedule status back to scheduled
    const { error } = await supabase
      .from('training_schedule')
      .update({ status: 'scheduled' })
      .eq('id', selectedTraining.id)

    setUndoingCompletion(false)

    if (error) {
      console.error('Error undoing completion:', error)
      setModalError('Failed to undo completion. Please try again.')
      return
    }

    // Update local state to reflect the change
    setTrainingData((prev) =>
      prev.map((t) =>
        t.id === selectedTraining.id
          ? { ...t, status: 'scheduled' }
          : t
      )
    )

    // Update selectedTraining to reflect the change
    setSelectedTraining((prev) => ({ ...prev, status: 'scheduled' }))
  }

  return (
    <div className="space-y-4">
      {/* Today's My Trainees - Highlighted Box */}
      {todaysMyTrainees.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">
            Your Trainees Today
          </h3>
          <div className="space-y-2">
            {todaysMyTrainees.map((t) => {
              const isCompleted = t.status === 'completed'
              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between bg-white border border-green-200 rounded p-2 cursor-pointer hover:bg-green-50 ${isCompleted ? 'opacity-60' : ''}`}
                  onClick={() => openTrainingModal(t)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isCompleted ? 'line-through' : ''}`}>
                      {t.trainee?.display_name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor(t.training_type)}`}>
                      {t.training_type}
                    </span>
                    {isCompleted && (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                        Done
                      </span>
                    )}
                  </div>
                  <span className={`text-sm text-gray-600 ${isCompleted ? 'line-through' : ''}`}>
                    {formatTime(t.shift_start)} - {formatTime(t.shift_end)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters and Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekAnchor(addDays(weekStart, -7))}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            &lt; Prev
          </button>
          <span className="text-sm font-medium">
            {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
            {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button
            onClick={() => setWeekAnchor(addDays(weekEnd, 1))}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Next &gt;
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={trainerFilter}
            onChange={(e) => setTrainerFilter(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">All Trainers</option>
            <option value="mine">My Trainees</option>
            <option value="others">Others' Trainees</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">All Types</option>
            {TRAINING_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Weekly Calendar */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading training schedule...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayTraining = getTrainingForDay(day)
            const dayIsToday = isToday(day)

            return (
              <div
                key={day.toISOString()}
                className={`border rounded-lg overflow-hidden ${
                  dayIsToday ? 'ring-2 ring-red-500' : ''
                }`}
              >
                {/* Day Header */}
                <div
                  className={`px-2 py-1.5 text-center text-xs font-medium ${
                    dayIsToday
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {formatDateHeader(day)}
                </div>

                {/* Day Content */}
                <div className="p-1.5 min-h-[80px] bg-white">
                  {dayTraining.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center mt-2">
                      No training
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {dayTraining.map((t) => {
                        const isCompleted = t.status === 'completed'
                        return (
                          <div
                            key={t.id}
                            onClick={() => openTrainingModal(t)}
                            className={`text-xs p-1.5 rounded border cursor-pointer hover:opacity-80 ${getTypeColor(t.training_type)} ${isCompleted ? 'opacity-60' : ''}`}
                          >
                            <div className={`font-medium truncate ${isCompleted ? 'line-through' : ''}`}>
                              {t.trainee?.display_name}
                            </div>
                            <div className={`text-[10px] opacity-75 ${isCompleted ? 'line-through' : ''}`}>
                              {formatTime(t.shift_start)}-{formatTime(t.shift_end)}
                            </div>
                            <div className={`text-[10px] opacity-75 truncate ${isCompleted ? 'line-through' : ''}`}>
                              w/ {t.trainer?.display_name}
                            </div>
                            {isCompleted && (
                              <div className="text-[10px] font-medium text-green-700 mt-0.5">
                                Completed
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="font-medium text-gray-600">Legend:</span>
        {TRAINING_TYPES.map((type) => (
          <span key={type} className={`px-2 py-0.5 rounded ${getTypeColor(type)}`}>
            {type}
          </span>
        ))}
      </div>

      {/* Training Action Modal */}
      {selectedTraining && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            {/* Modal Header */}
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                {modalView === 'actions' && 'Training Session'}
                {modalView === 'reassign' && 'Reassign Training'}
                {modalView === 'reschedule' && 'Reschedule Training'}
                {modalView === 'info' && 'Training Details'}
              </h3>
              <p className="text-sm text-gray-600">
                {selectedTraining.trainee?.display_name} - {selectedTraining.training_type}
              </p>
            </div>

            <div className="p-4">
              {modalError && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">{modalError}</p>
              )}

              {/* Actions View */}
              {modalView === 'actions' && (
                <div className="space-y-2">
                  {isGMorAM && (
                    <button
                      onClick={() => setModalView('reassign')}
                      className="w-full text-left px-4 py-3 border rounded hover:bg-gray-50 flex items-center gap-3"
                    >
                      <span className="text-xl">👤</span>
                      <div>
                        <div className="font-medium">Reassign</div>
                        <div className="text-xs text-gray-500">Assign to a different trainer</div>
                      </div>
                    </button>
                  )}

                  {canReschedule && (
                    <button
                      onClick={() => setModalView('reschedule')}
                      className="w-full text-left px-4 py-3 border rounded hover:bg-gray-50 flex items-center gap-3"
                    >
                      <span className="text-xl">📅</span>
                      <div>
                        <div className="font-medium">Reschedule</div>
                        <div className="text-xs text-gray-500">Change date or shift times</div>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => setModalView('info')}
                    className="w-full text-left px-4 py-3 border rounded hover:bg-gray-50 flex items-center gap-3"
                  >
                    <span className="text-xl">ℹ️</span>
                    <div>
                      <div className="font-medium">More Info</div>
                      <div className="text-xs text-gray-500">View full training details</div>
                    </div>
                  </button>

                  {isTrainingCompleted && (
                    <div className="w-full px-4 py-3 border rounded bg-green-50 border-green-200">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">✅</span>
                        <div className="flex-1">
                          <div className="font-medium text-green-700">Training Completed</div>
                          <div className="text-xs text-green-600">This training session has been completed</div>
                        </div>
                      </div>
                      <button
                        onClick={handleUndoCompletion}
                        disabled={undoingCompletion}
                        className="mt-3 w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                      >
                        {undoingCompletion ? 'Undoing...' : 'Undo Completion'}
                      </button>
                    </div>
                  )}

                  {!isTrainingCompleted && canStartSession && (
                    <button
                      onClick={handleStartSession}
                      disabled={startingSession}
                      className="w-full text-left px-4 py-3 border rounded hover:bg-green-50 flex items-center gap-3 disabled:opacity-50"
                    >
                      <span className="text-xl">▶️</span>
                      <div>
                        <div className="font-medium">Start Training Session</div>
                        <div className="text-xs text-gray-500">
                          {startingSession ? 'Starting...' : 'Begin the training session now'}
                        </div>
                      </div>
                    </button>
                  )}

                  {!isTrainingCompleted && !canStartSession && (
                    <button
                      disabled
                      className="w-full text-left px-4 py-3 border rounded bg-gray-50 text-gray-400 flex items-center gap-3 cursor-not-allowed"
                    >
                      <span className="text-xl">▶️</span>
                      <div>
                        <div className="font-medium">Start Training Session</div>
                        <div className="text-xs">Only the assigned trainer can start this session</div>
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* Reassign View */}
              {modalView === 'reassign' && (
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">New Trainer *</label>
                    <select
                      value={reassignTrainerId}
                      onChange={(e) => setReassignTrainerId(e.target.value)}
                      className="border rounded px-3 py-2 text-sm"
                    >
                      <option value="">Select trainer...</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.display_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      value={reassignDate}
                      onChange={(e) => setReassignDate(e.target.value)}
                      className="border rounded px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 mb-1">Shift Start *</label>
                      <input
                        type="time"
                        value={reassignShiftStart}
                        onChange={(e) => setReassignShiftStart(e.target.value)}
                        className="border rounded px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 mb-1">Shift End *</label>
                      <input
                        type="time"
                        value={reassignShiftEnd}
                        onChange={(e) => setReassignShiftEnd(e.target.value)}
                        className="border rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      onClick={() => setModalView('actions')}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleReassign}
                      disabled={saving}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Reassign'}
                    </button>
                  </div>
                </div>
              )}

              {/* Reschedule View */}
              {modalView === 'reschedule' && (
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">New Date *</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="border rounded px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 mb-1">Shift Start *</label>
                      <input
                        type="time"
                        value={rescheduleShiftStart}
                        onChange={(e) => setRescheduleShiftStart(e.target.value)}
                        className="border rounded px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-sm font-medium text-gray-700 mb-1">Shift End *</label>
                      <input
                        type="time"
                        value={rescheduleShiftEnd}
                        onChange={(e) => setRescheduleShiftEnd(e.target.value)}
                        className="border rounded px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <button
                      onClick={() => setModalView('actions')}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleReschedule}
                      disabled={saving}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Reschedule'}
                    </button>
                  </div>
                </div>
              )}

              {/* Info View */}
              {modalView === 'info' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Trainee:</span>
                      <p className="font-medium">{selectedTraining.trainee?.display_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Trainer:</span>
                      <p className="font-medium">{selectedTraining.trainer?.display_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Training Type:</span>
                      <p className="font-medium">{selectedTraining.training_type}</p>
                    </div>
                    {selectedTraining.training_type === 'AIQ' && selectedTraining.competency_type && (
                      <div>
                        <span className="text-gray-500">Competency:</span>
                        <p className="font-medium">{selectedTraining.competency_type}</p>
                      </div>
                    )}
                    {selectedTraining.training_type === 'Compliance' && selectedTraining.competency_type && (
                      <div>
                        <span className="text-gray-500">Course:</span>
                        <p className="font-medium">{selectedTraining.competency_type}</p>
                      </div>
                    )}
                    {selectedTraining.competency_phase && (
                      <div>
                        <span className="text-gray-500">Phase:</span>
                        <p className="font-medium">{selectedTraining.competency_phase}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <p className="font-medium">
                        {new Date(selectedTraining.training_date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Shift Start:</span>
                      <p className="font-medium">{formatTime(selectedTraining.shift_start)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Shift End:</span>
                      <p className="font-medium">{formatTime(selectedTraining.shift_end)}</p>
                    </div>
                  </div>

                  {selectedTraining.notes && (
                    <div className="text-sm">
                      <span className="text-gray-500">Notes:</span>
                      <p className="mt-1 p-2 bg-gray-50 rounded">{selectedTraining.notes}</p>
                    </div>
                  )}

                  {!selectedTraining.notes && (
                    <div className="text-sm text-gray-400 italic">No notes for this training session.</div>
                  )}

                  <div className="text-xs text-gray-400">
                    Created: {new Date(selectedTraining.created_at).toLocaleString()}
                  </div>

                  <div className="flex justify-end pt-2 border-t">
                    <button
                      onClick={() => setModalView('actions')}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Close button for all views */}
            <div className="px-4 pb-4">
              <button
                onClick={closeModal}
                className="w-full px-4 py-2 text-sm border rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
