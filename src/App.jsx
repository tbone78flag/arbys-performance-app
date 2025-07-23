import { useEffect, useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import SalesPage from './pages/SalesPage.jsx'
import './App.css'

function Dashboard({ profile }) {
  return (
    <div className="text-center space-y-4">
      <h2 className="text-2xl font-bold text-red-700 mb-4">Dashboard</h2>

      <p>
        Welcome, <strong>{profile?.full_name ?? 'Employee'}</strong>!
        <br />
        Role: <strong>{profile?.role ?? 'Unknown'}</strong>
      </p>

      <nav className="space-x-4 mt-4 text-blue-700 underline">
        <Link to="/app">Dashboard</Link>
        <Link to="/sales">Sales</Link>
        {/* Add other pages later: Speed, Labor, etc. */}
      </nav>

      <p className="text-gray-600 mt-6">Choose a section to begin!</p>
    </div>
  )
}

function App() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const loadSessionAndProfile = async () => {
      const { data, error } = await supabase.auth.getSession()
      const session = data?.session

      if (!session) {
        navigate('/')
        return
      }

      // Load profile from Supabase
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id) // NOT optional here
        .single()

      if (profileError) {
        console.error('Failed to load profile:', profileError.message)
      } else {
        setProfile(profileData)
      }

      setLoading(false)
    }

    loadSessionAndProfile()
  }, [navigate])

  if (loading) return <p className="text-center p-8">Loading...</p>

  return (
    <div className="min-h-screen bg-red-100 p-6">
      <h1 className="text-3xl font-bold text-center text-red-700 mb-6">
        Arby’s Performance App
      </h1>

      <p>
        Welcome, <strong>{profile?.full_name ?? 'Employee'}</strong>!
        <br />
        Role: <strong>{profile?.role ?? 'Unknown'}</strong>
      </p>

      <Routes>
        <Route path="/app" element={<Dashboard profile={profile} />} />
        <Route path="/sales" element={<SalesPage profile={profile} />} />
      </Routes>

      <div className="mt-10 text-center">
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            navigate('/')
          }}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Log Out
        </button>
      </div>
    </div>
  )
}

export default App
