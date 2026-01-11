// src/pages/SalesPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import SalesWeeklyTrends from '../components/SalesWeeklyTrends'
import SalesPeriodSummary from '../components/SalesPeriodSummary'
import WhatIfCalculator from '../components/WhatIfCalculator'

// Date helpers
function startOfWeekLocal(d = new Date()) {
  const day = d.getDay()
  const diff = (day + 6) % 7
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  s.setDate(s.getDate() - diff)
  return s
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function ymdLocal(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function SalesPage({ profile }) {
  const navigate = useNavigate()
  const locationId = profile?.location_id ?? 'holladay-3900s'

  // Summary data
  const [summaryData, setSummaryData] = useState({
    weekSalesThisYear: null,
    weekSalesLastYear: null,
    bestDay: null,
    avgDaily: null,
  })
  const [loadingSummary, setLoadingSummary] = useState(true)

  useEffect(() => {
    if (!profile) navigate('/')
  }, [profile, navigate])

  // Load summary data
  useEffect(() => {
    if (!locationId) return

    const loadSummary = async () => {
      setLoadingSummary(true)

      const currentWeekStart = ymdLocal(startOfWeekLocal(new Date()))
      const currentWeekEnd = ymdLocal(addDays(startOfWeekLocal(new Date()), 6))

      const { data: salesRes } = await supabase
        .from('daily_sales_yoy')
        .select('sales_date, net_sales_this_year, net_sales_last_year')
        .eq('location_id', locationId)
        .gte('sales_date', currentWeekStart)
        .lte('sales_date', currentWeekEnd)

      let weekSalesThisYear = null
      let weekSalesLastYear = null
      let bestDay = null
      let avgDaily = null

      if (salesRes && salesRes.length > 0) {
        weekSalesThisYear = 0
        weekSalesLastYear = 0
        let daysWithData = 0

        salesRes.forEach((day) => {
          if (day.net_sales_this_year != null) {
            const sales = Number(day.net_sales_this_year)
            weekSalesThisYear += sales
            daysWithData++

            if (bestDay == null || sales > bestDay.sales) {
              bestDay = { date: day.sales_date, sales }
            }
          }
          if (day.net_sales_last_year != null) {
            weekSalesLastYear += Number(day.net_sales_last_year)
          }
        })

        if (daysWithData > 0) {
          avgDaily = weekSalesThisYear / daysWithData
        }
      }

      setSummaryData({
        weekSalesThisYear,
        weekSalesLastYear,
        bestDay,
        avgDaily,
      })
      setLoadingSummary(false)
    }

    loadSummary()
  }, [locationId])

  // Format helpers
  const formatCurrency = (val) => {
    if (val == null) return '—'
    return '$' + Number(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const getYoYPct = () => {
    if (summaryData.weekSalesLastYear == null || summaryData.weekSalesLastYear === 0) return null
    return ((summaryData.weekSalesThisYear - summaryData.weekSalesLastYear) / summaryData.weekSalesLastYear) * 100
  }

  const yoyPct = getYoYPct()

  // Format day name from date string
  const formatDayName = (dateStr) => {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-red-700">Sales Dashboard</h1>
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
        {/* Week Sales Card */}
        <div className="bg-white shadow rounded p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <span className="text-lg">💰</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Week Sales</p>
              <p className="text-lg font-semibold text-gray-900">
                {loadingSummary ? '...' : formatCurrency(summaryData.weekSalesThisYear)}
              </p>
              {!loadingSummary && yoyPct != null && (
                <p className={`text-xs font-medium ${yoyPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {yoyPct >= 0 ? '↑' : '↓'} {Math.abs(yoyPct).toFixed(1)}% YoY
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Best Day Card */}
        <div className="bg-white shadow rounded p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <span className="text-lg">🏆</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Best Day</p>
              <p className="text-lg font-semibold text-gray-900">
                {loadingSummary ? '...' : summaryData.bestDay ? formatCurrency(summaryData.bestDay.sales) : '—'}
              </p>
              {!loadingSummary && summaryData.bestDay && (
                <p className="text-xs text-gray-500">
                  {formatDayName(summaryData.bestDay.date)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Avg Daily Card */}
        <div className="bg-white shadow rounded p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <span className="text-lg">📊</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Daily</p>
              <p className="text-lg font-semibold text-gray-900">
                {loadingSummary ? '...' : formatCurrency(summaryData.avgDaily)}
              </p>
              <p className="text-xs text-gray-500">this week</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white shadow rounded p-4 sm:p-6">
        {/* Weekly YoY charts */}
        <SalesWeeklyTrends profile={profile} locationId={locationId} />

        {/* What If calculator */}
        <WhatIfCalculator profile={profile} locationId={locationId} />

        {profile?.role === 'manager' && (
          <div className="border-t pt-4 mt-4">
            <h2 className="text-lg font-semibold text-red-600">Manager Tools</h2>
            <p className="text-sm text-gray-600 mb-4">Only visible to managers.</p>

            {/* Period chart + export */}
            <SalesPeriodSummary profile={profile} locationId={locationId} />
          </div>
        )}
      </div>
    </div>
  )
}
