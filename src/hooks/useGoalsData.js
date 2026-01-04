// src/hooks/useGoalsData.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabaseClient'
import { startOfMonthLocal, endOfMonthLocal, ymdLocal, startOfWeekLocal } from '../utils/dateHelpers'

// Query keys
export const goalsKeys = {
  all: ['goals'],
  myGoals: (employeeId, periodStart) => [...goalsKeys.all, 'my', employeeId, periodStart],
  teamGoals: (locationId, periodStart) => [...goalsKeys.all, 'team', locationId, periodStart],
  goalDetail: (goalId) => [...goalsKeys.all, 'detail', goalId],
  checkins: (goalId) => [...goalsKeys.all, 'checkins', goalId],
  analytics: (locationId) => [...goalsKeys.all, 'analytics', locationId],
  reminders: (employeeId) => [...goalsKeys.all, 'reminders', employeeId],
  previousGoal: (employeeId, goalType) => [...goalsKeys.all, 'previous', employeeId, goalType],
}

// Get current period boundaries
export function getCurrentPeriod() {
  const now = new Date()
  const periodStart = startOfMonthLocal(now)
  const periodEnd = endOfMonthLocal(now)
  return { periodStart, periodEnd }
}

// Get current week number within the month (1-6)
export function getCurrentWeekNumber() {
  const now = new Date()
  const monthStart = startOfMonthLocal(now)
  const firstWeekStart = startOfWeekLocal(monthStart)
  const diffDays = Math.floor((now.getTime() - firstWeekStart.getTime()) / (1000 * 60 * 60 * 24))
  return Math.floor(diffDays / 7) + 1
}

// Check if it's the start of a new month (first 3 days)
export function isNewMonthWindow() {
  const now = new Date()
  return now.getDate() <= 3
}

// Check if it's near the end of the month (last 5 days)
export function isEndOfMonthWindow() {
  const now = new Date()
  const lastDay = endOfMonthLocal(now).getDate()
  return now.getDate() >= lastDay - 4
}

// ============================================
// Fetch Functions
// ============================================

// Fetch employee's goals for a specific period
async function fetchMyGoals(employeeId, periodStart) {
  // Fetch goals
  const { data: goals, error: goalsError } = await supabase
    .from('employee_goals')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('period_start', periodStart)
    .order('created_at', { ascending: true })

  if (goalsError) throw goalsError
  if (!goals || goals.length === 0) return []

  // Fetch checkins for all goals
  const goalIds = goals.map(g => g.id)
  const { data: checkins, error: checkinsError } = await supabase
    .from('goal_weekly_checkins')
    .select('*')
    .in('goal_id', goalIds)
    .order('week_number', { ascending: true })

  if (checkinsError) throw checkinsError

  // Group checkins by goal_id
  const checkinsByGoal = {}
  ;(checkins || []).forEach(c => {
    if (!checkinsByGoal[c.goal_id]) checkinsByGoal[c.goal_id] = []
    checkinsByGoal[c.goal_id].push(c)
  })

  // Attach checkins to goals
  return goals.map(g => ({
    ...g,
    checkins: checkinsByGoal[g.id] || [],
  }))
}

// Fetch team work goals for managers
async function fetchTeamGoals(locationId, periodStart) {
  // Fetch goals
  const { data: goals, error: goalsError } = await supabase
    .from('employee_goals')
    .select('*')
    .eq('location_id', locationId)
    .eq('goal_type', 'work')
    .eq('period_start', periodStart)
    .order('created_at', { ascending: true })

  if (goalsError) throw goalsError
  if (!goals || goals.length === 0) return []

  // Fetch checkins for all goals
  const goalIds = goals.map(g => g.id)
  const { data: checkins, error: checkinsError } = await supabase
    .from('goal_weekly_checkins')
    .select('*')
    .in('goal_id', goalIds)
    .order('week_number', { ascending: true })

  if (checkinsError) throw checkinsError

  // Group checkins by goal_id
  const checkinsByGoal = {}
  ;(checkins || []).forEach(c => {
    if (!checkinsByGoal[c.goal_id]) checkinsByGoal[c.goal_id] = []
    checkinsByGoal[c.goal_id].push(c)
  })

  // Get employee names and titles
  const employeeIds = [...new Set(goals.map(g => g.employee_id))]

  const { data: employees } = await supabase
    .from('employees')
    .select('id, display_name, title')
    .in('id', employeeIds)

  const employeeMap = {}
  ;(employees || []).forEach(e => {
    employeeMap[e.id] = { name: e.display_name, title: e.title }
  })

  // Calculate trend indicator based on check-ins
  return goals.map(goal => {
    const goalCheckins = checkinsByGoal[goal.id] || []
    const ratings = goalCheckins
      .filter(c => c.progress_rating)
      .map(c => c.progress_rating)

    let trend = 'none'
    if (ratings.length > 0) {
      const greenCount = ratings.filter(r => r === 'green').length
      const redCount = ratings.filter(r => r === 'red').length
      const ratio = greenCount / ratings.length

      if (ratio >= 0.7) trend = 'mostly_positive'
      else if (redCount >= ratings.length * 0.5) trend = 'struggling'
      else trend = 'mixed'
    }

    const employeeInfo = employeeMap[goal.employee_id] || { name: 'Unknown', title: 'Team Member' }

    return {
      ...goal,
      checkins: goalCheckins,
      employee_name: employeeInfo.name,
      employee_title: employeeInfo.title,
      trend,
    }
  })
}

