import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { ymdLocal, addDays } from '../../utils/dateHelpers'

const ALL_DAYPARTS = [
  { key: '10am', label: '10 AM' },
  { key: '2pm', label: '2 PM' },
  { key: '5pm', label: '5 PM' },
  { key: 'close', label: 'Close' },
]

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function BeefWeeklyOverview({
  locationId,
  weekStart,
  weekLabel,
  onPrevWeek,
  onNextWeek,
}) {
  const [loading, setLoading] = useState(false)
  const [countsData, setCountsData] = useState({})
  const [varianceData, setVarianceData] = useState({})
  const [weekTotals, setWeekTotals] = useState({ lbs: 0, varianceLbs: 0 })
  const [enabledDayparts, setEnabledDayparts] = useState(['close']) // default

  // Filter dayparts based on location settings
  const activeDayparts = useMemo(() => {
    return ALL_DAYPARTS.filter(({ key }) => enabledDayparts.includes(key))
  }, [enabledDayparts])

  // Load location settings for dayparts
  useEffect(() => {
    if (!locationId) return

    const loadSettings = async () => {
      const { data, error } = await supabase
        .from('location_settings')
        .select('value')
        .eq('location_id', 'default')
        .eq('key', 'beef_dayparts')
        .single()

      if (!error && data?.value) {
        try {
          const parsed = typeof data.value === 'string'
            ? JSON.parse(data.value)
            : data.value
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEnabledDayparts(parsed)
          }
        } catch {
          // Keep default
        }
      }
    }

    loadSettings()
  }, [locationId])

  // Load week data
  useEffect(() => {
    if (!locationId || !weekStart) return

    let cancelled = false

    const loadWeek = async () => {
      setLoading(true)

      const weekEnd = addDays(weekStart, 6)
      const [countsRes, varianceRes] = await Promise.all([
        supabase
          .from('beef_counts_daily')
          .select('count_date, daypart, cases, roasts, lbs, count_type')
          .eq('location_id', locationId)
          .gte('count_date', ymdLocal(weekStart))
          .lte('count_date', ymdLocal(weekEnd)),
        supabase
          .from('beef_variance_daypart')
          .select('variance_date, daypart, lbs_delta, pct_delta')
          .eq('location_id', locationId)
          .gte('variance_date', ymdLocal(weekStart))
          .lte('variance_date', ymdLocal(weekEnd)),
      ])

      if (cancelled) return

      // Build date index map
      const dateToIdx = {}
      for (let i = 0; i < 7; i++) {
        dateToIdx[ymdLocal(addDays(weekStart, i))] = i
      }

      // Process counts data
      const counts = {}
      let totalLbs = 0
      ALL_DAYPARTS.forEach(({ key }) => {
        counts[key] = Array(7).fill(null).map(() => ({ cases: null, roasts: null, lbs: null }))
      })

      if (countsRes.data) {
        countsRes.data.forEach((row) => {
          const idx = dateToIdx[row.count_date]
          if (idx != null && counts[row.daypart]) {
            counts[row.daypart][idx] = {
              cases: row.cases,
              roasts: row.roasts,
              lbs: row.lbs,
              countType: row.count_type,
            }
            if (row.lbs != null) totalLbs += Number(row.lbs)
          }
        })
      }

      // Process variance data
      const variance = {}
      let totalVarianceLbs = 0
      ALL_DAYPARTS.forEach(({ key }) => {
        variance[key] = Array(7).fill(null).map(() => ({ lbs: null, pct: null }))
      })

      if (varianceRes.data) {
        varianceRes.data.forEach((row) => {
          const idx = dateToIdx[row.variance_date]
          if (idx != null && variance[row.daypart]) {
            variance[row.daypart][idx] = {
              lbs: row.lbs_delta,
              pct: row.pct_delta,
            }
            if (row.lbs_delta != null) totalVarianceLbs += Number(row.lbs_delta)
          }
        })
      }

      setCountsData(counts)
      setVarianceData(variance)
      setWeekTotals({ lbs: totalLbs, varianceLbs: totalVarianceLbs })
      setLoading(false)
    }

    loadWeek()
    return () => {
      cancelled = true
    }
  }, [locationId, weekStart])

  const formatNum = (val) => {
    if (val == null) return '–'
    return Number(val).toFixed(1)
  }

  const formatPct = (val) => {
    if (val == null) return '–'
    const num = Number(val)
    const sign = num > 0 ? '+' : ''
    return `${sign}${num.toFixed(1)}%`
  }

  const getVarianceColor = (lbs) => {
    if (lbs == null) return ''
    if (lbs < 0) return 'text-red-600'
    if (lbs > 0) return 'text-amber-600'
    return 'text-green-600'
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-gray-700 font-medium">{weekLabel}</div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded border text-sm"
            onClick={onPrevWeek}
          >
            ← Prev
          </button>
          <button
            className="px-3 py-1.5 rounded border text-sm"
            onClick={onNextWeek}
          >
            Next →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 py-4 text-center">Loading...</div>
      ) : (
        <>
          {/* Week summary */}
          <div className="bg-gray-50 rounded p-3 flex flex-wrap gap-4">
            <div>
              <span className="text-xs text-gray-500">Week Total Lbs:</span>
              <span className="ml-2 font-medium">{formatNum(weekTotals.lbs)}</span>
            </div>
            <div>
              <span className="text-xs text-gray-500">Week Variance:</span>
              <span className={`ml-2 font-medium ${getVarianceColor(weekTotals.varianceLbs)}`}>
                {weekTotals.varianceLbs > 0 ? '+' : ''}{formatNum(weekTotals.varianceLbs)} lbs
              </span>
            </div>
          </div>

          {/* Data grid by daypart - only show enabled dayparts */}
          <div className="space-y-3 overflow-x-auto">
            {activeDayparts.map(({ key, label }) => (
              <div key={key} className="border rounded">
                <div className="bg-gray-100 px-3 py-2 font-medium text-sm border-b">
                  {label}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-2 py-1 text-left w-16"></th>
                        {DOW.map((d) => (
                          <th key={d} className="px-2 py-1 text-center min-w-[50px]">
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Counts row */}
                      <tr className="border-b">
                        <td className="px-2 py-1 text-gray-500">Lbs</td>
                        {DOW.map((_, i) => (
                          <td key={i} className="px-2 py-1 text-center">
                            {formatNum(countsData[key]?.[i]?.lbs)}
                          </td>
                        ))}
                      </tr>
                      {/* Variance lbs row */}
                      <tr className="border-b">
                        <td className="px-2 py-1 text-gray-500">Var Lbs</td>
                        {DOW.map((_, i) => {
                          const lbs = varianceData[key]?.[i]?.lbs
                          return (
                            <td
                              key={i}
                              className={`px-2 py-1 text-center ${getVarianceColor(lbs)}`}
                            >
                              {lbs != null ? (lbs > 0 ? '+' : '') + formatNum(lbs) : '–'}
                            </td>
                          )
                        })}
                      </tr>
                      {/* Variance pct row */}
                      <tr>
                        <td className="px-2 py-1 text-gray-500">Var %</td>
                        {DOW.map((_, i) => {
                          const pct = varianceData[key]?.[i]?.pct
                          return (
                            <td
                              key={i}
                              className={`px-2 py-1 text-center ${getVarianceColor(pct)}`}
                            >
                              {formatPct(pct)}
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500">
            This view shows counts and variance data for the selected week.
            Use the Daily Entry tab to add or edit data.
          </p>
        </>
      )}
    </div>
  )
}
