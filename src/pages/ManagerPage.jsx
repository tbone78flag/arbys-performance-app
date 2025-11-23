// src/pages/ManagerPage.jsx
import { useSate, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function ManagerPage({ profile }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile) {
      navigate('/')
    }
  }, [profile, navigate])


  return (      
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
      
      <h1 className="text-2xl font-bold mb-4 text-red-700">Points Leaderboard</h1>

      {/* Accessible to all team members */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Total Points</h2>
        <p>Team members can redeem points here:</p>
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
