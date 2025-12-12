// src/hooks/usePointsData.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'

// Query keys
export const pointsKeys = {
  all: ['points'],
  leaderboards: (locationId) => [...pointsKeys.all, 'leaderboards', locationId],
  myPoints: (employeeId) => [...pointsKeys.all, 'myPoints', employeeId],
  rewards: (locationId) => [...pointsKeys.all, 'rewards', locationId],
  recentAwards: (managerId) => [...pointsKeys.all, 'recentAwards', managerId],
  allPointsHistory: (locationId) => [...pointsKeys.all, 'history', locationId],
}

// Calculate week boundaries (Monday-Sunday)
function getWeekBounds() {
  const now = new Date()
  const day = now.getDay()
  const diff = (day + 6) % 7
  const weekStart = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - diff)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  return { weekStart, weekEnd }
}

// Calculate month boundaries
function getMonthBounds() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { monthStart, monthEnd }
}

// Fetch leaderboard data (weekly + monthly)
async function fetchLeaderboards(locationId) {
  const { weekStart, weekEnd } = getWeekBounds()
  const { monthStart, monthEnd } = getMonthBounds()

  // Get employee names
  const { data: employees } = await supabase
    .from('employees')
    .select('id, display_name')
    .eq('location_id', locationId)

  const employeeMap = {}
  ;(employees || []).forEach((e) => {
    employeeMap[e.id] = e.display_name
  })

  // Get all points for location from start of month (covers both weekly and monthly)
  const { data: allPoints } = await supabase
    .from('points_log')
    .select('employee_id, points_amount, created_at')
    .eq('location_id', locationId)
    .gte('created_at', monthStart.toISOString())

  // Calculate weekly totals (only positive points)
  const weeklyTotals = {}
  ;(allPoints || []).forEach((p) => {
    const pDate = new Date(p.created_at)
    if (pDate >= weekStart && pDate <= weekEnd && p.points_amount > 0) {
      if (!weeklyTotals[p.employee_id]) {
        weeklyTotals[p.employee_id] = 0
      }
      weeklyTotals[p.employee_id] += p.points_amount
    }
  })

  const weeklyData = Object.entries(weeklyTotals)
    .map(([id, points]) => ({
      id,
      name: employeeMap[id] || 'Unknown',
      points,
    }))
    .sort((a, b) => b.points - a.points)

  // Calculate monthly totals (only positive points)
  const monthlyTotals = {}
  ;(allPoints || []).forEach((p) => {
    const pDate = new Date(p.created_at)
    if (pDate >= monthStart && pDate <= monthEnd && p.points_amount > 0) {
      if (!monthlyTotals[p.employee_id]) {
        monthlyTotals[p.employee_id] = 0
      }
      monthlyTotals[p.employee_id] += p.points_amount
    }
  })

  const monthlyData = Object.entries(monthlyTotals)
    .map(([id, points]) => ({
      id,
      name: employeeMap[id] || 'Unknown',
      points,
    }))
    .sort((a, b) => b.points - a.points)

  return {
    weeklyData,
    monthlyData,
    weekStart,
    weekEnd,
    monthStart,
    monthEnd,
  }
}

// Fetch individual employee points
async function fetchMyPoints(employeeId) {
  const { weekStart } = getWeekBounds()

  // Get total balance (all time)
  const { data: allPoints } = await supabase
    .from('points_log')
    .select('points_amount')
    .eq('employee_id', employeeId)

  const totalPoints = (allPoints || []).reduce((sum, p) => sum + p.points_amount, 0)

  // Get this week's activity log
  const { data: weekLog } = await supabase
    .from('points_log')
    .select('id, points_amount, source, source_detail, created_at')
    .eq('employee_id', employeeId)
    .gte('created_at', weekStart.toISOString())
    .order('created_at', { ascending: false })

  return {
    totalPoints,
    weekLog: weekLog || [],
  }
}

// Fetch available rewards
async function fetchRewards(locationId) {
  const { data } = await supabase
    .from('points_rewards')
    .select('*')
    .eq('location_id', locationId)
    .eq('active', true)
    .order('points_cost', { ascending: true })

  return data || []
}

// Hook for leaderboard data
export function useLeaderboards(locationId) {
  return useQuery({
    queryKey: pointsKeys.leaderboards(locationId),
    queryFn: () => fetchLeaderboards(locationId),
    enabled: !!locationId,
  })
}

// Hook for individual points
export function useMyPoints(employeeId) {
  return useQuery({
    queryKey: pointsKeys.myPoints(employeeId),
    queryFn: () => fetchMyPoints(employeeId),
    enabled: !!employeeId,
  })
}

// Hook for rewards
export function useRewards(locationId) {
  return useQuery({
    queryKey: pointsKeys.rewards(locationId),
    queryFn: () => fetchRewards(locationId),
    enabled: !!locationId,
  })
}

