// src/pages/ManagerPage.jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CashControl from '../components/CashControl'
import TeamManagement from '../components/TeamManagement'

export default function ManagerPage({ profile }) {
  const navigate = useNavigate()

  const locationId = profile?.location_id || 'holladay-3900'

  useEffect(() => {
    if (!profile) {
      navigate('/')
    }
  }, [profile, navigate])

  const isManager =
    profile?.role === 'manager' ||
    profile?.role === 'MANAGER' ||
    profile?.role === 'admin' ||
    profile?.role === 'ADMIN'

  // Only Assistant Manager and General Manager can add/edit/delete employees
  const canManageEmployees = ['Assistant Manager', 'General Manager'].includes(
    profile?.title
  )

  return (
    <div className="w-full max-w-3xl mx-auto bg-white shadow p-4 sm:p-6 rounded px-4 sm:px-6">
      {/* Header row */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-red-700">Manager Control Center</h1>

        <button
          className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-red-700 shrink-0"
          onClick={() => navigate('/App')}
          aria-label="Go back"
        >
          Go Back
        </button>
      </div>

      {/* Accessible to all team members */}
      <div className="mb-4">
        <CashControl />
      </div>

      {/* Manager-only section */}
      {isManager && (
        <div className="border-t pt-4 mt-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-red-600">Manager Tools</h2>
            <p className="text-sm text-gray-700">
              Only visible to managers — use this to manage your team.
            </p>
          </div>

          {/* Team management - only visible to Assistant Manager and General Manager */}
          {canManageEmployees && (
            <TeamManagement profile={profile} locationId={locationId} />
          )}
        </div>
      )}
    </div>
  )
}
