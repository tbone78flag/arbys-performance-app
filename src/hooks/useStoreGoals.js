// src/hooks/useStoreGoals.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import {
  startOfWeekLocal,
  endOfWeekLocal,
  startOfMonthLocal,
  endOfMonthLocal,
  ymdLocal,
} from '../utils/dateHelpers'

// Query keys
export const storeGoalsKeys = {
  all: ['storeGoals'],
  current: (locationId) => [...storeGoalsKeys.all, 'current', locationId],
  history: (locationId, goalType) => [...storeGoalsKeys.all, 'history', locationId, goalType],
}

// Get current week boundaries (Monday to Sunday)
export function getCurrentWeekBounds() {
  const now = new Date()
  const start = startOfWeekLocal(now)
  const end = endOfWeekLocal(now)
  return { start, end }
}

// Get current period (month) boundaries
export function getCurrentPeriodBounds() {
  const now = new Date()
  const start = startOfMonthLocal(now)
  const end = endOfMonthLocal(now)
  return { start, end }
}

// Get previous week boundaries
export function getPreviousWeekBounds() {
  const now = new Date()
  const prevWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const start = startOfWeekLocal(prevWeek)
  const end = endOfWeekLocal(prevWeek)
  return { start, end }
}

// Get previous period boundaries
export function getPreviousPeriodBounds() {
  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const start = startOfMonthLocal(prevMonth)
  const end = endOfMonthLocal(prevMonth)
  return { start, end }
}

// ============================================
// Fetch Functions
// ============================================

// Fetch current week and period goals for a location
async function fetchCurrentStoreGoals(locationId) {
  const weekBounds = getCurrentWeekBounds()
  const periodBounds = getCurrentPeriodBounds()

  // Fetch both current week and current period goals
  const { data, error } = await supabase
    .from('store_goals')
    .select('*, creator:profiles!created_by(full_name)')
    .eq('location_id', locationId)
    .or(
      `and(goal_type.eq.week,start_date.eq.${ymdLocal(weekBounds.start)}),and(goal_type.eq.period,start_date.eq.${ymdLocal(periodBounds.start)})`
    )

  if (error) throw error

  // Organize by type
  const weekGoal = data?.find((g) => g.goal_type === 'week') || null
  const periodGoal = data?.find((g) => g.goal_type === 'period') || null

  return { weekGoal, periodGoal }
}

// Fetch previous goal (for "copy from last week/period" feature)
async function fetchPreviousGoal(locationId, goalType) {
  const bounds =
    goalType === 'week' ? getPreviousWeekBounds() : getPreviousPeriodBounds()

  const { data, error } = await supabase
    .from('store_goals')
    .select('*')
    .eq('location_id', locationId)
    .eq('goal_type', goalType)
    .eq('start_date', ymdLocal(bounds.start))
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
  return data || null
}

// Fetch goal history for a location
async function fetchGoalHistory(locationId, goalType, limit = 10) {
  const { data, error } = await supabase
    .from('store_goals')
    .select('*, creator:profiles!created_by(full_name)')
    .eq('location_id', locationId)
    .eq('goal_type', goalType)
    .order('start_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// ============================================
// Query Hooks
// ============================================

export function useCurrentStoreGoals(locationId) {
  return useQuery({
    queryKey: storeGoalsKeys.current(locationId),
    queryFn: () => fetchCurrentStoreGoals(locationId),
    enabled: !!locationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useGoalHistory(locationId, goalType) {
  return useQuery({
    queryKey: storeGoalsKeys.history(locationId, goalType),
    queryFn: () => fetchGoalHistory(locationId, goalType),
    enabled: !!locationId && !!goalType,
  })
}

// ============================================
// Mutation Hooks
// ============================================

export function useSetStoreGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ locationId, goalType, message, createdBy }) => {
      const bounds =
        goalType === 'week' ? getCurrentWeekBounds() : getCurrentPeriodBounds()

      // Upsert: insert or update if exists for this period
      const { data, error } = await supabase
        .from('store_goals')
        .upsert(
          {
            location_id: locationId,
            goal_type: goalType,
            message,
            start_date: ymdLocal(bounds.start),
            end_date: ymdLocal(bounds.end),
            created_by: createdBy,
          },
          {
            onConflict: 'location_id,goal_type,start_date',
          }
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: storeGoalsKeys.current(variables.locationId),
      })
      queryClient.invalidateQueries({
        queryKey: storeGoalsKeys.history(variables.locationId, variables.goalType),
      })
    },
  })
}

export function useCopyPreviousGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ locationId, goalType, createdBy }) => {
      // Fetch previous goal
      const previousGoal = await fetchPreviousGoal(locationId, goalType)

      if (!previousGoal) {
        throw new Error(`No previous ${goalType} goal found to copy`)
      }

      // Get current period bounds
      const bounds =
        goalType === 'week' ? getCurrentWeekBounds() : getCurrentPeriodBounds()

      // Create new goal with same message
      const { data, error } = await supabase
        .from('store_goals')
        .upsert(
          {
            location_id: locationId,
            goal_type: goalType,
            message: previousGoal.message,
            start_date: ymdLocal(bounds.start),
            end_date: ymdLocal(bounds.end),
            created_by: createdBy,
          },
          {
            onConflict: 'location_id,goal_type,start_date',
          }
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: storeGoalsKeys.current(variables.locationId),
      })
    },
  })
}