// Mutation for awarding points
export function useAwardPoints() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ employeeId, locationId, points, reason, awardedBy }) => {
      const { error } = await supabase.from('points_log').insert({
        employee_id: employeeId,
        location_id: locationId,
        points_amount: points,
        source: 'manager',
        source_detail: reason,
        awarded_by: awardedBy,
      })

      if (error) throw error
      return { employeeId, points }
    },
    onSuccess: (_, variables) => {
      // Invalidate all points-related queries
      queryClient.invalidateQueries({ queryKey: pointsKeys.all })
    },
  })
}

// Mutation for spending points (redemption)
export function useSpendPoints() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ employeeId, locationId, reward }) => {
      const { error } = await supabase.from('points_log').insert({
        employee_id: employeeId,
        location_id: locationId,
        points_amount: -reward.points_cost,
        source: 'redemption',
        source_detail: reward.reward_name,
      })

      if (error) throw error
      return { reward }
    },
    onSuccess: () => {
      // Invalidate all points-related queries
      queryClient.invalidateQueries({ queryKey: pointsKeys.all })
    },
  })
}

// Fetch recent awards by a manager (last 5)
async function fetchRecentAwards(managerId, locationId) {
  // Get employee names for display
  const { data: employees } = await supabase
    .from('employees')
    .select('id, display_name')
    .eq('location_id', locationId)

  const employeeMap = {}
  ;(employees || []).forEach((e) => {
    employeeMap[e.id] = e.display_name
  })

  // Get last 5 awards by this manager
  const { data, error } = await supabase
    .from('points_log')
    .select('id, employee_id, points_amount, source_detail, created_at')
    .eq('awarded_by', managerId)
    .eq('source', 'manager')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) throw error

  return (data || []).map((award) => ({
    ...award,
    employee_name: employeeMap[award.employee_id] || 'Unknown',
    // Calculate if within 1 hour window
    canUndo: new Date() - new Date(award.created_at) < 60 * 60 * 1000,
  }))
}

// Hook for recent awards by manager
export function useRecentAwards(managerId, locationId) {
  return useQuery({
    queryKey: pointsKeys.recentAwards(managerId),
    queryFn: () => fetchRecentAwards(managerId, locationId),
    enabled: !!managerId && !!locationId,
    refetchInterval: 30000, // Refresh every 30 seconds to update canUndo status
  })
}

// Fetch all points history for a location (for GoalsPage)
async function fetchAllPointsHistory(locationId, filters = {}) {
  const { startDate, endDate, awardType } = filters

  // Get employee names
  const { data: employees } = await supabase
    .from('employees')
    .select('id, display_name')
    .eq('location_id', locationId)

  const employeeMap = {}
  ;(employees || []).forEach((e) => {
    employeeMap[e.id] = e.display_name
  })

  // Build query - include both positive points (awards) and undo records
  let query = supabase
    .from('points_log')
    .select('id, employee_id, points_amount, source, source_detail, awarded_by, created_at')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })

  // Apply filters
  if (startDate) {
    query = query.gte('created_at', startDate)
  }
  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  // Filter by award type - but always include undo records unless filtering specifically
  if (awardType && awardType !== 'all') {
    if (awardType === 'undo') {
      query = query.eq('source', 'undo')
    } else {
      // Show the specific type plus any undos
      query = query.or(`source.eq.${awardType},source.eq.undo`)
    }
  } else {
    // Exclude redemptions from history (those are spending, not awards/undos)
    query = query.neq('source', 'redemption')
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []).map((record) => ({
    ...record,
    employee_name: employeeMap[record.employee_id] || 'Unknown',
    awarded_by_name: record.awarded_by ? employeeMap[record.awarded_by] || 'Unknown' : null,
    // For undo records, awarded_by is the person who did the undo
    undone_by_name: record.source === 'undo' && record.awarded_by
      ? employeeMap[record.awarded_by] || 'Unknown'
      : null,
  }))
}

// Hook for all points history
export function useAllPointsHistory(locationId, filters = {}) {
  return useQuery({
    queryKey: [...pointsKeys.allPointsHistory(locationId), filters],
    queryFn: () => fetchAllPointsHistory(locationId, filters),
    enabled: !!locationId,
  })
}

// Mutation for undoing a points award
export function useUndoPoints() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pointsLogId, reason, undoneBy }) => {
      // First, fetch the original record to get details
      const { data: originalRecord, error: fetchError } = await supabase
        .from('points_log')
        .select('*')
        .eq('id', pointsLogId)
        .single()

      if (fetchError) throw fetchError
      if (!originalRecord) throw new Error('Original record not found')

      // Create an undo log entry (negative points to reverse the award)
      const { error: insertError } = await supabase.from('points_log').insert({
        employee_id: originalRecord.employee_id,
        location_id: originalRecord.location_id,
        points_amount: -originalRecord.points_amount,
        source: 'undo',
        source_detail: reason,
        awarded_by: undoneBy,
      })

      if (insertError) throw insertError

      // Delete the original points log entry
      const { error: deleteError } = await supabase
        .from('points_log')
        .delete()
        .eq('id', pointsLogId)

      if (deleteError) throw deleteError

      return { pointsLogId, reason, originalRecord }
    },
    onSuccess: () => {
      // Invalidate all points-related queries
      queryClient.invalidateQueries({ queryKey: pointsKeys.all })
    },
  })
}
