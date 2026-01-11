// src/pages/ManagerPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import CashControl from '../components/CashControl'
import { DailySalesYoYCard } from '../components/DailySalesYoYCard'
import { SpeedWeekEntryCard } from '../components/SpeedWeekEntryCard'
import { BeefVarianceEntry } from '../components/BeefVarianceEntry'
import { startOfWeekLocal, addDays, ymdLocal } from '../utils/dateHelpers'

export default function ManagerPage({ profile }) {
  const navigate = useNavigate()
  const [openTool, setOpenTool] = useState(null)

  // Summary card data
  const [summaryData, setSummaryData] = useState({
    weekSalesThisYear: null,
    weekSalesLastYear: null,
    weekBeefVariance: null,
    teamCount: null,
  })
  const [loadingSummary, setLoadingSummary] = useState(true)

  const locationId = profile?.location_id || 'holladay-3900'

  // Week navigation state for speed entry
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const weekStart = startOfWeekLocal(weekAnchor)
  const weekEnd = addDays(weekStart, 6)
  const weekLabel = `${weekStart.toLocaleDateString()} – ${weekEnd.toLocaleDateString()}`

  // String versions for stable useEffect dependencies
  const weekStartStr = ymdLocal(weekStart)
  const weekEndStr = ymdLocal(weekEnd)

  useEffect(() => {
    if (!profile) {
      navigate('/')
    }
  }, [profile, navigate])

  // Load summary data - only runs once on mount (not when week changes)
  useEffect(() => {
    if (!locationId) return

    const loadSummary = async () => {
      setLoadingSummary(true)

      // Use current week for all summary data
      const currentWeekStart = ymdLocal(startOfWeekLocal(new Date()))
      const currentWeekEnd = ymdLocal(addDays(startOfWeekLocal(new Date()), 6))

      // Fetch in parallel
      const [salesRes, beefRes, teamRes] = await Promise.all([
        // Current week's sales (all days)
        supabase
          .from('daily_sales_yoy')
          .select('net_sales_this_year, net_sales_last_year')
          .eq('location_id', locationId)
          .gte('sales_date', currentWeekStart)
          .lte('sales_date', currentWeekEnd),
        // This week's beef variance (always current week for summary)
        supabase
          .from('beef_variance_daypart')
          .select('lbs_delta')
          .eq('location_id', locationId)
          .gte('variance_date', currentWeekStart)
          .lte('variance_date', currentWeekEnd),
        // Team count
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('location_id', locationId),
      ])

      // Process week's sales (sum all days)
      let weekSalesThisYear = null
      let weekSalesLastYear = null
      if (salesRes.data && salesRes.data.length > 0) {
        weekSalesThisYear = 0
        weekSalesLastYear = 0
        salesRes.data.forEach((day) => {
          if (day.net_sales_this_year != null) {
            weekSalesThisYear += Number(day.net_sales_this_year)
          }
          if (day.net_sales_last_year != null) {
            weekSalesLastYear += Number(day.net_sales_last_year)
          }
        })
      }

      // Process beef variance (sum of all dayparts this week)
      let weekBeefVariance = null
      if (beefRes.data && beefRes.data.length > 0) {
        weekBeefVariance = beefRes.data.reduce((sum, row) => {
          return sum + (row.lbs_delta != null ? Number(row.lbs_delta) : 0)
        }, 0)
      }

      // Team count
      const teamCount = teamRes.count || 0

      setSummaryData({
        weekSalesThisYear,
        weekSalesLastYear,
        weekBeefVariance,
        teamCount,
      })
      setLoadingSummary(false)
    }

    loadSummary()
  }, [locationId]) // Only re-run when locationId changes

  const isManager =
    profile?.role === 'manager' ||
    profile?.role === 'MANAGER' ||
    profile?.role === 'admin' ||
    profile?.role === 'ADMIN'

  const toggleTool = (id) => {
    setOpenTool((current) => (current === id ? null : id))
  }

  // Only Assistant Manager and General Manager can edit sales/speed data
  const isEditor = ['Assistant Manager', 'General Manager'].includes(profile?.title)

  // Flat list of all tools - reordered with Beef Variance before Daily Sales
  const tools = [
    {
      id: 'cash-control',
      title: 'Cash Control',
      summary: 'Track cash counts for drop/lock safe, storage vault, tills, and change orders.',
      component: <CashControl locationId={locationId} />,
    },
    {
      id: 'beef-variance',
      title: 'Beef Counts & Variance',
      summary: 'Enter daily beef counts by daypart and track weekly variance.',
      component: (
        <BeefVarianceEntry
          locationId={locationId}
          profile={profile}
          weekStart={weekStart}
          weekLabel={weekLabel}
          onPrevWeek={() => setWeekAnchor(addDays(weekStart, -1))}
          onNextWeek={() => setWeekAnchor(addDays(weekEnd, 1))}
        />
      ),
    },
    {
      id: 'daily-sales',
      title: 'Daily Sales YoY',
      summary: 'View and manage daily sales year-over-year comparisons.',
      component: <DailySalesYoYCard locationId={locationId} isEditor={isEditor} />,
    },
    {
      id: 'speed-entry',
      title: 'Drive-Thru Speed',
      summary: 'Enter weekly drive-thru speed times by daypart.',
      component: (
        <SpeedWeekEntryCard
          locationId={locationId}
          weekStart={weekStart}
          weekEnd={weekEnd}
          weekLabel={weekLabel}
          onPrevWeek={() => setWeekAnchor(addDays(weekStart, -1))}
          onNextWeek={() => setWeekAnchor(addDays(weekEnd, 1))}
        />
      ),
    },
  ]

  // Format helpers
  const formatCurrency = (val) => {
    if (val == null) return '—'
    return '$' + Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatVariance = (val) => {
    if (val == null) return '—'
    const num = Number(val)
    const sign = num > 0 ? '+' : ''
    return `${sign}${num.toFixed(1)} lbs`
  }

  const getVarianceColor = (val) => {
    if (val == null) return 'text-gray-500'
    if (val < 0) return 'text-red-600'
    if (val > 0) return 'text-amber-600'
    return 'text-green-600'
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-red-700">Manager Control Center</h1>
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
      {isManager && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Week Sales Card */}
          <div className="bg-white shadow rounded p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <span className="text-lg">$</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Week Sales</p>
                <p className="text-lg font-semibold text-gray-900">
                  {loadingSummary ? '...' : formatCurrency(summaryData.weekSalesThisYear)}
                </p>
                {!loadingSummary && summaryData.weekSalesLastYear != null && summaryData.weekSalesLastYear > 0 && (
                  <p className={`text-xs font-medium ${
                    ((summaryData.weekSalesThisYear - summaryData.weekSalesLastYear) / summaryData.weekSalesLastYear) >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {((summaryData.weekSalesThisYear - summaryData.weekSalesLastYear) / summaryData.weekSalesLastYear) >= 0 ? '↑' : '↓'}{' '}
                    {Math.abs(((summaryData.weekSalesThisYear - summaryData.weekSalesLastYear) / summaryData.weekSalesLastYear) * 100).toFixed(1)}% YoY
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Week Beef Variance Card */}
          <div className="bg-white shadow rounded p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <span className="text-lg">🥩</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Week Beef Variance</p>
                <p className={`text-lg font-semibold ${getVarianceColor(summaryData.weekBeefVariance)}`}>
                  {loadingSummary ? '...' : formatVariance(summaryData.weekBeefVariance)}
                </p>
              </div>
            </div>
          </div>

          {/* Team Size Card */}
          <div className="bg-white shadow rounded p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <span className="text-lg">👥</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Team Members</p>
                <p className="text-lg font-semibold text-gray-900">
                  {loadingSummary ? '...' : summaryData.teamCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manager Tools */}
      {isManager && (
        <div className="bg-white shadow rounded p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Manager Tools</h2>
          <p className="text-sm text-gray-600 mb-4">
            Tap a tool to expand and use it during your shift.
          </p>

          <div className="space-y-2">
            {tools.map((tool) => {
              const isToolOpen = openTool === tool.id
              return (
                <div
                  key={tool.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleTool(tool.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 hover:bg-gray-50"
                    aria-expanded={isToolOpen}
                    aria-controls={`tool-panel-${tool.id}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{tool.title}</span>
                      <span className="text-xs text-gray-500">
                        {tool.summary}
                      </span>
                    </div>
                    <span
                      className={`transform transition-transform ${
                        isToolOpen ? 'rotate-90' : ''
                      }`}
                    >
                      ▶
                    </span>
                  </button>

                  {isToolOpen && (
                    <div
                      id={`tool-panel-${tool.id}`}
                      className="px-4 pb-4 pt-2 bg-gray-50 border-t"
                    >
                      {tool.component}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
