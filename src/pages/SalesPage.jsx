// src/pages/SalesPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import BingoGame from '../components/BingoGame'
import CashControl from '../components/CashControl';

function WhatIfCalculator({ profile, locationId = 'default' }) {
  const [averageCheck, setAverageCheck] = useState(0)
  const [raise, setRaise] = useState('')
  const [transactionsPerDay, setTransactionsPerDay] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const { data: avgData, error } = await supabase
        .from('location_settings')
        .select('value')
        .eq('location_id', locationId)
        .eq('key', 'average_check')
        .single()

      if (!error && avgData) setAverageCheck(Number(avgData.value))
      setLoading(false)
    }
    load()
  }, [profile, locationId])

  if (loading) return <div className="p-4">Loading calculator…</div>

  const r = parseFloat(raise) || 0
  const t = parseInt(transactionsPerDay, 10) || 0
  const additionalPerYear = r * t * 365

  return (
    <div className="bg-white shadow rounded p-4 sm:p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">What If Calculator</h2>

      {/* Mobile-first form layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Average Check</label>
          <input
            type="number"
            step="0.01"
            value={averageCheck}
            disabled
            className="w-full border px-3 py-2 rounded bg-gray-50 text-gray-700"
          />
          <p className="text-xs text-gray-500 mt-1">From location settings</p>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Add-On Amount ($)</label>
          <input
            type="number"
            step="0.01"
            value={raise}
            onChange={e => setRaise(e.target.value)}
            onFocus={e => e.target.select()}
            inputMode="decimal"
            className="w-full border px-3 py-2 rounded"
            placeholder="0.50"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Transactions / Day</label>
          <input
            type="number"
            value={transactionsPerDay}
            onChange={e => setTransactionsPerDay(e.target.value)}
            onFocus={e => e.target.select()}
            inputMode="numeric"
            pattern="[0-9]*"
            className="w-full border px-3 py-2 rounded"
            placeholder="200"
            />
        </div>

        <div className="flex flex-col justify-end">
          <div className="text-sm text-gray-600 mb-1">Projected Annual Increase</div>
          <div className="text-2xl font-bold">
            $
            {additionalPerYear.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed">
        Tip: pick a realistic number of upsells per day (e.g., 10). Then enter the add-on (e.g., $2.59 for one turnover).
        That’s how you translate small wins into annual sales impact.
      </p>

      <p className="mt-2 text-sm italic">
        *Check out the speed page to see impact from increasing transactions with the current average check.
      </p>

      <button
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mt-4"
        onClick={() => navigate('/speed')}
      >
        Speed Page
      </button>
    </div>
  )
}

export default function SalesPage({ profile }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile) navigate('/')
  }, [profile, navigate])

  return (
    // mx-auto centers, px-* protects on phones, max-w keeps it readable
    <div className="w-full max-w-3xl mx-auto bg-white shadow p-4 sm:p-6 rounded px-4 sm:px-6">
      {/* Header row */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-red-700">Sales Dashboard</h1>

        <button
          className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-red-700 shrink-0"
          onClick={() => navigate('/App')}
          aria-label="Go back"
        >
          Go Back
        </button>
      </div>

      <BingoGame />

      <WhatIfCalculator profile={profile} />

      {profile?.role === 'manager' && (
        <div className="border-t pt-4 mt-4">
          <h2 className="text-lg font-semibold text-red-600">Manager Tools</h2>
          <p>Only visible to managers — e.g. target goals, override entries, etc.</p>
          
          <CashControl />

        </div>
      )}
    </div>
  )
}
