import { useState } from 'react'
import { BeefCountsEntry } from './beef/BeefCountsEntry'
import { BeefVarianceDaypart } from './beef/BeefVarianceDaypart'

const TABS = [
  { key: 'counts', label: 'Daily Counts' },
  { key: 'variance', label: 'Weekly Variance' },
]

export function BeefVarianceEntry({
  locationId,
  profile,
  weekStart,
  weekLabel,
  onPrevWeek,
  onNextWeek,
}) {
  const [activeTab, setActiveTab] = useState('counts')

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="flex border-b">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key
                ? 'border-red-600 text-red-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'counts' && (
        <BeefCountsEntry locationId={locationId} profile={profile} />
      )}

      {activeTab === 'variance' && (
        <BeefVarianceDaypart
          locationId={locationId}
          profile={profile}
          weekStart={weekStart}
          weekLabel={weekLabel}
          onPrevWeek={onPrevWeek}
          onNextWeek={onNextWeek}
        />
      )}
    </div>
  )
}
