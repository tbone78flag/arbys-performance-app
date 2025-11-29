// src/pages/SalesPage.jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SalesWeeklyTrends from '../components/SalesWeeklyTrends'
import SalesPeriodSummary from '../components/SalesPeriodSummary'
import WhatIfCalculator from '../components/WhatIfCalculator'
import CashControl from '../components/CashControl'

export default function SalesPage({ profile }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!profile) navigate('/')
  }, [profile, navigate])

  const locationId = profile?.location_id ?? 'holladay-3900s'

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

      {/* Weekly YoY charts */}
      <SalesWeeklyTrends profile={profile} locationId={locationId} />

      {/* What If calculator */}
      <WhatIfCalculator profile={profile} locationId={locationId} />

      {profile?.role === 'manager' && (
        <div className="border-t pt-4 mt-4">
          <h2 className="text-lg font-semibold text-red-600">Manager Tools</h2>
          <p>Only visible to managers — e.g. target goals, override entries, etc.</p>

          {/* Period chart + export */}
          <SalesPeriodSummary profile={profile} locationId={locationId} />

          {/* Existing cash control section */}
          <CashControl />
        </div>
      )}
    </div>
  )
}
