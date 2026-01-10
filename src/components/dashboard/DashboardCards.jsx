// src/components/dashboard/DashboardCards.jsx
import { useNavigate } from 'react-router-dom'
import { useWeeklySales } from '../../hooks/useSalesData'
import { useMyPoints, useLeaderboards } from '../../hooks/usePointsData'
import { useMyGoals, getCurrentWeekNumber } from '../../hooks/useGoalsData'
import { useCurrentStoreGoals } from '../../hooks/useStoreGoals'
import { startOfWeekLocal, endOfWeekLocal } from '../../utils/dateHelpers'

// ============================================
// Store Focus Banner
// ============================================
export function StoreFocusBanner({ locationId, isManager }) {
  const navigate = useNavigate()
  const { data: goals, isLoading } = useCurrentStoreGoals(locationId)

  if (isLoading) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-red-200 rounded w-1/3 mb-2"></div>
        <div className="h-5 bg-red-100 rounded w-2/3"></div>
      </div>
    )
  }

  const weekGoal = goals?.weekGoal
  const periodGoal = goals?.periodGoal
  const hasGoals = weekGoal || periodGoal

  if (!hasGoals && !isManager) {
    return null // Don't show empty banner to regular employees
  }

  return (
    <div
      className={`rounded-lg p-4 ${
        hasGoals
          ? 'bg-gradient-to-r from-red-50 to-red-100 border border-red-200'
          : 'bg-gray-50 border border-dashed border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-red-700 mb-1">Store Focus</h2>
          {weekGoal ? (
            <p className="text-sm text-gray-800 font-medium">{weekGoal.message}</p>
          ) : (
            <p className="text-sm text-gray-500 italic">No weekly goal set</p>
          )}
          {periodGoal && (
            <p className="text-xs text-gray-600 mt-1">
              <span className="font-medium">This Period:</span> {periodGoal.message}
            </p>
          )}
        </div>
        {isManager && (
          <button
            onClick={() => navigate('/goals')}
            className="text-xs text-red-600 hover:text-red-800 whitespace-nowrap"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================
// Sales Summary Card
// ============================================
export function SalesSummaryCard({ locationId }) {
  const navigate = useNavigate()
  const now = new Date()
  const weekStart = startOfWeekLocal(now)
  const weekEnd = endOfWeekLocal(now)

  const { data: salesData, isLoading } = useWeeklySales(locationId, weekStart, weekEnd)

  // Calculate weekly totals
  let totalThisYear = 0
  let totalLastYear = 0
  let yoyPct = null

  if (salesData) {
    salesData.forEach((day) => {
      if (day.thisYear != null) totalThisYear += day.thisYear
      if (day.lastYear != null) totalLastYear += day.lastYear
    })

    if (totalLastYear > 0) {
      yoyPct = ((totalThisYear - totalLastYear) / totalLastYear) * 100
    }
  }

  const formatCurrency = (val) => {
    if (val == null) return '--'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div
      onClick={() => navigate('/sales')}
      className="bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">💰</span>
        <h3 className="text-sm font-medium text-gray-600">Sales This Week</h3>
      </div>

      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-20 mb-1"></div>
          <div className="h-4 bg-gray-100 rounded w-16"></div>
        </div>
      ) : (
        <>
          <p className="text-xl font-bold text-gray-800">
            {formatCurrency(totalThisYear)}
          </p>
          {yoyPct != null ? (
            <p
              className={`text-sm font-medium ${
                yoyPct >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {yoyPct >= 0 ? '↑' : '↓'} {Math.abs(yoyPct).toFixed(1)}% YoY
            </p>
          ) : (
            <p className="text-sm text-gray-400">No comparison data</p>
          )}
        </>
      )}
    </div>
  )
}

