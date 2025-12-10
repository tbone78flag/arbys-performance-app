// src/components/RewardsManager.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function RewardsManager({ locationId }) {
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Form state
  const [rewardName, setRewardName] = useState('')
  const [pointsCost, setPointsCost] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  // Edit state
  const [editingReward, setEditingReward] = useState(null)
  const [editName, setEditName] = useState('')
  const [editCost, setEditCost] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState(null)

  // Fetch rewards
  useEffect(() => {
    async function fetchRewards() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('points_rewards')
        .select('*')
        .eq('location_id', locationId)
        .eq('active', true)
        .order('points_cost', { ascending: true })

      if (fetchError) {
        console.error('Error loading rewards', fetchError)
        setError(`Failed to load rewards: ${fetchError.message}`)
      } else {
        setRewards(data || [])
      }

      setLoading(false)
    }

    fetchRewards()
  }, [locationId])

  // Add new reward
  async function handleAddReward(e) {
    e.preventDefault()
    setFormError(null)

    if (!rewardName.trim()) {
      setFormError('Reward name is required.')
      return
    }

    const cost = parseInt(pointsCost, 10)
    if (!cost || cost < 1) {
      setFormError('Points cost must be at least 1.')
      return
    }

    setSaving(true)

    try {
      const { data, error: insertError } = await supabase
        .from('points_rewards')
        .insert({
          location_id: locationId,
          reward_name: rewardName.trim(),
          points_cost: cost,
          active: true,
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error adding reward', insertError)
        setFormError(`Failed to add reward: ${insertError.message}`)
        return
      }

      setRewards((prev) =>
        [...prev, data].sort((a, b) => a.points_cost - b.points_cost)
      )
      setRewardName('')
      setPointsCost('')
    } catch (err) {
      console.error('Error adding reward:', err)
      setFormError(err?.message || 'Failed to add reward.')
    } finally {
      setSaving(false)
    }
  }

  // Delete reward (soft delete by setting active = false)
  async function handleDeleteReward(rewardId, rewardName) {
    if (
      !window.confirm(
        `Are you sure you want to remove "${rewardName}" from available rewards?`
      )
    ) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('points_rewards')
        .update({ active: false })
        .eq('id', rewardId)

      if (deleteError) {
        console.error('Error deleting reward', deleteError)
        setError(`Failed to delete reward: ${deleteError.message}`)
        return
      }

      setRewards((prev) => prev.filter((r) => r.id !== rewardId))
    } catch (err) {
      console.error('Error deleting reward:', err)
      setError(err?.message || 'Failed to delete reward.')
    }
  }

  // Open edit modal
  function openEditModal(reward) {
    setEditingReward(reward)
    setEditName(reward.reward_name || '')
    setEditCost(reward.points_cost?.toString() || '')
    setEditError(null)
  }

  // Close edit modal
  function closeEditModal() {
    setEditingReward(null)
    setEditName('')
    setEditCost('')
    setEditError(null)
  }

  // Save edit
  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editingReward) return

    setEditError(null)

    if (!editName.trim()) {
      setEditError('Reward name is required.')
      return
    }

    const cost = parseInt(editCost, 10)
    if (!cost || cost < 1) {
      setEditError('Points cost must be at least 1.')
      return
    }

    setSavingEdit(true)

    try {
      const { error: updateError } = await supabase
        .from('points_rewards')
        .update({
          reward_name: editName.trim(),
          points_cost: cost,
        })
        .eq('id', editingReward.id)

      if (updateError) {
        console.error('Error updating reward', updateError)
        setEditError(`Failed to update reward: ${updateError.message}`)
        return
      }

      setRewards((prev) =>
        prev
          .map((r) =>
            r.id === editingReward.id
              ? { ...r, reward_name: editName.trim(), points_cost: cost }
              : r
          )
          .sort((a, b) => a.points_cost - b.points_cost)
      )

      closeEditModal()
    } catch (err) {
      console.error('Error saving edit:', err)
      setEditError(err?.message || 'Failed to save changes.')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-red-600">Points Rewards Manager</h3>
        <p className="text-sm text-gray-600">
          Configure rewards that employees can redeem with their points.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}

      {/* Add new reward form */}
      <div className="bg-gray-50 rounded p-4 space-y-3">
        <h4 className="font-medium">Add New Reward</h4>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <form onSubmit={handleAddReward} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-1">Reward Name</label>
            <input
              type="text"
              className="border rounded px-3 py-2 text-sm"
              value={rewardName}
              onChange={(e) => setRewardName(e.target.value)}
              placeholder="e.g. Free Drink"
            />
          </div>

          <div className="flex flex-col w-32">
            <label className="text-sm font-medium mb-1">Points Cost</label>
            <input
              type="number"
              min="1"
              className="border rounded px-3 py-2 text-sm"
              value={pointsCost}
              onChange={(e) => setPointsCost(e.target.value)}
              placeholder="e.g. 50"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-60"
          >
            {saving ? 'Adding...' : 'Add Reward'}
          </button>
        </form>
      </div>

      {/* Rewards list */}
      <div>
        <h4 className="font-medium mb-2">Available Rewards ({rewards.length})</h4>

        {loading ? (
          <p className="text-sm text-gray-600">Loading rewards...</p>
        ) : rewards.length === 0 ? (
          <p className="text-sm text-gray-500">No rewards configured yet.</p>
        ) : (
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Reward</th>
                  <th className="px-3 py-2 text-right">Points Cost</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map((reward) => (
                  <tr key={reward.id} className="border-t">
                    <td className="px-3 py-2">{reward.reward_name}</td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {reward.points_cost} pts
                    </td>
                    <td className="px-3 py-2 space-x-2">
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => openEditModal(reward)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs text-red-600 hover:underline"
                        onClick={() =>
                          handleDeleteReward(reward.id, reward.reward_name)
                        }
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingReward && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                Edit Reward: {editingReward.reward_name}
              </h3>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 space-y-4">
              {editError && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {editError}
                </p>
              )}

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Reward Name
                </label>
                <input
                  type="text"
                  className="border rounded px-3 py-2 text-sm"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Reward name"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Points Cost
                </label>
                <input
                  type="number"
                  min="1"
                  className="border rounded px-3 py-2 text-sm"
                  value={editCost}
                  onChange={(e) => setEditCost(e.target.value)}
                  placeholder="Points cost"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
