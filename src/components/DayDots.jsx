// src/components/DayDots.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const SECTIONS = [
  { id: 'morning', label: 'Morning' },
  { id: 'midday', label: 'Midday' },
  { id: 'drive-thru', label: 'Drive-Thru' },
  { id: 'frontline', label: 'Frontline' },
  { id: 'backline', label: 'Backline' },
  { id: 'prep', label: 'Prep' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'cooler', label: 'Cooler' },
]

export default function DayDots({ locationId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Track which section accordion is open
  const [openSection, setOpenSection] = useState(null)

  // Track check status for each item: { [itemId]: 'have' | 'need' | null }
  const [checkStatus, setCheckStatus] = useState({})

  // Track quantity needed for items marked as 'need': { [itemId]: number }
  const [quantities, setQuantities] = useState({})

  // Track which sections are "done" and show their summary
  const [sectionSummaries, setSectionSummaries] = useState({})

  // Fetch daydot items from database
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

  // Get items for a specific section
  function getItemsForSection(sectionId) {
    return items.filter((item) => item.sections?.includes(sectionId))
  }

  // Toggle section accordion
  function toggleSection(sectionId) {
    setOpenSection((current) => (current === sectionId ? null : sectionId))
  }

  // Handle check status change
  function handleCheckChange(itemId, status) {
    setCheckStatus((prev) => ({
      ...prev,
      [itemId]: prev[itemId] === status ? null : status,
    }))

    // Clear quantity if changing away from 'need'
    if (status !== 'need') {
      setQuantities((prev) => {
        const updated = { ...prev }
        delete updated[itemId]
        return updated
      })
    }
  }

  // Handle quantity change
  function handleQuantityChange(itemId, value) {
    const num = parseInt(value, 10)
    setQuantities((prev) => ({
      ...prev,
      [itemId]: Number.isNaN(num) || num < 1 ? '' : num,
    }))
  }

  // Handle "Done" button for a section
  function handleSectionDone(sectionId) {
    const sectionItems = getItemsForSection(sectionId)
    const neededItems = sectionItems
      .filter((item) => checkStatus[item.id] === 'need' && quantities[item.id])
      .map((item) => ({
        id: item.id,
        foodName: item.food_name,
        identifier: item.item_identifier,
        quantity: quantities[item.id],
      }))

    setSectionSummaries((prev) => ({
      ...prev,
      [sectionId]: neededItems,
    }))
  }

  // Clear section summary
  function clearSectionSummary(sectionId) {
    setSectionSummaries((prev) => {
      const updated = { ...prev }
      delete updated[sectionId]
      return updated
    })
  }

  // Reset a section's checks
  function resetSection(sectionId) {
    const sectionItems = getItemsForSection(sectionId)
    const itemIds = sectionItems.map((item) => item.id)

    setCheckStatus((prev) => {
      const updated = { ...prev }
      itemIds.forEach((id) => delete updated[id])
      return updated
    })

    setQuantities((prev) => {
      const updated = { ...prev }
      itemIds.forEach((id) => delete updated[id])
      return updated
    })

    clearSectionSummary(sectionId)
  }

  // Check if section has any needed items
  function sectionHasNeededItems(sectionId) {
    const sectionItems = getItemsForSection(sectionId)
    return sectionItems.some(
      (item) => checkStatus[item.id] === 'need' && quantities[item.id]
    )
  }

  // Get count of items needing dots in a section
  function getNeededCount(sectionId) {
    const sectionItems = getItemsForSection(sectionId)
    return sectionItems.filter(
      (item) => checkStatus[item.id] === 'need' && quantities[item.id]
    ).length
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-600 p-4">Loading day dots items...</div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 p-4 rounded">{error}</div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-sm text-gray-500 p-4">
        No day dot items configured yet. Ask a manager to add items in the Manager Control Center.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {SECTIONS.map((section) => {
        const sectionItems = getItemsForSection(section.id)
        const isOpen = openSection === section.id
        const summary = sectionSummaries[section.id]
        const neededCount = getNeededCount(section.id)

        if (sectionItems.length === 0) {
          return null // Don't show sections with no items
        }

        return (
          <div key={section.id} className="border rounded-lg overflow-hidden">
            {/* Section header */}
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{section.label}</span>
                <span className="text-xs text-gray-500">
                  ({sectionItems.length} items)
                </span>
                {neededCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    {neededCount} need dots
                  </span>
                )}
              </div>
              <span
                className={`transform transition-transform ${
                  isOpen ? 'rotate-90' : ''
                }`}
              >
                ¶
              </span>
            </button>

            {/* Section content */}
            {isOpen && (
              <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                {/* Summary display if section is done */}
                {summary && summary.length > 0 && (
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-green-800">
                        Items to Print - {section.label}
                      </h4>
                      <button
                        type="button"
                        onClick={() => clearSectionSummary(section.id)}
                        className="text-xs text-green-700 hover:underline"
                      >
                        Dismiss
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-green-200">
                            <th className="text-left py-1 pr-3 font-medium text-green-800">
                              Food Item
                            </th>
                            <th className="text-left py-1 px-3 font-medium text-green-800">
                              Identifier
                            </th>
                            <th className="text-right py-1 pl-3 font-medium text-green-800">
                              Qty
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary.map((item) => (
                            <tr key={item.id} className="border-b border-green-100 last:border-0">
                              <td className="py-1 pr-3">{item.foodName}</td>
                              <td className="py-1 px-3 font-mono text-xs">
                                {item.identifier}
                              </td>
                              <td className="py-1 pl-3 text-right font-semibold">
                                {item.quantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Items checklist */}
                <div className="space-y-2">
                  {sectionItems.map((item) => {
                    const status = checkStatus[item.id]
                    const quantity = quantities[item.id]

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded border p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">{item.food_name}</span>

                          <div className="flex items-center gap-3">
                            {/* Have checkbox */}
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={status === 'have'}
                                onChange={() => handleCheckChange(item.id, 'have')}
                                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                              <span className="text-sm text-green-700">Have</span>
                            </label>

                            {/* Need checkbox */}
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={status === 'need'}
                                onChange={() => handleCheckChange(item.id, 'need')}
                                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                              />
                              <span className="text-sm text-red-700">Need</span>
                            </label>
                          </div>
                        </div>

                        {/* Quantity input when "Need" is selected */}
                        {status === 'need' && (
                          <div className="mt-2 flex items-center gap-2 pl-2 border-l-2 border-red-200">
                            <label className="text-sm text-gray-600">
                              How many?
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={quantity || ''}
                              onChange={(e) =>
                                handleQuantityChange(item.id, e.target.value)
                              }
                              className="w-20 border rounded px-2 py-1 text-sm"
                              placeholder="Qty"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => resetSection(section.id)}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Reset Section
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSectionDone(section.id)}
                    disabled={!sectionHasNeededItems(section.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Done - Show Items to Print
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
