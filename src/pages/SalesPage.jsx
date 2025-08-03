// src/pages/SalesPage.jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import BingoGame from '../components/BingoGame'

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

      {/* Accessible to all team members */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Understanding Sales</h2>
        <p>The average check at our location is $_____. Imagine that we raised that by just ____. Then if we get 200 transactions a day this would add an additional $_____ per year to our profits.</p>
        <p>Upselling can help increase the average check by little increments that really add up. Think about that as you complete various games.</p>
        {/* Later: form or button */}
      </div>

      {/* Manager-only section */}
      {profile?.role === 'manager' && (
        <div className="border-t pt-4 mt-4">
          <h2 className="text-lg font-semibold text-red-600">Manager Tools</h2>
          <p>Only visible to managers — e.g. target goals, override entries, etc.</p>
        </div>
      )}
    </div>
  )
}
