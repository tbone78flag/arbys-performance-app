// src/components/goals/GoalsJournal.jsx
import { useState, useMemo } from 'react'
import {
  useMyGoals,
  useGoalReminders,
  useDismissReminder,
  getCurrentPeriod,
  getCurrentWeekNumber,
  isNewMonthWindow,
  isEndOfMonthWindow,
} from '../../hooks/useGoalsData'
import GoalCreationWizard from './GoalCreationWizard'
import WeeklyCheckInForm from './WeeklyCheckInForm'
import MonthEndReflection from './MonthEndReflection'
import GoalCard from './GoalCard'
import GoalEditForm from './GoalEditForm'

const MAX_GOALS_PER_TYPE = 2

export default function GoalsJournal({ profile }) {
  const [activeTab, setActiveTab] = useState('work') // 'work' or 'personal'
  const [showCreateWizard, setShowCreateWizard] = useState(false)
  const [showCheckinForm, setShowCheckinForm] = useState(false)
  const [showReflection, setShowReflection] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)

  const { data: goals, isLoading, error } = useMyGoals(profile?.id)
  const { data: reminders } = useGoalReminders(profile?.id)
  const dismissReminderMutation = useDismissReminder()

  const { periodStart } = getCurrentPeriod()
  const currentWeek = getCurrentWeekNumber()
  const isNewMonth = isNewMonthWindow()
  const isEndMonth = isEndOfMonthWindow()

  // Get all goals for current tab (up to MAX_GOALS_PER_TYPE)
  const currentGoals = useMemo(() => {
    if (!goals) return []
    return goals.filter(g => g.goal_type === activeTab)
  }, [goals, activeTab])

  // Check if user can add more goals for this type
  const canAddMoreGoals = currentGoals.length < MAX_GOALS_PER_TYPE

  // Check which goals need check-in this week
  const goalsNeedingCheckin = useMemo(() => {
    return currentGoals.filter(goal => {
      const checkins = goal.checkins || []
      return !checkins.some(c => c.week_number === currentWeek)
    })
  }, [currentGoals, currentWeek])

  // Check which goals need reflection
  const goalsNeedingReflection = useMemo(() => {
    if (!isEndMonth) return []
    return currentGoals.filter(goal => {
      return goal.status === 'active' && !goal.reflection_worked
    })
  }, [currentGoals, isEndMonth])

  // Format month label
  const monthLabel = periodStart.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const handleDismissReminder = (reminderId) => {
    dismissReminderMutation.mutate(reminderId)
  }

  const handleStartCheckin = (goal) => {
    setSelectedGoal(goal)
    setShowCheckinForm(true)
  }

  const handleStartReflection = (goal) => {
    setSelectedGoal(goal)
    setShowReflection(true)
  }

  const handleEditGoal = (goal) => {
    setSelectedGoal(goal)
    setShowEditForm(true)
  }

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 p-4">
        Loading your goals...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 p-4">
        Error loading goals: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Monthly Goals</h3>
          <p className="text-xs text-gray-500">{monthLabel}</p>
        </div>
        <div className="text-xs text-gray-500">
          Week {currentWeek}
        </div>
      </div>

      {/* Reminders Banner */}
      {reminders && reminders.length > 0 && (
        <div className="space-y-2">
          {reminders.map(reminder => (
            <div
              key={reminder.id}
              className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-amber-600">!</span>
                <span className="text-sm text-amber-800">
                  {reminder.reminder_type === 'new_month_goal' && "Time to set your goals for this month!"}
                  {reminder.reminder_type === 'weekly_checkin' && "Don't forget your weekly check-in!"}
                  {reminder.reminder_type === 'end_month_reflection' && "Month is ending - time to reflect on your goals!"}
                </span>
              </div>
              <button
                onClick={() => handleDismissReminder(reminder.id)}
                className="text-amber-600 hover:text-amber-800 text-sm"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('work')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'work'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Work Goals
          {goals && (
            <span className="ml-1 text-xs text-gray-400">
              ({goals.filter(g => g.goal_type === 'work').length}/{MAX_GOALS_PER_TYPE})
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'personal'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Personal Goals
          {goals && (
            <span className="ml-1 text-xs text-gray-400">
              ({goals.filter(g => g.goal_type === 'personal').length}/{MAX_GOALS_PER_TYPE})
            </span>
          )}
          <span className="ml-1 text-xs text-gray-400">(Private)</span>
        </button>
      </div>

      {/* Goal Content */}
      {currentGoals.length > 0 ? (
        <div className="space-y-6">
          {currentGoals.map((goal, idx) => (
            <div key={goal.id} className="space-y-4">
              {currentGoals.length > 1 && (
                <p className="text-xs text-gray-500 font-medium">Goal {idx + 1}</p>
              )}
              <GoalCard
                goal={goal}
                onEdit={handleEditGoal}
              />

              {/* Action Buttons for this goal */}
              <div className="flex flex-wrap gap-2">
                {goalsNeedingCheckin.some(g => g.id === goal.id) && (
                  <button
                    onClick={() => handleStartCheckin(goal)}
                    className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                  >
                    Weekly Check-In
                  </button>
                )}

                {goalsNeedingReflection.some(g => g.id === goal.id) && (
                  <button
                    onClick={() => handleStartReflection(goal)}
                    className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                  >
                    End of Month Reflection
                  </button>
                )}

                {!goalsNeedingCheckin.some(g => g.id === goal.id) &&
                 !goalsNeedingReflection.some(g => g.id === goal.id) &&
                 goal.status === 'active' && (
                  <p className="text-sm text-gray-500 italic">
                    Check-in complete for this week. Keep working on your goal!
                  </p>
                )}
              </div>

              {/* Progress Overview */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Weekly Progress</h4>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(week => {
                    const checkin = (goal.checkins || []).find(c => c.week_number === week)
                    const isCurrent = week === currentWeek
                    const isPast = week < currentWeek

                    let bgColor = 'bg-gray-200'
                    if (checkin) {
                      if (checkin.progress_rating === 'green') bgColor = 'bg-green-500'
                      else if (checkin.progress_rating === 'yellow') bgColor = 'bg-yellow-400'
                      else if (checkin.progress_rating === 'red') bgColor = 'bg-red-500'
                      else bgColor = 'bg-blue-400'
                    } else if (isPast) {
                      bgColor = 'bg-gray-300'
                    }

                    return (
                      <div
                        key={week}
                        className={`flex-1 h-8 rounded ${bgColor} ${
                          isCurrent ? 'ring-2 ring-blue-600 ring-offset-1' : ''
                        } flex items-center justify-center`}
                        title={`Week ${week}${checkin ? ' - Checked in' : isPast ? ' - Missed' : ''}`}
                      >
                        <span className={`text-xs font-medium ${checkin ? 'text-white' : 'text-gray-600'}`}>
                          W{week}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Add Another Goal Button */}
          {canAddMoreGoals && (
            <button
              onClick={() => setShowCreateWizard(true)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-red-400 hover:text-red-600 transition-colors"
            >
              + Add Another {activeTab === 'work' ? 'Work' : 'Personal'} Goal
            </button>
          )}
        </div>
      ) : (
        /* No Goal - Show Create Prompt */
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-3">
            {activeTab === 'work' ? '💼' : '🎯'}
          </div>
          <p className="text-gray-600 mb-4">
            {activeTab === 'work'
              ? "You haven't set any work goals for this month yet."
              : "You haven't set any personal goals for this month yet."}
          </p>
          <button
            onClick={() => setShowCreateWizard(true)}
            className="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700"
          >
            Set {activeTab === 'work' ? 'Work' : 'Personal'} Goal
          </button>
          <p className="text-xs text-gray-400 mt-3">
            You can add up to {MAX_GOALS_PER_TYPE} {activeTab} goals per month.
            {activeTab === 'personal' && " Personal goals are private and only visible to you."}
          </p>
        </div>
      )}

      {/* Modals */}
      {showCreateWizard && (
        <GoalCreationWizard
          profile={profile}
          goalType={activeTab}
          onClose={() => setShowCreateWizard(false)}
          onComplete={() => setShowCreateWizard(false)}
        />
      )}

      {showCheckinForm && selectedGoal && (
        <WeeklyCheckInForm
          goal={selectedGoal}
          weekNumber={currentWeek}
          onClose={() => {
            setShowCheckinForm(false)
            setSelectedGoal(null)
          }}
        />
      )}

      {showReflection && selectedGoal && (
        <MonthEndReflection
          goal={selectedGoal}
          onClose={() => {
            setShowReflection(false)
            setSelectedGoal(null)
          }}
        />
      )}

      {showEditForm && selectedGoal && (
        <GoalEditForm
          goal={selectedGoal}
          onClose={() => {
            setShowEditForm(false)
            setSelectedGoal(null)
          }}
        />
      )}
    </div>
  )
}
