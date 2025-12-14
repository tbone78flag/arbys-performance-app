// src/components/Training.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { startOfWeekLocal, addDays } from '../utils/dateHelpers'

const TRAINING_TYPES = ['AIQ', 'LTO', 'Compliance']

export default function Training({ profile, locationId }) {
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [trainingData, setTrainingData] = useState([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState({})

  // Filters
  const [trainerFilter, setTrainerFilter] = useState('all') // 'all', 'mine', 'others'
  const [typeFilter, setTypeFilter] = useState('all') // 'all', 'AIQ', 'LTO', 'Compliance'

  const weekStart = startOfWeekLocal(weekAnchor)
  const weekEnd = addDays(weekStart, 6)

  // Generate array of days for the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Get today's date string for comparison
  const todayStr = new Date().toISOString().split('T')[0]

  // Fetch training data for the week
  useEffect(() => {
    async function fetchTraining() {
      setLoading(true)

      const startStr = weekStart.toISOString().split('T')[0]
      const endStr = weekEnd.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('training_schedule')
        .select(`
          id,
          training_type,
          training_date,
          shift_start,
          shift_end,
          notes,
          trainee_id,
          trainer_id,
          trainee:trainee_id(id, display_name),
          trainer:trainer_id(id, display_name)
        `)
        .eq('location_id', locationId)
        .gte('training_date', startStr)
        .lte('training_date', endStr)
        .order('shift_start', { ascending: true })

      if (error) {
        console.error('Error fetching training:', error)
      } else {
        setTrainingData(data || [])
      }
      setLoading(false)
    }

    fetchTraining()
  }, [locationId, weekStart.toISOString()])

  // Fetch employees for lookup
  useEffect(() => {
    async function fetchEmployees() {
      const { data } = await supabase
        .from('employees')
        .select('id, display_name')
        .eq('location_id', locationId)

      if (data) {
        const empMap = {}
        data.forEach((e) => (empMap[e.id] = e.display_name))
        setEmployees(empMap)
      }
    }
    fetchEmployees()
  }, [locationId])

  // Filter training data
  const filteredTraining = trainingData.filter((t) => {
    // Trainer filter
    if (trainerFilter === 'mine' && t.trainer_id !== profile.id) return false
    if (trainerFilter === 'others' && t.trainer_id === profile.id) return false

    // Type filter
    if (typeFilter !== 'all' && t.training_type !== typeFilter) return false

    return true
  })

  // Get training for a specific day
  const getTrainingForDay = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return filteredTraining.filter((t) => t.training_date === dateStr)
  }

  // Get today's trainees for current user (trainer)
  const todaysMyTrainees = trainingData.filter(
    (t) => t.training_date === todayStr && t.trainer_id === profile.id
  )

  const formatTime = (time) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours, 10)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  const formatDateHeader = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const isToday = (date) => {
    return date.toISOString().split('T')[0] === todayStr
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'AIQ':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'LTO':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'Compliance':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* Today's My Trainees - Highlighted Box */}
      {todaysMyTrainees.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-2">
            Your Trainees Today
          </h3>
          <div className="space-y-2">
            {todaysMyTrainees.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between bg-white border border-green-200 rounded p-2"
              >
                <div>
                  <span className="font-medium">{t.trainee?.display_name}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded ${getTypeColor(t.training_type)}`}>
                    {t.training_type}
                  </span>
                </div>
                <span className="text-sm text-gray-600">
                  {formatTime(t.shift_start)} - {formatTime(t.shift_end)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekAnchor(addDays(weekStart, -7))}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            &lt; Prev
          </button>
          <span className="text-sm font-medium">
            {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
            {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button
            onClick={() => setWeekAnchor(addDays(weekEnd, 1))}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Next &gt;
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={trainerFilter}
            onChange={(e) => setTrainerFilter(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">All Trainers</option>
            <option value="mine">My Trainees</option>
            <option value="others">Others' Trainees</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">All Types</option>
            {TRAINING_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Weekly Calendar */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading training schedule...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayTraining = getTrainingForDay(day)
            const dayIsToday = isToday(day)

            return (
              <div
                key={day.toISOString()}
                className={`border rounded-lg overflow-hidden ${
                  dayIsToday ? 'ring-2 ring-red-500' : ''
                }`}
              >
                {/* Day Header */}
                <div
                  className={`px-2 py-1.5 text-center text-xs font-medium ${
                    dayIsToday
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {formatDateHeader(day)}
                </div>

                {/* Day Content */}
                <div className="p-1.5 min-h-[80px] bg-white">
                  {dayTraining.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center mt-2">
                      No training
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {dayTraining.map((t) => (
                        <div
                          key={t.id}
                          className={`text-xs p-1.5 rounded border ${getTypeColor(t.training_type)}`}
                        >
                          <div className="font-medium truncate">
                            {t.trainee?.display_name}
                          </div>
                          <div className="text-[10px] opacity-75">
                            {formatTime(t.shift_start)}-{formatTime(t.shift_end)}
                          </div>
                          <div className="text-[10px] opacity-75 truncate">
                            w/ {t.trainer?.display_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="font-medium text-gray-600">Legend:</span>
        {TRAINING_TYPES.map((type) => (
          <span key={type} className={`px-2 py-0.5 rounded ${getTypeColor(type)}`}>
            {type}
          </span>
        ))}
      </div>
    </div>
  )
}
