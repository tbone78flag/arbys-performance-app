import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [employeeID, setEmployeeID] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
  e.preventDefault()
  setError(null)

  // Step 1: Look up profile by employee ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('employee_id', employeeID)
    .single()

  if (profileError || !profile?.email) {
    setError("Employee ID not found.")
    return
  }

  // Step 2: Use the email to log in
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password
  })

  if (loginError) {
    setError("Invalid password or login failed.")
  } else {
    navigate('/app')
  }
}

    const signOut = async (e) => {
        await supabase.signOut();
    }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4">
      <h1 className="text-3xl font-bold text-red-700 mb-6">Welcome to Arby’s Performance App</h1>
      
      <form onSubmit={handleLogin} className="bg-white p-6 rounded shadow-md w-full max-w-sm">
        <input
          type="employeeID"
          placeholder="Employee ID"
          className="border border-gray-300 p-2 w-full mb-3 rounded text-black"
          value={employeeID}
          onChange={(e) => setEmployeeID(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="border border-gray-300 p-2 w-full mb-3 rounded text-black"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          type="submit"
          className="bg-red-600 text-white px-4 py-2 rounded w-full hover:bg-red-700 text-white"
        >
          Log In
        </button>
      </form>
    </div>
  )
}
