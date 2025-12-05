// src/components/DailySalesYoYCard.jsx
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { addDays, ymdLocal, parseYmdLocal } from '../utils/dateHelpers'

export function DailySalesYoYCard({ locationId, isEditor }) {
  const [salesDate, setSalesDate] = useState(() => ymdLocal(new Date()))
  const [salesThisYear, setSalesThisYear] = useState('')
  const [salesLastYear, setSalesLastYear] = useState('')
  const [savingSales, setSavingSales] = useState(false)
  const [salesMsg, setSalesMsg] = useState(null)

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

  // Load from Supabase when date/location changes
  useEffect(() => {
    if (!locationId) return

    let cancelled = false

    async function loadDay() {
      setSalesMsg(null)
      const { data, error } = await supabase
        .from('daily_sales_yoy')
        .select('net_sales_this_year, net_sales_last_year')
        .eq('location_id', locationId)
        .eq('sales_date', salesDate)
        .maybeSingle()

      if (cancelled) return

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading daily sales', error)
        setSalesMsg('Error loading day.')
        return
      }

      if (!data) {
        setSalesThisYear('')
        setSalesLastYear('')
      } else {
        setSalesThisYear(data.net_sales_this_year ?? '')
        setSalesLastYear(data.net_sales_last_year ?? '')
      }
    }

    loadDay()
    return () => {
      cancelled = true
    }
  }, [locationId, salesDate])

  async function saveDailySales() {
    if (!isEditor || !locationId) return

    setSavingSales(true)
    setSalesMsg(null)

    try {
      const thisY = salesThisYear === '' ? null : Number(salesThisYear)
      const lastY = salesLastYear === '' ? null : Number(salesLastYear)

      const { error } = await supabase
        .from('daily_sales_yoy')
        .upsert(
          {
            location_id: locationId,
            sales_date: salesDate,
            net_sales_this_year: thisY,
            net_sales_last_year: lastY,
          },
          { onConflict: 'location_id,sales_date' }
        )

      if (error) throw error

      setSalesMsg('Day saved.')
    } catch (err) {
      console.error('Error saving daily sales', err)
      setSalesMsg('Error saving day.')
    } finally {
      setSavingSales(false)
    }
  }

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
          disabled={savingSales || !isEditor}
          className="bg-red-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {savingSales ? 'Saving…' : 'Save Day'}
        </button>
      </div>

      {salesMsg && (
        <p className="text-xs text-gray-600">
          {salesMsg}
        </p>
      )}
    </div>
  )
}
