// src/pages/ExperiencePage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Training from '../components/Training'
import TrainingSession from '../components/TrainingSession'
import GoalsJournal from '../components/goals/GoalsJournal'
import TeamGoalsOverview from '../components/goals/TeamGoalsOverview'
import { useMyGoals, getCurrentWeekNumber } from '../hooks/useGoalsData'

export default function ExperiencePage({ profile }) {
  const navigate = useNavigate()
  const locationId = profile?.location_id ?? 'holladay-3900'

  // Accordion state
  const [openSection, setOpenSection] = useState(null)

  const toggleSection = (id) => {
    setOpenSection((current) => (current === id ? null : id))
  }

  useEffect(() => {
    if (!profile) {
      navigate('/')
    }
  }, [profile, navigate])

  // Fetch user's goals for summary cards
  const { data: myGoals = [], isLoading } = useMyGoals(profile?.id)

  // Calculate summary values
  const activeGoals = myGoals.filter((g) => g.status === 'active')
  const currentWeek = getCurrentWeekNumber()

  // Check if user has done their weekly check-in
  const hasCheckedInThisWeek = activeGoals.some((goal) =>
    goal.checkins?.some((c) => c.week_number === currentWeek)
  )

  // Get next check-in needed
  const goalsNeedingCheckin = activeGoals.filter(
    (goal) => !goal.checkins?.some((c) => c.week_number === currentWeek)
  )

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-red-700">My Growth</h1>
          <button
            className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-red-700 shrink-0"
            onClick={() => navigate('/App')}
            aria-label="Go back"
          >
            Go Back
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Goals Card */}
        <div className="bg-white shadow rounded p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <span className="text-lg">🎯</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">My Goals</p>
              <p className="text-lg font-semibold text-gray-900">
                {isLoading ? '...' : activeGoals.length}
              </p>
              <p className="text-xs text-gray-500">active this month</p>
            </div>
          </div>
        </div>

        {/* Current Week Card */}
        <div className="bg-white shadow rounded p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <span className="text-lg">📅</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Current Week</p>
              <p className="text-lg font-semibold text-gray-900">Week {currentWeek}</p>
              <p className="text-xs text-gray-500">of the month</p>
            </div>
          </div>
        </div>

        {/* Check-In Status Card */}
        <div className="bg-white shadow rounded p-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                hasCheckedInThisWeek || activeGoals.length === 0
                  ? 'bg-green-100 text-green-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              <span className="text-lg">{hasCheckedInThisWeek || activeGoals.length === 0 ? '✓' : '!'}</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Check-In Status</p>
              <p className="text-lg font-semibold text-gray-900">
                {isLoading
                  ? '...'
                  : activeGoals.length === 0
                    ? 'No Goals'
                    : hasCheckedInThisWeek
                      ? 'Complete'
                      : 'Needed'}
              </p>
              {!isLoading && goalsNeedingCheckin.length > 0 && (
                <p className="text-xs text-amber-600">
                  {goalsNeedingCheckin.length} goal{goalsNeedingCheckin.length > 1 ? 's' : ''} need
                  check-in
                </p>
              )}
              {!isLoading && hasCheckedInThisWeek && activeGoals.length > 0 && (
                <p className="text-xs text-green-600">all goals checked in</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white shadow rounded p-4 sm:p-6">
        <div className="space-y-3">
          {/* Goals Journal - Accessible to all team members */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('goals-journal')}
              className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              aria-expanded={openSection === 'goals-journal'}
            >
              <div className="flex flex-col">
                <span className="font-medium">My Goals Journal</span>
                <span className="text-xs text-gray-500">
                  Set monthly goals, track progress, and reflect on your growth.
                </span>
              </div>
              <span
                className={`transform transition-transform ${
                  openSection === 'goals-journal' ? 'rotate-90' : ''
                }`}
              >
                ▶
              </span>
            </button>

            {openSection === 'goals-journal' && (
              <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                <GoalsJournal profile={profile} />
              </div>
            )}
          </div>
        </div>

        {/* Manager-only section */}
        {profile?.role === 'manager' && (
          <div className="border-t pt-4 mt-4 space-y-3">
            <h2 className="text-lg font-semibold text-red-600 mb-3">Manager Tools</h2>
            <p className="text-sm text-gray-600 mb-4">Only visible to managers.</p>

            {/* Training Calendar Accordion */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('training')}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={openSection === 'training'}
              >
                <div className="flex flex-col">
                  <span className="font-medium">Training Calendar</span>
                  <span className="text-xs text-gray-500">
                    View weekly training schedule and your assigned trainees.
                  </span>
                </div>
                <span
                  className={`transform transition-transform ${
                    openSection === 'training' ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {openSection === 'training' && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                  <Training profile={profile} locationId={locationId} />
                </div>
              )}
            </div>

            {/* Training Session Accordion */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('session')}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={openSection === 'session'}
              >
                <div className="flex flex-col">
                  <span className="font-medium">Training Session</span>
                  <span className="text-xs text-gray-500">
                    View and complete your active training sessions.
                  </span>
                </div>
                <span
                  className={`transform transition-transform ${
                    openSection === 'session' ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {openSection === 'session' && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                  <TrainingSession profile={profile} />
                </div>
              )}
            </div>

            {/* Team Goals Overview Accordion */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('team-goals')}
                className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-expanded={openSection === 'team-goals'}
              >
                <div className="flex flex-col">
                  <span className="font-medium">Team Goals Overview</span>
                  <span className="text-xs text-gray-500">
                    View and manage your team members' work goals.
                  </span>
                </div>
                <span
                  className={`transform transition-transform ${
                    openSection === 'team-goals' ? 'rotate-90' : ''
                  }`}
                >
                  ▶
                </span>
              </button>

              {openSection === 'team-goals' && (
                <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                  <TeamGoalsOverview profile={profile} locationId={locationId} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
