// src/components/TrainingSession.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function TrainingSession({ profile }) {
  const [activeSessions, setActiveSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedSession, setExpandedSession] = useState(null)
  const [saving, setSaving] = useState(false)

  // Fetch active training sessions for this trainer
  useEffect(() => {
    async function fetchActiveSessions() {
      setLoading(true)

      const { data, error } = await supabase
        .from('training_sessions')
        .select(`
          id,
          training_schedule_id,
          started_at,
          completed_at,
          status,
          lto_learninghub_completed,
          lto_handson_completed,
          compliance_learninghub_completed,
          training_schedule:training_schedule_id(
            id,
            training_type,
            competency_type,
            competency_phase,
            trainee:trainee_id(id, display_name),
            trainer:trainer_id(id, display_name)
          )
        `)
        .eq('trainer_id', profile.id)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })

      if (error) {
        console.error('Error fetching active sessions:', error)
      } else {
        setActiveSessions(data || [])
      }
      setLoading(false)
    }

    fetchActiveSessions()
  }, [profile.id])

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
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

  const getCompetencyDisplay = (schedule) => {
    if (!schedule.competency_type) return null
    let text = schedule.competency_type
    if (schedule.competency_phase) {
      text += ` (${schedule.competency_phase})`
    }
    return text
  }

  const toggleSession = (sessionId) => {
    setExpandedSession(expandedSession === sessionId ? null : sessionId)
  }

  // Update LTO checkbox
  const handleLTOCheckbox = async (sessionId, field, value) => {
    setSaving(true)

    const updateData = { [field]: value }

    const { error } = await supabase
      .from('training_sessions')
      .update(updateData)
      .eq('id', sessionId)

    if (error) {
      console.error('Error updating session:', error)
    } else {
      setActiveSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, ...updateData } : s
        )
      )
    }
    setSaving(false)
  }

  // Complete LTO training session
  const handleCompleteLTO = async (session) => {
    if (!session.lto_learninghub_completed || !session.lto_handson_completed) {
      return
    }

    setSaving(true)

    // Update training_sessions status
    const { error: sessionError } = await supabase
      .from('training_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    if (sessionError) {
      console.error('Error completing session:', sessionError)
      setSaving(false)
      return
    }

    // Also mark the training_schedule as completed
    const { error: scheduleError } = await supabase
      .from('training_schedule')
      .update({
        status: 'completed',
      })
      .eq('id', session.training_schedule_id)

    if (scheduleError) {
      console.error('Error updating schedule status:', scheduleError)
    }

    // Remove from active sessions
    setActiveSessions((prev) => prev.filter((s) => s.id !== session.id))
    setSaving(false)
  }

  // Update Compliance checkbox
  const handleComplianceCheckbox = async (sessionId, field, value) => {
    setSaving(true)

    const updateData = { [field]: value }

    const { error } = await supabase
      .from('training_sessions')
      .update(updateData)
      .eq('id', sessionId)

    if (error) {
      console.error('Error updating session:', error)
    } else {
      setActiveSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, ...updateData } : s
        )
      )
    }
    setSaving(false)
  }

  // Complete Compliance training session
  const handleCompleteCompliance = async (session) => {
    if (!session.compliance_learninghub_completed) {
      return
    }

    setSaving(true)

    // Update training_sessions status
    const { error: sessionError } = await supabase
      .from('training_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    if (sessionError) {
      console.error('Error completing session:', sessionError)
      setSaving(false)
      return
    }

    // Also mark the training_schedule as completed
    const { error: scheduleError } = await supabase
      .from('training_schedule')
      .update({
        status: 'completed',
      })
      .eq('id', session.training_schedule_id)

    if (scheduleError) {
      console.error('Error updating schedule status:', scheduleError)
    }

    // Remove from active sessions
    setActiveSessions((prev) => prev.filter((s) => s.id !== session.id))
    setSaving(false)
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading active sessions...</p>
  }

  if (activeSessions.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p className="text-sm">No active training sessions.</p>
        <p className="text-xs mt-1">Start a session from the Training Calendar.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {activeSessions.map((session) => {
        const schedule = session.training_schedule
        const isExpanded = expandedSession === session.id
        const competency = getCompetencyDisplay(schedule)

        return (
          <div
            key={session.id}
            className="border rounded-lg overflow-hidden bg-white"
          >
            {/* Session Header - Clickable */}
            <button
              type="button"
              onClick={() => toggleSession(session.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{schedule.trainee?.display_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor(schedule.training_type)}`}>
                    {schedule.training_type}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Started: {formatDateTime(session.started_at)}
                  {competency && <span className="ml-2">• {competency}</span>}
                </div>
              </div>
              <span
                className={`transform transition-transform text-gray-400 ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              >
                ▶
              </span>
            </button>

            {/* Session Content - Expanded */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                {/* LTO Training Content */}
                {schedule.training_type === 'LTO' && (
                  <div className="space-y-4">
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
                            handleLTOCheckbox(session.id, 'lto_learninghub_completed', e.target.checked)
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
                            handleLTOCheckbox(session.id, 'lto_handson_completed', e.target.checked)
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
                        onClick={() => handleCompleteLTO(session)}
                        disabled={
                          saving ||
                          !session.lto_learninghub_completed ||
                          !session.lto_handson_completed
                        }
                        className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Done'}
                      </button>
                    </div>
                  </div>
                )}

                {/* AIQ Training Content - Coming Soon */}
                {schedule.training_type === 'AIQ' && (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">AIQ training session content coming soon...</p>
                  </div>
                )}

                {/* Compliance Training Content */}
                {schedule.training_type === 'Compliance' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Complete the following for {schedule.trainee?.display_name}:
                    </p>

                    {/* Show the compliance course name */}
                    {schedule.competency_type && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-orange-800">
                          Course: {schedule.competency_type}
                        </p>
                      </div>
                    )}

                    {/* Compliance Checklist */}
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={session.compliance_learninghub_completed || false}
                          onChange={(e) =>
                            handleComplianceCheckbox(session.id, 'compliance_learninghub_completed', e.target.checked)
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

                      {/* Trainer Prompt */}
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-600 text-lg">💬</span>
                          <div>
                            <span className="font-medium text-sm text-blue-800">Trainer Prompt</span>
                            <p className="text-xs text-blue-700 mt-1">
                              Ask the trainee: "What are 3 things you learned from this training?"
                            </p>
                            <p className="text-xs text-blue-600 mt-2 italic">
                              Listen to their response before marking as complete.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Done Button */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handleCompleteCompliance(session)}
                        disabled={
                          saving ||
                          !session.compliance_learninghub_completed
                        }
                        className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Done'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
