// src/pages/SalesPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import BingoGame from '../components/BingoGame'


function WhatIfCalculator({ profile, locationId = 'default' }) {
  const [averageCheck, setAverageCheck] = useState(0)
  const [raise, setRaise] = useState(0)
  const [transactionsPerDay, setTransactionsPerDay] = useState(200)
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

      if (!error && avgData) {
        setAverageCheck(Number(avgData.value))
      }
      setLoading(false)
    }
    load()
  }, [profile, locationId])

  if (loading) return <div className="p-4">Loading calculator…</div>

  const additionalPerYear = raise * transactionsPerDay * 365

  return (
    <div className="bg-white shadow rounded p-4 mb-6">
      <h2 className="text-lg font-semibold mb-2">What If Calculator</h2>

      <p className="mb-2">
        The average check at our location is{' '}
        <strong>${averageCheck.toFixed(2)}</strong>. Imagine we raised that by{' '}
        <input
          type="number"
          step="0.01"
          value={raise}
          onChange={e => setRaise(Number(e.target.value))}
          className="inline w-24 border px-2 py-1 rounded"
          placeholder="0.50"
        />{' '}
        dollars. Then if we get{' '}
        <input
          type="number"
          value={transactionsPerDay}
          onChange={e => setTransactionsPerDay(Number(e.target.value))}
          className="inline w-20 border px-2 py-1 rounded"
        />{' '}
        transactions a day this would add an additional{' '}
        <strong>
          $
          {additionalPerYear.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </strong>{' '}
        per year to our profits.
      </p>
      <p>Best way to look at this calculator is to think of realistic amount of transactions you think you could upsell to in a day (ie. 10 transactions).
        Then type in the amount you think you could add on (ie. $2.59 for just adding one turnover to those 10 people) 
        and see how that affects our sales for the year (ie. adds $9,453.50 per year to sales).
      </p>
      <p className="text-lg italic">*Check out the speed page to see what could happen by just increasing the amount of transactions with the current average check.</p>
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
    if (!profile) {
      navigate('/')
    }
  }, [profile, navigate])

  return (
    <div className="w-full max-w-3xl bg-white shadow p-6 rounded">
      <h1 className="text-2xl font-bold mb-4 text-red-700">Sales Dashboard</h1>

      <BingoGame />

      {/* What-if calculator visible to all (will show loading if average_check is restricted) */}
      <WhatIfCalculator profile={profile} />

      {/* Manager-only section */}
      {profile?.role === 'manager' && (
        <div className="border-t pt-4 mt-4">
          <h2 className="text-lg font-semibold text-red-600">Manager Tools</h2>
          <p>
            Only visible to managers — e.g. target goals, override entries, etc.
          </p>
        </div>
      )}
    </div>
  )
}
