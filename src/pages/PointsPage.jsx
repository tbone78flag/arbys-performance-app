// src/pages/PointsPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PointsAddition from '../components/PointsAddition'
import {
  useLeaderboards,
  useMyPoints,
  useRewards,
  useSpendPoints,
} from '../hooks/usePointsData'

export default function PointsPage({ profile }) {
  const navigate = useNavigate()
  const locationId = profile?.location_id || 'holladay-3900'

  // Accordion states
  const [weeklyOpen, setWeeklyOpen] = useState(false)
  const [monthlyOpen, setMonthlyOpen] = useState(false)
  const [myPointsOpen, setMyPointsOpen] = useState(false)
  const [spendOpen, setSpendOpen] = useState(false)
  const [managerToolsOpen, setManagerToolsOpen] = useState(false)

  // UI states for spend
  const [spendError, setSpendError] = useState(null)
  const [spendSuccess, setSpendSuccess] = useState(null)

  const isManager =
    profile?.role === 'manager' ||
    profile?.role === 'MANAGER' ||
    profile?.role === 'admin' ||
    profile?.role === 'ADMIN'

  useEffect(() => {
    if (!profile) {
      navigate('/')
    }
  }, [profile, navigate])

  // React Query hooks
  const {
    data: leaderboardData,
    isLoading: leaderboardLoading,
  } = useLeaderboards(locationId)

  const {
    data: myPointsData,
    isLoading: myPointsLoading,
  } = useMyPoints(profile?.id)

  const {
    data: rewards = [],
    isLoading: rewardsLoading,
  } = useRewards(locationId)

  const spendMutation = useSpendPoints()

  // Extract data from queries
  const weeklyData = leaderboardData?.weeklyData || []
  const monthlyData = leaderboardData?.monthlyData || []
  const weekStart = leaderboardData?.weekStart || new Date()
  const weekEnd = leaderboardData?.weekEnd || new Date()
  const monthStart = leaderboardData?.monthStart || new Date()
  const myTotalPoints = myPointsData?.totalPoints || 0
  const myPointsLog = myPointsData?.weekLog || []

  const loading = leaderboardLoading || myPointsLoading || rewardsLoading

  // Clear success message after 3 seconds
  useEffect(() => {
    if (spendSuccess) {
      const timer = setTimeout(() => setSpendSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [spendSuccess])

  // Spend points on a reward
  async function handleSpendPoints(reward) {
    if (myTotalPoints < reward.points_cost) {
      setSpendError(`Not enough points. You need ${reward.points_cost} but have ${myTotalPoints}.`)
      return
    }

    if (
      !window.confirm(
        `Spend ${reward.points_cost} points on "${reward.reward_name}"?`
      )
    ) {
      return
    }

    setSpendError(null)

    try {
      await spendMutation.mutateAsync({
        employeeId: profile.id,
        locationId,
        reward,
      })
      setSpendSuccess(`Successfully redeemed "${reward.reward_name}"! Show this to a manager.`)
    } catch (err) {
      console.error('Error spending points:', err)
      setSpendError(err?.message || 'Failed to redeem reward.')
    }
  }

  // Format source for display
  function formatSource(source, detail) {
    if (source === 'manager') return `Manager: ${detail || 'Recognition'}`
    if (source === 'game') return `Game: ${detail || 'Unknown'}`
    if (source === 'redemption') return `Redeemed: ${detail || 'Reward'}`
    return detail || source || 'Points'
  }

  if (!profile) return null

  return (
    <div className="w-full max-w-3xl mx-auto bg-white shadow p-4 sm:p-6 rounded px-4 sm:px-6">
      {/* Header row */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-red-700">Points Leaderboard</h1>

        <button
          className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-red-700 shrink-0"
          onClick={() => navigate('/App')}
          aria-label="Go back"
        >
          Go Back
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600">Loading points data...</p>
      ) : (
        <div className="space-y-3">
          {/* Weekly Points Leaderboard */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setWeeklyOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              aria-expanded={weeklyOpen}
            >
              <div className="flex flex-col">
                <span className="font-medium">Weekly Points Leaderboard</span>
                <span className="text-xs text-gray-500">
                  {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
                </span>
              </div>
              <span className={`transform transition-transform ${weeklyOpen ? 'rotate-90' : ''}`}>
                ▶
              </span>
            </button>

            {weeklyOpen && (
              <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                {weeklyData.length === 0 ? (
                  <p className="text-sm text-gray-500">No points earned this week yet.</p>
                ) : (
                  <div className="space-y-2">
                    {weeklyData.map((emp, idx) => (
                      <div
                        key={emp.id}
                        className={`flex items-center justify-between p-2 rounded ${
                          idx === 0
                            ? 'bg-yellow-100 border border-yellow-300'
                            : idx === 1
                            ? 'bg-gray-200'
                            : idx === 2
                            ? 'bg-orange-100'
                            : 'bg-white border'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg w-6">{idx + 1}</span>
                          <span className={emp.id === profile.id ? 'font-semibold' : ''}>
                            {emp.name}
                            {emp.id === profile.id && ' (You)'}
                          </span>
                        </div>
                        <span className="font-semibold">{emp.points} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Monthly Points Leaderboard */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setMonthlyOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              aria-expanded={monthlyOpen}
            >
              <div className="flex flex-col">
                <span className="font-medium">Monthly Points Leaderboard</span>
                <span className="text-xs text-gray-500">
                  {monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <span className={`transform transition-transform ${monthlyOpen ? 'rotate-90' : ''}`}>
                ▶
              </span>
            </button>

            {monthlyOpen && (
              <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                {monthlyData.length === 0 ? (
                  <p className="text-sm text-gray-500">No points earned this month yet.</p>
                ) : (
                  <div className="space-y-2">
                    {monthlyData.map((emp, idx) => (
                      <div
                        key={emp.id}
                        className={`flex items-center justify-between p-2 rounded ${
                          idx === 0
                            ? 'bg-yellow-100 border border-yellow-300'
                            : idx === 1
                            ? 'bg-gray-200'
                            : idx === 2
                            ? 'bg-orange-100'
                            : 'bg-white border'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg w-6">{idx + 1}</span>
                          <span className={emp.id === profile.id ? 'font-semibold' : ''}>
                            {emp.name}
                            {emp.id === profile.id && ' (You)'}
                          </span>
                        </div>
                        <span className="font-semibold">{emp.points} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* My Points */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setMyPointsOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              aria-expanded={myPointsOpen}
            >
              <div className="flex flex-col">
                <span className="font-medium">My Points</span>
                <span className="text-xs text-gray-500">
                  Total: <span className="font-semibold text-red-600">{myTotalPoints} pts</span>
                </span>
              </div>
              <span className={`transform transition-transform ${myPointsOpen ? 'rotate-90' : ''}`}>
                ▶
              </span>
            </button>

            {myPointsOpen && (
              <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <div className="text-sm text-gray-600">Your Total Points Balance</div>
                  <div className="text-3xl font-bold text-red-600">{myTotalPoints} pts</div>
                </div>

                <h4 className="font-medium mb-2">This Week's Activity</h4>
                {myPointsLog.length === 0 ? (
                  <p className="text-sm text-gray-500">No points activity this week.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {myPointsLog.map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between p-2 rounded border ${
                          entry.points_amount < 0 ? 'bg-red-50' : 'bg-green-50'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {formatSource(entry.source, entry.source_detail)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.created_at).toLocaleString()}
                          </span>
                        </div>
                        <span
                          className={`font-semibold ${
                            entry.points_amount < 0 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {entry.points_amount > 0 ? '+' : ''}
                          {entry.points_amount} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Spend Points */}
          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setSpendOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              aria-expanded={spendOpen}
            >
              <div className="flex flex-col">
                <span className="font-medium">Spend Points</span>
                <span className="text-xs text-gray-500">
                  Redeem your points for rewards
                </span>
              </div>
              <span className={`transform transition-transform ${spendOpen ? 'rotate-90' : ''}`}>
                ▶
              </span>
            </button>

            {spendOpen && (
              <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                  <div className="text-sm text-gray-600">Available to Spend</div>
                  <div className="text-2xl font-bold text-blue-600">{myTotalPoints} pts</div>
                </div>

                {spendError && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">{spendError}</p>
                )}

                {spendSuccess && (
                  <p className="text-sm text-green-700 bg-green-50 p-3 rounded border border-green-200 mb-3">
                    {spendSuccess}
                  </p>
                )}

                {rewards.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No rewards available yet. Ask a manager to set up rewards.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {rewards.map((reward) => {
                      const canAfford = myTotalPoints >= reward.points_cost
                      const isSpending = spendMutation.isPending && spendMutation.variables?.reward?.id === reward.id

                      return (
                        <div
                          key={reward.id}
                          className={`flex items-center justify-between p-3 rounded border ${
                            canAfford ? 'bg-white' : 'bg-gray-100 opacity-60'
                          }`}
                        >
                          <div>
                            <div className="font-medium">{reward.reward_name}</div>
                            <div className="text-sm text-gray-600">
                              {reward.points_cost} points
                            </div>
                          </div>
                          <button
                            onClick={() => handleSpendPoints(reward)}
                            disabled={!canAfford || isSpending}
                            className={`px-4 py-2 rounded text-sm ${
                              canAfford
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            } disabled:opacity-60`}
                          >
                            {isSpending ? 'Redeeming...' : 'Redeem'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manager-only section */}
      {isManager && (
        <div className="border-t pt-4 mt-6">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Manager Tools</h2>
          <p className="text-sm text-gray-600 mb-4">Only visible to managers.</p>

          <div className="border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setManagerToolsOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              aria-expanded={managerToolsOpen}
            >
              <div className="flex flex-col">
                <span className="font-medium">Award Points to Employees</span>
                <span className="text-xs text-gray-500">
                  Recognize team members with points
                </span>
              </div>
              <span className={`transform transition-transform ${managerToolsOpen ? 'rotate-90' : ''}`}>
                ▶
              </span>
            </button>

            {managerToolsOpen && (
              <div className="px-4 pb-4 pt-2 bg-gray-50 border-t">
                <PointsAddition locationId={locationId} managerProfile={profile} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