// ============================================
// Points Summary Card
// ============================================
export function PointsSummaryCard({ profile, locationId }) {
  const navigate = useNavigate()
  const { data: myPoints, isLoading: loadingPoints } = useMyPoints(profile?.id)
  const { data: leaderboard, isLoading: loadingLeaderboard } = useLeaderboards(locationId)

  // Find user's weekly rank
  let weeklyRank = null
  if (leaderboard?.weeklyData) {
    const idx = leaderboard.weeklyData.findIndex((e) => e.id === profile?.id)
    if (idx !== -1) weeklyRank = idx + 1
  }

  const isLoading = loadingPoints || loadingLeaderboard

  return (
    <div
      onClick={() => navigate('/points')}
      className="bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">⭐</span>
        <h3 className="text-sm font-medium text-gray-600">My Points</h3>
      </div>

      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-16 mb-1"></div>
          <div className="h-4 bg-gray-100 rounded w-20"></div>
        </div>
      ) : (
        <>
          <p className="text-xl font-bold text-gray-800">
            {myPoints?.totalPoints?.toLocaleString() ?? 0}
          </p>
          {weeklyRank ? (
            <p className="text-sm text-blue-600">#{weeklyRank} this week</p>
          ) : (
            <p className="text-sm text-gray-400">No points this week</p>
          )}
        </>
      )}
    </div>
  )
}

// ============================================
// Goals Summary Card
// ============================================
export function GoalsSummaryCard({ profile }) {
  const navigate = useNavigate()
  const { data: goals, isLoading } = useMyGoals(profile?.id)

  const currentWeek = getCurrentWeekNumber()
  const activeGoals = goals?.filter((g) => g.status === 'active') || []

  // Check if any goal needs a check-in this week
  let needsCheckin = false
  activeGoals.forEach((goal) => {
    const hasThisWeekCheckin = goal.checkins?.some(
      (c) => c.week_number === currentWeek
    )
    if (!hasThisWeekCheckin) needsCheckin = true
  })

  return (
    <div
      onClick={() => navigate('/experience')}
      className="bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🎯</span>
        <h3 className="text-sm font-medium text-gray-600">My Goals</h3>
      </div>

      {isLoading ? (
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-12 mb-1"></div>
          <div className="h-4 bg-gray-100 rounded w-24"></div>
        </div>
      ) : (
        <>
          <p className="text-xl font-bold text-gray-800">
            {activeGoals.length} active
          </p>
          {needsCheckin ? (
            <p className="text-sm text-amber-600">Check-in due</p>
          ) : activeGoals.length > 0 ? (
            <p className="text-sm text-green-600">All caught up!</p>
          ) : (
            <p className="text-sm text-gray-400">No goals set</p>
          )}
        </>
      )}
    </div>
  )
}

// ============================================
// Quick Links Section
// ============================================
export function QuickLinks({ profile }) {
  const navigate = useNavigate()
  const isManager = profile?.role === 'manager'
  const canAccessGoalsPage = ['Assistant Manager', 'General Manager'].includes(
    profile?.title
  )

  const links = [
    { label: 'Speed', path: '/speed', icon: '🏎️' },
    { label: 'Games', path: '/games', icon: '🎮' },
    { label: 'Food', path: '/food', icon: '🍔' },
    { label: 'Experience', path: '/experience', icon: '📋' },
  ]

  const managerLinks = [
    ...(isManager ? [{ label: 'Manager', path: '/manager', icon: '👔' }] : []),
    ...(canAccessGoalsPage
      ? [{ label: 'Goals Mgmt', path: '/goals', icon: '⚙️' }]
      : []),
  ]

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-500">Quick Links</h3>
      <div className="grid grid-cols-4 gap-2">
        {links.map((link) => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className="flex flex-col items-center gap-1 p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-xl">{link.icon}</span>
            <span className="text-xs text-gray-600">{link.label}</span>
          </button>
        ))}
      </div>
      {managerLinks.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {managerLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="flex flex-col items-center gap-1 p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <span className="text-xl">{link.icon}</span>
              <span className="text-xs text-red-700">{link.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
