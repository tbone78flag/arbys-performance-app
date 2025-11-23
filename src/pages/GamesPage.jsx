// src/pages/GamesPage.jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function GamesPage({ profile }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile) {
      navigate('/')
    }
  }, [profile, navigate])

  return (
      <div className="w-full max-w-3xl bg-white shadow p-6 rounded">
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
