// src/components/PointsAddition.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

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
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  const managerId = managerProfile?.id
  const managerTitle = managerProfile?.title
  const allowedTitles = getAllowedTitles(managerTitle)

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

    setSaving(true)

    try {
      const { error: insertError } = await supabase.from('points_log').insert({
        employee_id: selectedEmployee,
        location_id: locationId,
        points_amount: points,
        source: 'manager',
        source_detail: reason.trim(),
        awarded_by: managerId,
      })

      if (insertError) {
        console.error('Error awarding points', insertError)
        setFormError(`Failed to award points: ${insertError.message}`)
        return
      }

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
    } finally {
      setSaving(false)
    }
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
            disabled={saving}
            className="w-full bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-60"
          >
            {saving ? 'Awarding...' : 'Award Points'}
          </button>
        </form>
      )}
    </div>
  )
}
