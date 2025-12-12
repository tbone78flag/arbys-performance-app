// src/components/PointsAddition.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAwardPoints, useRecentAwards, useUndoPoints } from '../hooks/usePointsData'

// Title hierarchy - higher number = higher rank
const TITLE_RANK = {
  'Team Member': 1,
  'Shift Manager': 2,
  'Assistant Manager': 3,
  'General Manager': 4,
}

// Get titles that a manager can award points to (lower than their own)
function getAllowedTitles(managerTitle) {
  const managerRank = TITLE_RANK[managerTitle] || 0
  return Object.entries(TITLE_RANK)
    .filter(([, rank]) => rank < managerRank)
    .map(([title]) => title)
}

export default function PointsAddition({ locationId, managerProfile }) {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Form state
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [pointsAmount, setPointsAmount] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // Undo modal state
  const [undoModalOpen, setUndoModalOpen] = useState(false)
  const [undoTarget, setUndoTarget] = useState(null)
  const [undoReason, setUndoReason] = useState('')
  const [undoError, setUndoError] = useState(null)

  const managerId = managerProfile?.id
  const managerTitle = managerProfile?.title
  const allowedTitles = getAllowedTitles(managerTitle)

  // Use mutation hook for awarding points
  const awardMutation = useAwardPoints()
  const undoMutation = useUndoPoints()

  // Fetch recent awards by this manager
  const { data: recentAwards = [], isLoading: recentLoading } = useRecentAwards(managerId, locationId)

  // Fetch employees for this location (excluding self, filtered by title hierarchy)
  useEffect(() => {
    async function fetchEmployees() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('employees')
        .select('id, display_name, username, title')
        .eq('location_id', locationId)
        .order('display_name', { ascending: true })

      if (fetchError) {
        console.error('Error loading employees', fetchError)
        setError(`Failed to load employees: ${fetchError.message}`)
      } else {
        // Filter: exclude self and only include employees with lower titles
        const filtered = (data || []).filter((emp) => {
          // Exclude self
          if (emp.id === managerId) return false
          // Only include employees with allowed titles (lower in hierarchy)
          return allowedTitles.includes(emp.title)
        })
        setEmployees(filtered)
      }

      setLoading(false)
    }

    if (managerId && managerTitle) {
      fetchEmployees()
    }
  }, [locationId, managerId, managerTitle, allowedTitles.join(',')])

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Award points to employee
  async function handleAwardPoints(e) {
    e.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    if (!selectedEmployee) {
      setFormError('Please select an employee.')
      return
    }

    const points = parseInt(pointsAmount, 10)
    if (!points || points < 1) {
      setFormError('Points must be at least 1.')
      return
    }

    if (!reason.trim()) {
      setFormError('Please provide a reason for the points.')
      return
    }

    try {
      await awardMutation.mutateAsync({
        employeeId: selectedEmployee,
        locationId,
        points,
        reason: reason.trim(),
        awardedBy: managerId,
      })

      const employeeName =
        employees.find((e) => e.id === selectedEmployee)?.display_name ||
        'Employee'

      setSuccessMessage(`Successfully awarded ${points} points to ${employeeName}!`)
      setSelectedEmployee('')
      setPointsAmount('')
      setReason('')
    } catch (err) {
      console.error('Error awarding points:', err)
      setFormError(err?.message || 'Failed to award points.')
    }
  }

  // Handle undo
  function openUndoModal(award) {
    setUndoTarget(award)
    setUndoReason('')
    setUndoError(null)
    setUndoModalOpen(true)
  }

  async function handleUndo() {
    if (!undoReason.trim()) {
      setUndoError('Please provide a reason for undoing this award.')
      return
    }

    try {
      await undoMutation.mutateAsync({
        pointsLogId: undoTarget.id,
        reason: undoReason.trim(),
        undoneBy: managerId,
      })
      setUndoModalOpen(false)
      setUndoTarget(null)
      setUndoReason('')
    } catch (err) {
      console.error('Error undoing points:', err)
      setUndoError(err?.message || 'Failed to undo points.')
    }
  }

  // Format time ago
  function formatTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return new Date(dateStr).toLocaleDateString()
  }

  // Quick award buttons
  const quickAwards = [
    { points: 5, label: '+5' },
    { points: 10, label: '+10' },
    { points: 25, label: '+25' },
    { points: 50, label: '+50' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-red-600">Award Points</h3>
        <p className="text-sm text-gray-600">
          Award points to team members for great performance, achievements, or recognition.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}

      {successMessage && (
        <p className="text-sm text-green-700 bg-green-50 p-3 rounded border border-green-200">
          {successMessage}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-600">Loading employees...</p>
      ) : (
        <form onSubmit={handleAwardPoints} className="space-y-4">
          {formError && <p className="text-sm text-red-600">{formError}</p>}

          {/* Employee selection */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Select Employee</label>
            <select
              className="border rounded px-3 py-2 text-sm"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">Choose an employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.display_name} - {emp.title || 'Team Member'}
                </option>
              ))}
            </select>
          </div>

          {/* Points amount with quick buttons */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Points Amount</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {quickAwards.map((qa) => (
                <button
                  key={qa.points}
                  type="button"
                  onClick={() => setPointsAmount(qa.points.toString())}
                  className={`px-3 py-1 rounded border text-sm ${
                    pointsAmount === qa.points.toString()
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
                  }`}
                >
                  {qa.label}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              className="border rounded px-3 py-2 text-sm"
              value={pointsAmount}
              onChange={(e) => setPointsAmount(e.target.value)}
              placeholder="Or enter custom amount"
            />
          </div>

          {/* Reason */}
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Reason</label>
            <input
              type="text"
              className="border rounded px-3 py-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Great customer service, Perfect attendance, etc."
            />
          </div>

          <button
            type="submit"
            disabled={awardMutation.isPending}
            className="w-full bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-60"
          >
            {awardMutation.isPending ? 'Awarding...' : 'Award Points'}
          </button>
        </form>
      )}

      {/* Recent Awards Section */}
      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Your Recent Awards</h4>
        <p className="text-xs text-gray-500 mb-3">
          Awards can be undone within 1 hour of being given.
        </p>

        {recentLoading ? (
          <p className="text-sm text-gray-500">Loading recent awards...</p>
        ) : recentAwards.length === 0 ? (
          <p className="text-sm text-gray-500">No recent awards.</p>
        ) : (
          <div className="space-y-2">
            {recentAwards.map((award) => (
              <div
                key={award.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded border text-sm"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    +{award.points_amount} pts → {award.employee_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {award.source_detail} • {formatTimeAgo(award.created_at)}
                  </div>
                </div>
                {award.canUndo ? (
                  <button
                    type="button"
                    onClick={() => openUndoModal(award)}
                    className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                  >
                    Undo
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">Expired</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Undo Modal */}
      {undoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Undo Points Award</h3>
            <p className="text-sm text-gray-600 mb-4">
              You are about to remove <strong>{undoTarget?.points_amount} points</strong> from{' '}
              <strong>{undoTarget?.employee_name}</strong>.
            </p>

            {undoError && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">{undoError}</p>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Reason for undo *</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2 text-sm"
                value={undoReason}
                onChange={(e) => setUndoReason(e.target.value)}
                placeholder="e.g. Incorrect point amount, wrong employee, etc."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUndoModalOpen(false)}
                className="flex-1 px-4 py-2 border rounded text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUndo}
                disabled={undoMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-60"
              >
                {undoMutation.isPending ? 'Undoing...' : 'Confirm Undo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