// Fetch goal detail with all check-ins
async function fetchGoalDetail(goalId) {
  // Fetch goal
  const { data: goal, error: goalError } = await supabase
    .from('employee_goals')
    .select('*')
    .eq('id', goalId)
    .single()

  if (goalError) throw goalError

  // Fetch checkins for this goal
  const { data: checkins, error: checkinsError } = await supabase
    .from('goal_weekly_checkins')
    .select('*')
    .eq('goal_id', goalId)
    .order('week_number', { ascending: true })

  if (checkinsError) throw checkinsError

  // Get employee name
  const { data: employee } = await supabase
    .from('employees')
    .select('display_name')
    .eq('id', goal.employee_id)
    .single()

  return {
    ...goal,
    employee_name: employee?.display_name || 'Unknown',
    checkins: checkins || [],
  }
}

// Fetch check-ins for a specific goal
async function fetchGoalCheckins(goalId) {
  const { data, error } = await supabase
    .from('goal_weekly_checkins')
    .select('*')
    .eq('goal_id', goalId)
    .order('week_number', { ascending: true })

  if (error) throw error
  return data || []
}

// Fetch reminders for an employee
async function fetchReminders(employeeId) {
  const { data, error } = await supabase
    .from('goal_reminders')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('dismissed', false)
    .lte('due_date', ymdLocal(new Date()))
    .order('due_date', { ascending: true })

  if (error) throw error
  return data || []
}

// Fetch previous month's goal for continuation
async function fetchPreviousGoal(employeeId, goalType) {
  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevPeriodStart = ymdLocal(startOfMonthLocal(prevMonth))

  const { data, error } = await supabase
    .from('employee_goals')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('goal_type', goalType)
    .eq('period_start', prevPeriodStart)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

// Fetch analytics for the location
async function fetchGoalAnalytics(locationId) {
  const { periodStart } = getCurrentPeriod()
  const periodStartStr = ymdLocal(periodStart)

  // Get all employees at location
  const { data: employees } = await supabase
    .from('employees')
    .select('id')
    .eq('location_id', locationId)
    .eq('is_active', true)

  const totalEmployees = (employees || []).length

  // Get goals for this period
  const { data: goals, error: goalsError } = await supabase
    .from('employee_goals')
    .select('id, employee_id, goal_text, goal_type')
    .eq('location_id', locationId)
    .eq('period_start', periodStartStr)

  if (goalsError) throw goalsError

  const goalsData = goals || []
  const uniqueEmployeesWithGoals = new Set(goalsData.map(g => g.employee_id))

  // Calculate current week
  const currentWeek = getCurrentWeekNumber()

  // Fetch checkins for all goals
  let checkins = []
  if (goalsData.length > 0) {
    const goalIds = goalsData.map(g => g.id)
    const { data: checkinsData, error: checkinsError } = await supabase
      .from('goal_weekly_checkins')
      .select('id, goal_id, week_number')
      .in('goal_id', goalIds)

    if (checkinsError) throw checkinsError
    checkins = checkinsData || []
  }

  // Group checkins by goal_id
  const checkinsByGoal = {}
  checkins.forEach(c => {
    if (!checkinsByGoal[c.goal_id]) checkinsByGoal[c.goal_id] = []
    checkinsByGoal[c.goal_id].push(c)
  })

  // Count employees with at least one check-in this week
  const employeesWithCheckins = new Set()
  goalsData.forEach(g => {
    const goalCheckins = checkinsByGoal[g.id] || []
    const hasCurrentWeekCheckin = goalCheckins.some(c => c.week_number === currentWeek)
    if (hasCurrentWeekCheckin) {
      employeesWithCheckins.add(g.employee_id)
    }
  })

  // Extract goal themes (simple word frequency)
  const wordCounts = {}
  const stopWords = ['i', 'to', 'the', 'a', 'an', 'and', 'or', 'for', 'my', 'in', 'on', 'with', 'of', 'at', 'be', 'will', 'want']
  goalsData.forEach(g => {
    const words = (g.goal_text || '').toLowerCase().split(/\s+/)
    words.forEach(word => {
      const clean = word.replace(/[^a-z]/g, '')
      if (clean.length > 3 && !stopWords.includes(clean)) {
        wordCounts[clean] = (wordCounts[clean] || 0) + 1
      }
    })
  })

  const commonThemes = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }))

  return {
    totalEmployees,
    employeesWithGoals: uniqueEmployeesWithGoals.size,
    percentWithGoals: totalEmployees > 0
      ? Math.round((uniqueEmployeesWithGoals.size / totalEmployees) * 100)
      : 0,
    employeesWithCheckins: employeesWithCheckins.size,
    percentWithCheckins: uniqueEmployeesWithGoals.size > 0
      ? Math.round((employeesWithCheckins.size / uniqueEmployeesWithGoals.size) * 100)
      : 0,
    currentWeek,
    commonThemes,
  }
}

