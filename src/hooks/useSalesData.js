// src/hooks/useSalesData.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { ymdLocal, addDays, buildWeeklySkeleton, startOfWeekLocal } from '../utils/dateHelpers'

// Query keys
export const salesKeys = {
  all: ['sales'],
  daily: (locationId, date) => [...salesKeys.all, 'daily', locationId, date],
  weekly: (locationId, weekStart, weekEnd) => [...salesKeys.all, 'weekly', locationId, weekStart, weekEnd],
  period: (locationId, periodStart, periodEnd) => [...salesKeys.all, 'period', locationId, periodStart, periodEnd],
}

// Fetch daily sales for a specific date
async function fetchDailySales(locationId, salesDate) {
  const { data, error } = await supabase
    .from('daily_sales_yoy')
    .select('net_sales_this_year, net_sales_last_year')
    .eq('location_id', locationId)
    .eq('sales_date', salesDate)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data || { net_sales_this_year: null, net_sales_last_year: null }
}

// Fetch weekly sales data
async function fetchWeeklySales(locationId, weekStart, weekEnd) {
  const from = ymdLocal(weekStart)
  const to = ymdLocal(weekEnd)

  const { data, error } = await supabase
    .from('daily_sales_yoy')
    .select('sales_date, net_sales_this_year, net_sales_last_year')
    .eq('location_id', locationId)
    .gte('sales_date', from)
    .lte('sales_date', to)
    .order('sales_date', { ascending: true })

  if (error) throw error

  const byDate = new Map()
  ;(data || []).forEach(row => {
    byDate.set(row.sales_date, row)
  })

  const skeleton = buildWeeklySkeleton(weekStart)
  const filled = skeleton.map(day => {
    const row = byDate.get(day.date)
    const thisYear =
      row && row.net_sales_this_year != null
        ? Number(row.net_sales_this_year)
        : null
    const lastYear =
      row && row.net_sales_last_year != null
        ? Number(row.net_sales_last_year)
        : null

    let yoyPct = null
    if (
      thisYear != null &&
      lastYear != null &&
      Number.isFinite(thisYear) &&
      Number.isFinite(lastYear) &&
      lastYear !== 0
    ) {
      yoyPct = ((thisYear - lastYear) / lastYear) * 100
    }

    return {
      ...day,
      thisYear,
      lastYear,
      yoyPct,
    }
  })

  return filled
}

// Hook for daily sales
export function useDailySales(locationId, salesDate) {
  return useQuery({
    queryKey: salesKeys.daily(locationId, salesDate),
    queryFn: () => fetchDailySales(locationId, salesDate),
    enabled: !!locationId && !!salesDate,
  })
}

// Hook for weekly sales
export function useWeeklySales(locationId, weekStart, weekEnd) {
  const weekStartStr = ymdLocal(weekStart)
  const weekEndStr = ymdLocal(weekEnd)

  return useQuery({
    queryKey: salesKeys.weekly(locationId, weekStartStr, weekEndStr),
    queryFn: () => fetchWeeklySales(locationId, weekStart, weekEnd),
    enabled: !!locationId && !!weekStart && !!weekEnd,
  })
}

