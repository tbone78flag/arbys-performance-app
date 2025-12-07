// src/pages/ManagerPage.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import CashControl from '../components/CashControl'

export default function ManagerPage({ profile }) {
  const navigate = useNavigate()

  // --- state for employees management ---
  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [employeesError, setEmployeesError] = useState(null)

  // add-employee form state
  const [authUserId, setAuthUserId] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('EMPLOYEE')
  const [savingEmployee, setSavingEmployee] = useState(false)
  const [formError, setFormError] = useState(null)

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

  // fetch employees for this manager's location
  useEffect(() => {
    if (!isManager || !profile?.location_id) return

    async function fetchEmployees() {
      setLoadingEmployees(true)
      setEmployeesError(null)

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('location_id', profile.location_id)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading employees', error)
        setEmployeesError('Failed to load team members.')
      } else {
        setEmployees(data || [])
      }

      setLoadingEmployees(false)
    }

    fetchEmployees()
  }, [isManager, profile])

  async function handleAddEmployee(e) {
    e.preventDefault()
    setFormError(null)

    if (!username.trim() || !displayName.trim() || !password.trim()) {
      setFormError('Username, display name, and password are required.')
      return
    }

    if (!profile?.location_id) {
      setFormError('Missing location_id on profile.')
      return
    }

    try {
      setSavingEmployee(true)

      const { data, error } = await supabase.functions.invoke('create-employee', {
        body: {
          username: username.trim(),
          displayName: displayName.trim(),
          role,
          locationId: profile.location_id,
          password: password.trim(),
        },
      })

      if (error || data?.error) {
        console.error('Error from function', error || data?.error)
        setFormError(data?.error || error?.message || 'Failed to create employee.')
        return
      }

      // clear form
      setUsername('')
      setDisplayName('')
      setPassword('')
      setRole('EMPLOYEE')

      // reload employees
      const { data: employeesData, error: reloadError } = await supabase
        .from('employees')
        .select('*')
        .eq('location_id', profile.location_id)
        .order('created_at', { ascending: true })

      if (reloadError) {
        console.error('Error reloading employees', reloadError)
      } else {
        setEmployees(employeesData || [])
      }
    } finally {
      setSavingEmployee(false)
    }
  }

  async function handleDeactivateEmployee(employeeId) {
    try {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: false })
        .eq('id', employeeId)

      if (error) {
        console.error('Error deactivating employee', error)
        return
      }

      // refresh the list
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === employeeId ? { ...e, is_active: false } : e
        )
      )
    } catch (err) {
      console.error(err)
    }
  }

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

      {/* Accessible to all team members */}
      <div className="mb-4">
        <CashControl />
      </div>

      {/* Manager-only section */}
      {isManager && (
        <div className="border-t pt-4 mt-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-red-600">Manager Tools</h2>
            <p className="text-sm text-gray-700">
              Only visible to managers — use this to manage your team.
            </p>
          </div>

          {/* Team management */}
          <section className="space-y-3">
            <h3 className="font-semibold text-gray-800">Team Members ({profile.location_id})</h3>

            {employeesError && (
              <p className="text-sm text-red-600">{employeesError}</p>
            )}

            {loadingEmployees ? (
              <p className="text-sm text-gray-600">Loading team members…</p>
            ) : (
              <div className="overflow-x-auto border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-2 py-1 text-left">Name</th>
                      <th className="px-2 py-1 text-left">Username</th>
                      <th className="px-2 py-1 text-left">Role</th>
                      <th className="px-2 py-1 text-left">Active</th>
                      <th className="px-2 py-1 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((e) => (
                      <tr key={e.id} className="border-t">
                        <td className="px-2 py-1">{e.display_name}</td>
                        <td className="px-2 py-1">{e.username}</td>
                        <td className="px-2 py-1">{e.role}</td>
                        <td className="px-2 py-1">
                          {e.is_active ? 'Yes' : 'No'}
                        </td>
                        <td className="px-2 py-1">
                          {e.is_active && e.id !== profile.id && (
                            <button
                              className="text-xs text-red-600 hover:underline"
                              onClick={() => handleDeactivateEmployee(e.id)}
                            >
                              Deactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}

                    {employees.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-2 py-2 text-sm text-gray-500 text-center"
                        >
                          No team members found yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Add employee form */}
          <section className="space-y-2">
            <h3 className="font-semibold text-gray-800">Add Employee</h3>
            <p className="text-xs text-gray-600">
              Creates a login for this location and adds them to your team.
            </p>

            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}

            <form
              className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end"
              onSubmit={handleAddEmployee}
            >
              <div className="flex flex-col">
                <label className="text-xs font-medium">Username</label>
                <input
                  className="border rounded px-2 py-1 text-sm"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. jessica"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-medium">Display Name</label>
                <input
                  className="border rounded px-2 py-1 text-sm"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Jessica"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-medium">Password / PIN</label>
                <input
                  className="border rounded px-2 py-1 text-sm"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Temporary password"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-medium">Role</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>

              <div className="sm:col-span-4 flex justify-end">
                <button
                  type="submit"
                  disabled={savingEmployee}
                  className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700 disabled:opacity-60"
                >
                  {savingEmployee ? 'Creating…' : 'Add Employee'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