// ============================================
// Query Hooks
// ============================================

export function useMyGoals(employeeId) {
  const { periodStart } = getCurrentPeriod()
  const periodStartStr = ymdLocal(periodStart)

  return useQuery({
    queryKey: goalsKeys.myGoals(employeeId, periodStartStr),
    queryFn: () => fetchMyGoals(employeeId, periodStartStr),
    enabled: !!employeeId,
  })
}

export function useTeamGoals(locationId) {
  const { periodStart } = getCurrentPeriod()
  const periodStartStr = ymdLocal(periodStart)

  return useQuery({
    queryKey: goalsKeys.teamGoals(locationId, periodStartStr),
    queryFn: () => fetchTeamGoals(locationId, periodStartStr),
    enabled: !!locationId,
  })
}

export function useGoalDetail(goalId) {
  return useQuery({
    queryKey: goalsKeys.goalDetail(goalId),
    queryFn: () => fetchGoalDetail(goalId),
    enabled: !!goalId,
  })
}

export function useGoalCheckins(goalId) {
  return useQuery({
    queryKey: goalsKeys.checkins(goalId),
    queryFn: () => fetchGoalCheckins(goalId),
    enabled: !!goalId,
  })
}

export function useGoalReminders(employeeId) {
  return useQuery({
    queryKey: goalsKeys.reminders(employeeId),
    queryFn: () => fetchReminders(employeeId),
    enabled: !!employeeId,
    refetchInterval: 60000, // Check every minute
  })
}

export function usePreviousGoal(employeeId, goalType) {
  return useQuery({
    queryKey: goalsKeys.previousGoal(employeeId, goalType),
    queryFn: () => fetchPreviousGoal(employeeId, goalType),
    enabled: !!employeeId && !!goalType && isNewMonthWindow(),
  })
}

export function useGoalAnalytics(locationId) {
  return useQuery({
    queryKey: goalsKeys.analytics(locationId),
    queryFn: () => fetchGoalAnalytics(locationId),
    enabled: !!locationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ============================================
// Mutation Hooks
// ============================================

export function useCreateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (goalData) => {
      const { periodStart } = getCurrentPeriod()
      const periodEnd = endOfMonthLocal(periodStart)

      const { data, error } = await supabase
        .from('employee_goals')
        .insert({
          ...goalData,
          period_start: ymdLocal(periodStart),
          period_end: ymdLocal(periodEnd),
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.all })
    },
  })
}

export function useUpdateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ goalId, updates }) => {
      const { data, error } = await supabase
        .from('employee_goals')
        .update(updates)
        .eq('id', goalId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.all })
    },
  })
}

export function useSubmitCheckin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (checkinData) => {
      const weekStart = startOfWeekLocal(new Date())

      const { data, error } = await supabase
        .from('goal_weekly_checkins')
        .upsert({
          ...checkinData,
          week_start: ymdLocal(weekStart),
        }, {
          onConflict: 'goal_id,week_number',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.all })
    },
  })
}

export function useSubmitReflection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ goalId, reflection }) => {
      const { data, error } = await supabase
        .from('employee_goals')
        .update({
          reflection_worked: reflection.worked,
          reflection_didnt_work: reflection.didntWork,
          reflection_change: reflection.change,
          status: 'completed',
        })
        .eq('id', goalId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.all })
    },
  })
}

export function useAddManagerComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ type, id, comment, rating }) => {
      if (type === 'goal') {
        const { error } = await supabase
          .from('employee_goals')
          .update({
            manager_monthly_comment: comment,
            manager_monthly_rating: rating,
          })
          .eq('id', id)

        if (error) throw error
      } else if (type === 'checkin') {
        const { error } = await supabase
          .from('goal_weekly_checkins')
          .update({
            manager_comment: comment,
            manager_rating: rating,
          })
          .eq('id', id)

        if (error) throw error
      }

      return { type, id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.all })
    },
  })
}

export function useDismissReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reminderId) => {
      const { error } = await supabase
        .from('goal_reminders')
        .update({ dismissed: true })
        .eq('id', reminderId)

      if (error) throw error
      return reminderId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.all })
    },
  })
}
