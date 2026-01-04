// src/components/DailySalesYoYCard.jsx
import { useState, useEffect, useMemo } from 'react'
import { addDays, ymdLocal, parseYmdLocal } from '../utils/dateHelpers'
import { useDailySales, useSaveDailySales } from '../hooks/useSalesData'

export function DailySalesYoYCard({ locationId, isEditor }) {
  const [salesDate, setSalesDate] = useState(() => ymdLocal(new Date()))
  const [salesThisYear, setSalesThisYear] = useState('')
  const [salesLastYear, setSalesLastYear] = useState('')
  const [salesMsg, setSalesMsg] = useState(null)

  // Use React Query for fetching
  const { data: dailyData, isLoading: loadingSales } = useDailySales(locationId, salesDate)

  // Use React Query mutation for saving (with automatic cache invalidation)
  const saveMutation = useSaveDailySales()

  // Sync local state when data loads
  useEffect(() => {
    if (dailyData) {
      setSalesThisYear(dailyData.net_sales_this_year ?? '')
      setSalesLastYear(dailyData.net_sales_last_year ?? '')
    } else {
      setSalesThisYear('')
      setSalesLastYear('')
    }
  }, [dailyData])

  const shiftSalesDate = (days) => {
    const d = parseYmdLocal(salesDate)
    if (Number.isNaN(d.getTime())) return
    const shifted = addDays(d, days)
    setSalesDate(ymdLocal(shifted))
  }

  const yoyPct = useMemo(() => {
    const thisY = Number(salesThisYear)
    const lastY = Number(salesLastYear)
    if (!Number.isFinite(thisY) || !Number.isFinite(lastY) || lastY === 0) return null
    return ((thisY - lastY) / lastY) * 100
  }, [salesThisYear, salesLastYear])

  async function saveDailySales() {
    if (!isEditor || !locationId) return

    setSalesMsg(null)

    try {
      await saveMutation.mutateAsync({
        locationId,
        salesDate,
        netSalesThisYear: salesThisYear,
        netSalesLastYear: salesLastYear,
      })
      setSalesMsg('Day saved.')
    } catch (err) {
      console.error('Error saving daily sales', err)
      setSalesMsg('Error saving day.')
    }
  }

  // Clear message after timeout
  useEffect(() => {
    if (!salesMsg) return
    const t = setTimeout(() => setSalesMsg(null), 4000)
    return () => clearTimeout(t)
  }, [salesMsg])

  return (
    <div className="bg-white shadow rounded p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="font-semibold text-red-700">
          Daily Sales — Year over Year
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded border text-sm"
            onClick={() => shiftSalesDate(-1)}
          >
            ← Prev Day
          </button>

          <input
            type="date"
            value={salesDate}
            onChange={(e) => setSalesDate(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
            aria-label="Sales date"
          />

          <button
            type="button"
            className="px-3 py-1.5 rounded border text-sm"
            onClick={() => shiftSalesDate(1)}
          >
            Next Day →
          </button>
        </div>
      </div>

      {loadingSales && (
        <p className="text-xs text-gray-500 mb-2">Loading...</p>
      )}

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Net Sales – This Year
          </label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 text-sm"
            value={salesThisYear}
            onChange={(e) => setSalesThisYear(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Net Sales – Last Year
          </label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2 text-sm"
            value={salesLastYear}
            onChange={(e) => setSalesLastYear(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* YoY display */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-sm text-gray-700">
          YoY %:{' '}
          {yoyPct == null ? (
            <span className="text-gray-500">N/A</span>
          ) : (
            <span
              className={
                yoyPct > 0 ? 'text-green-700 font-semibold'
                : yoyPct < 0 ? 'text-red-700 font-semibold'
                : 'font-semibold'
              }
            >
              {yoyPct > 0 ? '+' : ''}
              {yoyPct.toFixed(1)}%
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={saveDailySales}
          disabled={saveMutation.isPending || !isEditor}
          className="bg-red-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save Day'}
        </button>
      </div>

      {salesMsg && (
        <p className={`text-xs ${salesMsg.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {salesMsg}
        </p>
      )}
    </div>
  )
}
