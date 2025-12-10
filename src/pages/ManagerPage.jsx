// src/pages/ManagerPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import CashControl from '../components/CashControl'
import DayDotsManagerCard from '../components/DayDotsManagerCard'
import TeamManagement from '../components/TeamManagement'

export default function ManagerPage({ profile }) {
  const navigate = useNavigate()
  const [openItem, setOpenItem] = useState(null)
  const [openManagerItem, setOpenManagerItem] = useState(null)

  const locationId = profile?.location_id || 'holladay-3900'

  useEffect(() => {
    if (!profile) {
      navigate('/')
    }
  }, [profile, navigate])

  const isManager =
    profile?.role === 'manager' ||
    profile?.role === 'MANAGER' ||
    profile?.role === 'admin' ||
    profile?.role === 'ADMIN'

  // Only Assistant Manager and General Manager can add/edit/delete employees
  const canManageEmployees = ['Assistant Manager', 'General Manager'].includes(
    profile?.title
  )

  const toggleItem = (id) => {
    setOpenItem((current) => (current === id ? null : id))
  }

  const toggleManagerItem = (id) => {
    setOpenManagerItem((current) => (current === id ? null : id))
  }

  // Tools accessible to all managers
  const managerTools = [
    {
      id: 'cash-control',
      title: 'Cash Control',
      summary: 'Track cash counts for drop/lock safe, storage vault, tills, and change orders.',
      component: <CashControl locationId={locationId} />,
    },
    {
      id: 'day-dots',
      title: 'Day Dots Manager',
      summary: 'Configure food items that need day dots and their sections.',
      component: <DayDotsManagerCard locationId={locationId} />,
    },
  ]

  // Tools only for Assistant Manager and General Manager
  const seniorManagerTools = [
    {
      id: 'team-management',
      title: 'Team Management',
      summary: 'Add, edit, and remove team members for this location.',
      component: <TeamManagement profile={profile} locationId={locationId} />,
    },
  ]

  return (
    <div className="w-full max-w-3xl mx-auto bg-white shadow p-4 sm:p-6 rounded px-4 sm:px-6">
      {/* Header row */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-red-700">Manager Control Center</h1>

        <button
          className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-red-700 shrink-0"
          onClick={() => navigate('/App')}
          aria-label="Go back"
        >
          Go Back
        </button>
      </div>

      {/* Manager Tools - Accessible to all managers */}
      {isManager && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Manager Tools</h2>
          <p className="text-sm text-gray-600 mb-4">
            Tap a tool to expand and use it during your shift.
          </p>

          <div className="space-y-2">
            {managerTools.map((tool) => {
              const isOpen = openItem === tool.id
              return (
                <div
                  key={tool.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleItem(tool.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    aria-expanded={isOpen}
                    aria-controls={`tool-panel-${tool.id}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{tool.title}</span>
                      <span className="text-xs text-gray-500">
                        {tool.summary}
                      </span>
                    </div>
                    <span
                      className={`transform transition-transform ${
                        isOpen ? 'rotate-90' : ''
                      }`}
                    >
                      ▶
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      id={`tool-panel-${tool.id}`}
                      className="px-4 pb-4 pt-2 bg-gray-50 border-t"
                    >
                      {tool.component}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Senior Manager Tools - Only for Assistant Manager and General Manager */}
      {canManageEmployees && (
        <section className="border-t pt-4 mt-4">
          <h2 className="text-lg font-semibold text-red-600 mb-3">Senior Manager Tools</h2>
          <p className="text-sm text-gray-600 mb-4">
            Available only to Assistant Managers and General Managers.
          </p>

          <div className="space-y-2">
            {seniorManagerTools.map((tool) => {
              const isOpen = openManagerItem === tool.id
              return (
                <div
                  key={tool.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleManagerItem(tool.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    aria-expanded={isOpen}
                    aria-controls={`manager-tool-panel-${tool.id}`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{tool.title}</span>
                      <span className="text-xs text-gray-500">
                        {tool.summary}
                      </span>
                    </div>
                    <span
                      className={`transform transition-transform ${
                        isOpen ? 'rotate-90' : ''
                      }`}
                    >
                      ▶
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      id={`manager-tool-panel-${tool.id}`}
                      className="px-4 pb-4 pt-2 bg-gray-50 border-t"
                    >
                      {tool.component}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
