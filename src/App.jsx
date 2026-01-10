import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import {
  StoreFocusBanner,
  SalesSummaryCard,
  PointsSummaryCard,
  GoalsSummaryCard,
  TrainingSummaryCard,
  QuickLinks,
} from './components/dashboard/DashboardCards'

function App() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const loadSessionAndProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session

      if (!session) {
        navigate('/')
        return
      }

      // Fetch user profile from Supabase
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error('Failed to load profile:', error.message)
      } else {
        setProfile(profileData)
      }

      setLoading(false)
    }

    loadSessionAndProfile()
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-red-100 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  const locationId = profile?.location_id ?? 'holladay-3900'
  const isManager = profile?.role === 'manager'
  const canAccessGoalsPage = ['Assistant Manager', 'General Manager'].includes(
    profile?.title
  )

  return (
    <div className="min-h-screen bg-red-100">
      {/* Header */}
      <div className="bg-red-700 text-white px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">Welcome back,</p>
            <p className="font-semibold">
              {profile?.full_name ?? 'Employee'}
            </p>
            <p className="text-xs opacity-75">{profile?.title}</p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              navigate('/')
            }}
            className="text-sm bg-red-800 hover:bg-red-900 px-3 py-1.5 rounded transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Store Focus Banner */}
        <StoreFocusBanner
          locationId={locationId}
          isManager={canAccessGoalsPage}
        />

        {/* Summary Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          <SalesSummaryCard locationId={locationId} />
          <PointsSummaryCard profile={profile} locationId={locationId} />
          <GoalsSummaryCard profile={profile} />
          <TrainingSummaryCard profile={profile} locationId={locationId} />
        </div>

        {/* Quick Links */}
        <QuickLinks profile={profile} />

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 pt-4">
          {profile?.title} • {locationId}
        </p>
      </div>
    </div>
  )
}

export default App
