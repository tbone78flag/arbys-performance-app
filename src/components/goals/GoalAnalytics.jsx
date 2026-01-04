// src/components/goals/GoalAnalytics.jsx
import { useGoalAnalytics, getCurrentPeriod } from '../../hooks/useGoalsData'

export default function GoalAnalytics({ locationId }) {
  const { data: analytics, isLoading, error } = useGoalAnalytics(locationId)

  const { periodStart } = getCurrentPeriod()
  const monthLabel = periodStart.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 p-4">
        Loading analytics...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 p-4">
        Error loading analytics: {error.message}
      </div>
    )
  }

  const {
    totalEmployees,
    employeesWithGoals,
    percentWithGoals,
    employeesWithCheckins,
    percentWithCheckins,
    currentWeek,
    commonThemes,
  } = analytics || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="font-semibold text-gray-800">Goals Analytics</h3>
        <p className="text-xs text-gray-500">{monthLabel} • Week {currentWeek}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {/* Goal Adoption */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase font-medium">
              Goal Adoption
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                percentWithGoals >= 70
                  ? 'bg-green-100 text-green-800'
                  : percentWithGoals >= 40
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {percentWithGoals >= 70 ? 'Strong' : percentWithGoals >= 40 ? 'Growing' : 'Needs Focus'}
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {percentWithGoals}%
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {employeesWithGoals} of {totalEmployees} team members set goals
          </p>
          {/* Progress bar */}
          <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                percentWithGoals >= 70
                  ? 'bg-green-500'
                  : percentWithGoals >= 40
                  ? 'bg-yellow-400'
                  : 'bg-red-500'
              }`}
              style={{ width: `${percentWithGoals}%` }}
            />
          </div>
        </div>

        {/* Check-in Rate */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase font-medium">
              Weekly Check-ins
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                percentWithCheckins >= 70
                  ? 'bg-green-100 text-green-800'
                  : percentWithCheckins >= 40
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {percentWithCheckins >= 70 ? 'Consistent' : percentWithCheckins >= 40 ? 'Moderate' : 'Low'}
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {percentWithCheckins}%
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {employeesWithCheckins} of {employeesWithGoals} checked in this week
          </p>
          {/* Progress bar */}
          <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                percentWithCheckins >= 70
                  ? 'bg-green-500'
                  : percentWithCheckins >= 40
                  ? 'bg-yellow-400'
                  : 'bg-red-500'
              }`}
              style={{ width: `${percentWithCheckins}%` }}
            />
          </div>
        </div>
      </div>

      {/* Common Themes */}
      {commonThemes && commonThemes.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Common Goal Themes
          </h4>
          <div className="flex flex-wrap gap-2">
            {commonThemes.map((theme, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                style={{
                  fontSize: `${Math.max(0.75, Math.min(1.25, 0.75 + theme.count * 0.1))}rem`,
                }}
              >
                {theme.word}
                <span className="ml-1 text-blue-400 text-xs">({theme.count})</span>
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Based on goal text from team members this month
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">
          Tips to Improve Engagement
        </h4>
        <ul className="space-y-2 text-sm text-blue-700">
          {percentWithGoals < 50 && (
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              Remind team members to set their monthly goals during pre-shift
            </li>
          )}
          {percentWithCheckins < 50 && (
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              Ask about goal progress during weekly one-on-ones
            </li>
          )}
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            Celebrate goal completions by awarding bonus points
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500">•</span>
            Share success stories from team members who hit their goals
          </li>
        </ul>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-gray-800">{totalEmployees}</div>
          <div className="text-xs text-gray-500">Active Employees</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">{employeesWithGoals}</div>
          <div className="text-xs text-gray-500">Goals Set</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-600">{employeesWithCheckins}</div>
          <div className="text-xs text-gray-500">Active This Week</div>
        </div>
      </div>
    </div>
  )
}
