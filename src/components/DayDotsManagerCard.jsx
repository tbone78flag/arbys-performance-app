// src/components/DayDotsManagerCard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const SECTIONS = [
  { id: 'drive-thru', label: 'Drive-Thru' },
  { id: 'frontline', label: 'Frontline' },
  { id: 'backline', label: 'Backline' },
  { id: 'prep', label: 'Prep' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'cooler', label: 'Cooler' },
]

export default function DayDotsManagerCard({ locationId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Form state for adding new item
  const [foodName, setFoodName] = useState('')
  const [selectedSections, setSelectedSections] = useState([])
  const [itemIdentifier, setItemIdentifier] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  // Edit modal state
  const [editingItem, setEditingItem] = useState(null)
  const [editFoodName, setEditFoodName] = useState('')
  const [editSections, setEditSections] = useState([])
  const [editIdentifier, setEditIdentifier] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState(null)

  // Fetch existing daydot items
  useEffect(() => {
    async function fetchItems() {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('daydot_items')
        .select('*')
        .eq('location_id', locationId)
        .order('food_name', { ascending: true })

      if (fetchError) {
        console.error('Error loading daydot items', fetchError)
        setError(`Failed to load items: ${fetchError.message}`)
      } else {
        setItems(data || [])
      }

      setLoading(false)
    }

    fetchItems()
  }, [locationId])

  // Toggle section selection for add form
  function toggleSection(sectionId) {
    setSelectedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((s) => s !== sectionId)
        : [...prev, sectionId]
    )
  }

  // Toggle section selection for edit form
  function toggleEditSection(sectionId) {
    setEditSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((s) => s !== sectionId)
        : [...prev, sectionId]
    )
  }

  // Add new daydot item
  async function handleAddItem(e) {
    e.preventDefault()
    setFormError(null)

    if (!foodName.trim()) {
      setFormError('Food item name is required.')
      return
    }
    if (selectedSections.length === 0) {
      setFormError('Please select at least one section.')
      return
    }
    if (!itemIdentifier.trim()) {
      setFormError('Item identifier is required.')
      return
    }

    setSaving(true)

    try {
      const { data, error: insertError } = await supabase
        .from('daydot_items')
        .insert({
          location_id: locationId,
          food_name: foodName.trim(),
          sections: selectedSections,
          item_identifier: itemIdentifier.trim(),
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error adding daydot item', insertError)
        setFormError(`Failed to add item: ${insertError.message}`)
        return
      }

      // Add to local state
      setItems((prev) => [...prev, data].sort((a, b) => a.food_name.localeCompare(b.food_name)))

      // Reset form
      setFoodName('')
      setSelectedSections([])
      setItemIdentifier('')
    } catch (err) {
      console.error('Error adding item:', err)
      setFormError(err?.message || 'Failed to add item.')
    } finally {
      setSaving(false)
    }
  }

  // Delete daydot item
  async function handleDeleteItem(itemId, itemName) {
    if (!window.confirm(`Are you sure you want to delete "${itemName}"? This cannot be undone.`)) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('daydot_items')
        .delete()
        .eq('id', itemId)

      if (deleteError) {
        console.error('Error deleting item', deleteError)
        setError(`Failed to delete item: ${deleteError.message}`)
        return
      }

      // Remove from local state
      setItems((prev) => prev.filter((item) => item.id !== itemId))
    } catch (err) {
      console.error('Error deleting item:', err)
      setError(err?.message || 'Failed to delete item.')
    }
  }

  // Open edit modal
  function openEditModal(item) {
    setEditingItem(item)
    setEditFoodName(item.food_name || '')
    setEditSections(item.sections || [])
    setEditIdentifier(item.item_identifier || '')
    setEditError(null)
  }

  // Close edit modal
  function closeEditModal() {
    setEditingItem(null)
    setEditFoodName('')
    setEditSections([])
    setEditIdentifier('')
    setEditError(null)
  }

  // Save edited item
  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editingItem) return

    setEditError(null)

    if (!editFoodName.trim()) {
      setEditError('Food item name is required.')
      return
    }
    if (editSections.length === 0) {
      setEditError('Please select at least one section.')
      return
    }
    if (!editIdentifier.trim()) {
      setEditError('Item identifier is required.')
      return
    }

    setSavingEdit(true)

    try {
      const { error: updateError } = await supabase
        .from('daydot_items')
        .update({
          food_name: editFoodName.trim(),
          sections: editSections,
          item_identifier: editIdentifier.trim(),
        })
        .eq('id', editingItem.id)

      if (updateError) {
        console.error('Error updating item', updateError)
        setEditError(`Failed to update item: ${updateError.message}`)
        return
      }

      // Update local state
      setItems((prev) =>
        prev
          .map((item) =>
            item.id === editingItem.id
              ? {
                  ...item,
                  food_name: editFoodName.trim(),
                  sections: editSections,
                  item_identifier: editIdentifier.trim(),
                }
              : item
          )
          .sort((a, b) => a.food_name.localeCompare(b.food_name))
      )

      closeEditModal()
    } catch (err) {
      console.error('Error saving edit:', err)
      setEditError(err?.message || 'Failed to save changes.')
    } finally {
      setSavingEdit(false)
    }
  }

  // Get section labels for display
  function getSectionLabels(sectionIds) {
    return sectionIds
      .map((id) => SECTIONS.find((s) => s.id === id)?.label || id)
      .join(', ')
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-red-600">Day Dots Manager</h3>
        <p className="text-sm text-gray-600">
          Add food items that need day dots, specify which sections they belong to, and their identifier in the day dot printing portal.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}

      {/* Add new item form */}
      <div className="bg-gray-50 rounded p-4 space-y-3">
        <h4 className="font-medium">Add New Item</h4>

        {formError && (
          <p className="text-sm text-red-600">{formError}</p>
        )}

        <form onSubmit={handleAddItem} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">Food Item Name</label>
              <input
                type="text"
                className="border rounded px-3 py-2 text-sm"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="e.g. Roast Beef"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm font-medium mb-1">Item Identifier (Portal Name)</label>
              <input
                type="text"
                className="border rounded px-3 py-2 text-sm"
                value={itemIdentifier}
                onChange={(e) => setItemIdentifier(e.target.value)}
                placeholder="e.g. RB-SLICED"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium mb-2">Sections (select all that apply)</label>
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map((section) => (
                <label
                  key={section.id}
                  className={`inline-flex items-center px-3 py-1.5 rounded border cursor-pointer text-sm transition-colors ${
                    selectedSections.includes(section.id)
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedSections.includes(section.id)}
                    onChange={() => toggleSection(section.id)}
                  />
                  {section.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-60"
            >
              {saving ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>

      {/* Items list */}
      <div>
        <h4 className="font-medium mb-2">Current Items ({items.length})</h4>

        {loading ? (
          <p className="text-sm text-gray-600">Loading items...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">No day dot items added yet.</p>
        ) : (
          <div className="overflow-x-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Food Item</th>
                  <th className="px-3 py-2 text-left">Sections</th>
                  <th className="px-3 py-2 text-left">Identifier</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2">{item.food_name}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {(item.sections || []).map((sectionId) => (
                          <span
                            key={sectionId}
                            className="inline-block px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs"
                          >
                            {SECTIONS.find((s) => s.id === sectionId)?.label || sectionId}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{item.item_identifier}</td>
                    <td className="px-3 py-2 space-x-2">
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => openEditModal(item)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => handleDeleteItem(item.id, item.food_name)}
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
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                Edit Item: {editingItem.food_name}
              </h3>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 space-y-4">
              {editError && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{editError}</p>
              )}

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Food Item Name</label>
                <input
                  type="text"
                  className="border rounded px-3 py-2 text-sm"
                  value={editFoodName}
                  onChange={(e) => setEditFoodName(e.target.value)}
                  placeholder="Food item name"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Item Identifier (Portal Name)</label>
                <input
                  type="text"
                  className="border rounded px-3 py-2 text-sm"
                  value={editIdentifier}
                  onChange={(e) => setEditIdentifier(e.target.value)}
                  placeholder="Item identifier"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">Sections</label>
                <div className="flex flex-wrap gap-2">
                  {SECTIONS.map((section) => (
                    <label
                      key={section.id}
                      className={`inline-flex items-center px-3 py-1.5 rounded border cursor-pointer text-sm transition-colors ${
                        editSections.includes(section.id)
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={editSections.includes(section.id)}
                        onChange={() => toggleEditSection(section.id)}
                      />
                      {section.label}
                    </label>
                  ))}
                </div>
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
