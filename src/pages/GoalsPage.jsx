import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RewardsManager from '../components/RewardsManager'
import PointsHistory from '../components/PointsHistory'
import TrainingScheduleForm from '../components/TrainingScheduleForm'
import StoreGoalsEditor from '../components/goals/StoreGoalsEditor'
import TeamManagement from '../components/TeamManagement'

export default function GoalsPage({ profile }) {
  const navigate = useNavigate()
  const isEditor = ['Assistant Manager', 'General Manager'].includes(
    profile?.title
  )

  const locationId = profile?.location_id ?? 'holladay-3900'

  // Accordion state for all sections
  const [openSection, setOpenSection] = useState(null)

  const toggleSection = (id) => {
    setOpenSection((current) => (current === id ? null : id))
  }

  if (!profile) return <div className="p-6">Loading…</div>

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-red-700">Senior Mgr Tools</h1>
          <button
            className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-red-700 shrink-0"
            onClick={() => navigate('/App')}
            aria-label="Go back"
          >
            Go Back
          </button>
        </div>
      </div>

      {/* Tools */}
      {isEditor && (
        <div className="bg-white shadow rounded p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Management Tools</h2>
          <p className="text-sm text-gray-600 mb-4">
            Tap a section to expand and manage goals, training, and rewards.
          </p>

          <div className="space-y-2">
            {/* 1. Store Goals Accordion */}
            <div className="border rounded-lg overflow-hidden border-red-200">
              <button
                type="button"
                onClick={() => toggleSection('store-goals')}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-red-50 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={openSection === 'store-goals'}
              >
                <div className="flex flex-col">
                  <span className="font-medium text-red-700">Store Goals</span>
                  <span className="text-xs text-red-600">
                    Set weekly and period focus for the entire team.
                  </span>
                </div>
                <span
                  className={`transform transition-transform text-red-600 ${
                    openSection === 'store-goals' ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {openSection === 'store-goals' && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                  <StoreGoalsEditor profile={profile} locationId={locationId} />
                </div>
              )}
            </div>

            {/* 2. Training Scheduler Accordion */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('training-scheduler')}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={openSection === 'training-scheduler'}
              >
                <div className="flex flex-col">
                  <span className="font-medium">Training Scheduler</span>
                  <span className="text-xs text-gray-500">
                    Schedule training sessions for team members.
                  </span>
                </div>
                <span
                  className={`transform transition-transform ${
                    openSection === 'training-scheduler' ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {openSection === 'training-scheduler' && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                  <TrainingScheduleForm profile={profile} locationId={locationId} />
                </div>
              )}
            </div>

            {/* 3. Points Rewards Manager Accordion */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('rewards-manager')}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={openSection === 'rewards-manager'}
              >
                <div className="flex flex-col">
                  <span className="font-medium">Points Rewards Manager</span>
                  <span className="text-xs text-gray-500">
                    Configure rewards that employees can redeem with their points.
                  </span>
                </div>
                <span
                  className={`transform transition-transform ${
                    openSection === 'rewards-manager' ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {openSection === 'rewards-manager' && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                  <RewardsManager locationId={locationId} />
                </div>
              )}
            </div>

            {/* 4. Points History Accordion */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('points-history')}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={openSection === 'points-history'}
              >
                <div className="flex flex-col">
                  <span className="font-medium">Points History</span>
                  <span className="text-xs text-gray-500">
                    View all points awarded and undo if needed.
                  </span>
                </div>
                <span
                  className={`transform transition-transform ${
                    openSection === 'points-history' ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {openSection === 'points-history' && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                  <PointsHistory locationId={locationId} profile={profile} />
                </div>
              )}
            </div>

            {/* 5. Team Management Accordion */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('team-management')}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={openSection === 'team-management'}
              >
                <div className="flex flex-col">
                  <span className="font-medium">Team Management</span>
                  <span className="text-xs text-gray-500">
                    Add, edit, and remove team members for this location.
                  </span>
                </div>
                <span
                  className={`transform transition-transform ${
                    openSection === 'team-management' ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {openSection === 'team-management' && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                  <TeamManagement profile={profile} locationId={locationId} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
