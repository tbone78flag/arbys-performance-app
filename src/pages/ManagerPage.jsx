// src/pages/ManagerPage.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import CashControl from '../components/CashControl'

export default function ManagerPage({ profile }) {
  const navigate = useNavigate()

  const locationId = profile?.location_id || 'holladay-3900'

  // --- state for employees management ---
  const [employees, setEmployees] = useState([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [employeesError, setEmployeesError] = useState(null)

  // add-employee form state
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('EMPLOYEE')
  const [title, setTitle] = useState('')
  const [savingEmployee, setSavingEmployee] = useState(false)
  const [formError, setFormError] = useState(null)

  // edit-employee modal state
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState(null)

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
    if (!isManager) return

    async function fetchEmployees() {
      setLoadingEmployees(true)
      setEmployeesError(null)

      const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('location_id', locationId)
      .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading employees', error)
        setEmployeesError(`Failed to load team members: ${error.message}`)
      } else {
        setEmployees(data || [])
      }

      setLoadingEmployees(false)
    }

    fetchEmployees()
  }, [isManager, locationId])

  async function handleAddEmployee(e) {
  e.preventDefault()
  setFormError(null)

  if (!username.trim() || !displayName.trim() || !password.trim()) {
    setFormError('Username, display name, and password are required.')
    return
  }

  const locationId = profile?.location_id || 'holladay-3900'

  try {
    setSavingEmployee(true)

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    console.log('getSession result:', { session, sessionError })

    if (sessionError) {
      console.error('getSession error', sessionError)
      setFormError('Could not read login session.')
      return
    }

    if (!session) {
      setFormError('You must be logged in to add employees.')
      return
    }

    const { data, error } = await supabase.functions.invoke('create-employee', {
      body: {
        username: username.trim(),
        displayName: displayName.trim(),
        role,
        title: role === 'MANAGER' ? title : null,
        locationId,
        password: password.trim(),
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    console.log('create-employee result:', { data, error })

    if (error || data?.error) {
      console.error('Function error:', error || data?.error)
      setFormError(
        data?.error ||
          error?.message ||
          'Edge function returned an error.'
      )
      return
    }

    setUsername('')
    setDisplayName('')
    setPassword('')
    setRole('EMPLOYEE')

    const { data: employeesData, error: reloadError } = await supabase
      .from('employees')
      .select('*')
      .eq('location_id', locationId)
      .order('created_at', { ascending: true })

    if (reloadError) {
      console.error('Error reloading employees', reloadError)
    } else {
      setEmployees(employeesData || [])
    }
  } catch (err) {
    console.error('invoke threw:', err, {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    })
    setFormError(
      err?.message || 'Failed to send request to the edge function.'
    )
  } finally {
    setSavingEmployee(false)
  }
}

  async function handleDeleteEmployee(employeeId, employeeName) {
    // Confirm before deleting
    if (!window.confirm(`Are you sure you want to delete ${employeeName}? This will permanently remove their account and cannot be undone.`)) {
      return
    }

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error('No session for delete', sessionError)
        setEmployeesError('You must be logged in to delete employees.')
        return
      }

      const { data, error } = await supabase.functions.invoke('delete-employee', {
        body: { employeeId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      console.log('delete-employee result:', { data, error })

      if (error || data?.error) {
        console.error('Error deleting employee', error || data?.error)
        // Try to extract the actual error message
        const errorMsg = data?.error || error?.context?.body?.error || error?.message || 'Unknown error'
        setEmployeesError(`Failed to delete employee: ${errorMsg}`)
        return
      }

      // Remove from local state
      setEmployees((prev) => prev.filter((e) => e.id !== employeeId))
      setEmployeesError(null)
    } catch (err) {
      console.error('Delete threw:', err)
      setEmployeesError(err?.message || 'Failed to delete employee.')
    }
  }

  function openEditModal(employee) {
    setEditingEmployee(employee)
    setEditDisplayName(employee.display_name || '')
    setEditRole(employee.role || 'EMPLOYEE')
    setEditTitle(employee.title || '')
    setEditError(null)
  }

  function closeEditModal() {
    setEditingEmployee(null)
    setEditDisplayName('')
    setEditRole('EMPLOYEE')
    setEditTitle('')
    setEditError(null)
  }

  async function handleSaveEdit(e) {
    e.preventDefault()
    if (!editingEmployee) return

    setSavingEdit(true)
    setEditError(null)

    try {
      // Update employees table
      const { error: empError } = await supabase
        .from('employees')
        .update({
          display_name: editDisplayName.trim(),
          role: editRole,
          title: editRole === 'MANAGER' ? editTitle : null,
        })
        .eq('id', editingEmployee.id)

      if (empError) {
        console.error('Error updating employee', empError)
        setEditError(`Failed to update employee: ${empError.message}`)
        return
      }

      // Also update the profiles table if it exists for this user
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editDisplayName.trim(),
          role: editRole.toLowerCase(),
          title: editRole === 'MANAGER' ? editTitle : null,
        })
        .eq('id', editingEmployee.id)

      if (profileError) {
        console.warn('Could not update profile (may not exist):', profileError.message)
      }

      // Update local state
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === editingEmployee.id
            ? {
                ...emp,
                display_name: editDisplayName.trim(),
                role: editRole,
                title: editRole === 'MANAGER' ? editTitle : null,
              }
            : emp
        )
      )

      closeEditModal()
    } catch (err) {
      console.error('Error saving edit:', err)
      setEditError(err?.message || 'Failed to save changes.')
    } finally {
      setSavingEdit(false)
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
                      <th className="px-2 py-1 text-left">Title</th>
                      <th className="px-2 py-1 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((e) => (
                      <tr key={e.id} className="border-t">
                        <td className="px-2 py-1">{e.display_name}</td>
                        <td className="px-2 py-1">{e.username}</td>
                        <td className="px-2 py-1">{e.role}</td>
                        <td className="px-2 py-1">{e.title || '—'}</td>
                        <td className="px-2 py-1 space-x-2">
                          {e.id !== profile.id && (
                            <>
                              <button
                                className="text-xs text-blue-600 hover:underline"
                                onClick={() => openEditModal(e)}
                              >
                                Edit
                              </button>
                              <button
                                className="text-xs text-red-600 hover:underline"
                                onClick={() => handleDeleteEmployee(e.id, e.display_name)}
                              >
                                Delete
                              </button>
                            </>
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
                <label className="text-xs font-medium">Display Name</label>
                <input
                  className="border rounded px-2 py-1 text-sm"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Jessica"
                />
              </div>

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
                  onChange={(e) => {
                    setRole(e.target.value)
                    if (e.target.value !== 'MANAGER') {
                      setTitle('')
                    }
                  }}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>

              {role === 'MANAGER' && (
                <div className="flex flex-col">
                  <label className="text-xs font-medium">Title</label>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  >
                    <option value="">Select title...</option>
                    <option value="Shift Manager">Shift Manager</option>
                    <option value="Assistant Manager">Assistant Manager</option>
                    <option value="General Manager">General Manager</option>
                  </select>
                </div>
              )}

              <div className={`${role === 'MANAGER' ? 'sm:col-span-3' : 'sm:col-span-4'} flex justify-end`}>
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

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                Edit Employee: {editingEmployee.display_name}
              </h3>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 space-y-4">
              {editError && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{editError}</p>
              )}

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  className="border rounded px-3 py-2 text-sm"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Display name"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  className="border rounded px-3 py-2 text-sm bg-gray-100"
                  value={editingEmployee.username || ''}
                  disabled
                  title="Username cannot be changed"
                />
                <span className="text-xs text-gray-500 mt-1">Username cannot be changed</span>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  className="border rounded px-3 py-2 text-sm"
                  value={editRole}
                  onChange={(e) => {
                    setEditRole(e.target.value)
                    if (e.target.value !== 'MANAGER') {
                      setEditTitle('')
                    }
                  }}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                </select>
              </div>

              {editRole === 'MANAGER' && (
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">Title</label>
                  <select
                    className="border rounded px-3 py-2 text-sm"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  >
                    <option value="">Select title...</option>
                    <option value="Shift Manager">Shift Manager</option>
                    <option value="Assistant Manager">Assistant Manager</option>
                    <option value="General Manager">General Manager</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
                >
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