// Fetch period (monthly) sales data
async function fetchPeriodSales(locationId, periodStart, periodEnd) {
  const from = ymdLocal(periodStart)
  const to = ymdLocal(periodEnd)

  const { data, error } = await supabase
    .from('daily_sales_yoy')
    .select('sales_date, net_sales_this_year, net_sales_last_year')
    .eq('location_id', locationId)
    .gte('sales_date', from)
    .lte('sales_date', to)
    .order('sales_date', { ascending: true })

  if (error) throw error

  const byDate = new Map()
  ;(data || []).forEach(row => {
    byDate.set(row.sales_date, row)
  })

  // First week start (Mon) – may be in previous month
  const firstWeekStart = startOfWeekLocal(periodStart)

  const periodDays = []
  const weeksMap = new Map()

  let cursor = new Date(periodStart)
  while (cursor <= periodEnd) {
    const key = ymdLocal(cursor)
    const row = byDate.get(key)
    const thisYear =
      row && row.net_sales_this_year != null
        ? Number(row.net_sales_this_year)
        : null
    const lastYear =
      row && row.net_sales_last_year != null
        ? Number(row.net_sales_last_year)
        : null

    // Week index based on Monday-start weeks from firstWeekStart
    const diffDays = Math.floor(
      (cursor.getTime() - firstWeekStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    const weekIndex = Math.floor(diffDays / 7) + 1

    let yoyPct = null
    if (
      thisYear != null &&
      lastYear != null &&
      Number.isFinite(thisYear) &&
      Number.isFinite(lastYear) &&
      lastYear !== 0
    ) {
      yoyPct = ((thisYear - lastYear) / lastYear) * 100
    }

    periodDays.push({
      date: key,
      weekIndex,
      thisYear,
      lastYear,
      yoyPct,
    })

    // Aggregate into week bucket
    if (!weeksMap.has(weekIndex)) {
      weeksMap.set(weekIndex, {
        weekIndex,
        totalThisYear: 0,
        totalLastYear: 0,
      })
    }
    const bucket = weeksMap.get(weekIndex)
    if (thisYear != null) bucket.totalThisYear += thisYear
    if (lastYear != null) bucket.totalLastYear += lastYear

    cursor = addDays(cursor, 1)
  }

  const weeksArr = Array.from(weeksMap.values())
    .sort((a, b) => a.weekIndex - b.weekIndex)
    .map(w => {
      let yoyWeekPct = null
      if (w.totalLastYear > 0) {
        yoyWeekPct =
          ((w.totalThisYear - w.totalLastYear) / w.totalLastYear) * 100
      }
      return {
        weekIndex: w.weekIndex,
        label: `Wk${w.weekIndex}`,
        yoyWeekPct,
      }
    })

  // Period totals
  const periodTotals = weeksArr.reduce(
    (acc, w) => {
      const bucket = weeksMap.get(w.weekIndex)
      acc.totalThisYear += bucket.totalThisYear
      acc.totalLastYear += bucket.totalLastYear
      return acc
    },
    { totalThisYear: 0, totalLastYear: 0 }
  )

  let periodYoyPct = null
  if (periodTotals.totalLastYear > 0) {
    periodYoyPct =
      ((periodTotals.totalThisYear - periodTotals.totalLastYear) /
        periodTotals.totalLastYear) * 100
  }

  return {
    dailyRows: periodDays,
    weeks: weeksArr,
    periodSummary: {
      ...periodTotals,
      yoyPct: periodYoyPct,
    },
  }
}

// Hook for period (monthly) sales
export function usePeriodSales(locationId, periodStart, periodEnd) {
  const periodStartStr = ymdLocal(periodStart)
  const periodEndStr = ymdLocal(periodEnd)

  return useQuery({
    queryKey: salesKeys.period(locationId, periodStartStr, periodEndStr),
    queryFn: () => fetchPeriodSales(locationId, periodStart, periodEnd),
    enabled: !!locationId && !!periodStart && !!periodEnd,
  })
}

// Mutation for saving daily sales
export function useSaveDailySales() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ locationId, salesDate, netSalesThisYear, netSalesLastYear }) => {
      const thisY = netSalesThisYear === '' || netSalesThisYear == null ? null : Number(netSalesThisYear)
      const lastY = netSalesLastYear === '' || netSalesLastYear == null ? null : Number(netSalesLastYear)

      // Get current user ID for updated_by field
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('daily_sales_yoy')
        .upsert(
          {
            location_id: locationId,
            sales_date: salesDate,
            net_sales_this_year: thisY,
            net_sales_last_year: lastY,
            updated_by: user.id,
          },
          { onConflict: 'location_id,sales_date' }
        )

      if (error) throw error
      return { locationId, salesDate }
    },
    onSuccess: () => {
      // Invalidate all sales-related queries to refresh charts everywhere
      queryClient.invalidateQueries({ queryKey: salesKeys.all })
    },
  })
}
