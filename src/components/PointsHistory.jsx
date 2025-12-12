// src/components/PointsHistory.jsx
import { useState } from 'react'
import { useAllPointsHistory, useUndoPoints } from '../hooks/usePointsData'

// Format source type for display
function formatSourceType(source) {
  const sourceLabels = {
    manager: 'Manager Award',
    game: 'Game Award',
    bingo: 'Bingo',
    trivia: 'Trivia',
    spin: 'Spin the Wheel',
    undo: 'Points Undone',
  }
  return sourceLabels[source] || source || 'Unknown'
}

export default function PointsHistory({ locationId, profile }) {
  // Filter state
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [awardType, setAwardType] = useState('all')

  // Undo modal state
  const [undoModalOpen, setUndoModalOpen] = useState(false)
  const [undoTarget, setUndoTarget] = useState(null)
  const [undoReason, setUndoReason] = useState('')
  const [undoError, setUndoError] = useState(null)

  // Build filters object
  const filters = {}
  if (startDate) filters.startDate = new Date(startDate).toISOString()
  if (endDate) {
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    filters.endDate = end.toISOString()
  }
  if (awardType !== 'all') filters.awardType = awardType

  // Fetch points history
  const { data: pointsHistory = [], isLoading, refetch } = useAllPointsHistory(locationId, filters)
  const undoMutation = useUndoPoints()

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
        undoneBy: profile?.id,
      })
      setUndoModalOpen(false)
      setUndoTarget(null)
      setUndoReason('')
    } catch (err) {
      console.error('Error undoing points:', err)
      setUndoError(err?.message || 'Failed to undo points.')
    }
  }

  // Clear filters
  function clearFilters() {
    setStartDate('')
    setEndDate('')
    setAwardType('all')
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-red-600">Points History</h3>
        <p className="text-sm text-gray-600">
          View and manage all points awarded at this location.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 p-3 rounded border space-y-3">
        <div className="text-sm font-medium text-gray-700">Filters</div>

        <div className="flex flex-wrap gap-3">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            />
          </div>

          {/* Award type */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Type:</label>
            <select
              value={awardType}
              onChange={(e) => setAwardType(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="all">All Types</option>
              <option value="manager">Manager Award</option>
              <option value="game">Game Award</option>
              <option value="bingo">Bingo</option>
              <option value="trivia">Trivia</option>
              <option value="spin">Spin the Wheel</option>
              <option value="undo">Undo Records</option>
            </select>
          </div>

          {/* Clear button */}
          <button
            type="button"
            onClick={clearFilters}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading points history...</p>
      ) : pointsHistory.length === 0 ? (
        <p className="text-sm text-gray-500">No points found matching your filters.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <p className="text-xs text-gray-500">{pointsHistory.length} records found</p>

          {pointsHistory.map((record) => {
            const isUndo = record.source === 'undo'
            const isPositive = record.points_amount > 0

            return (
              <div
                key={record.id}
                className={`flex items-start justify-between p-3 rounded border text-sm ${
                  isUndo ? 'bg-orange-50 border-orange-200' : 'bg-white'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{record.points_amount} pts
                    </span>
                    <span className="text-gray-700">
                      {isUndo ? '← from' : '→'} {record.employee_name}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                    <div>
                      <span className={`font-medium ${isUndo ? 'text-orange-700' : ''}`}>
                        {formatSourceType(record.source)}
                      </span>
                      {record.source_detail && (
                        <span> • {record.source_detail}</span>
                      )}
                    </div>

                    {isUndo && record.undone_by_name && (
                      <div className="text-orange-700">Undone by: {record.undone_by_name}</div>
                    )}

                    {record.source === 'manager' && record.awarded_by_name && (
                      <div>Awarded by: {record.awarded_by_name}</div>
                    )}

                    <div>{new Date(record.created_at).toLocaleString()}</div>
                  </div>
                </div>

                {/* Only show Undo button for positive point awards (not for undo records) */}
                {isPositive && !isUndo && (
                  <button
                    type="button"
                    onClick={() => openUndoModal(record)}
                    className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 shrink-0"
                  >
                    Undo
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Undo Modal */}
      {undoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Undo Points Award</h3>
            <p className="text-sm text-gray-600 mb-4">
              You are about to remove <strong>{undoTarget?.points_amount} points</strong> from{' '}
              <strong>{undoTarget?.employee_name}</strong>.
              {undoTarget?.source === 'manager' && undoTarget?.awarded_by_name && (
                <span className="block mt-1">
                  Originally awarded by: {undoTarget.awarded_by_name}
                </span>
              )}
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
                placeholder="e.g. Duplicate entry, incorrect amount, etc."
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
