import { useEffect, useState } from 'react'
import { useNavigate, Routes, Route, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import SalesPage from './pages/SalesPage.jsx'
import './App.css'

function Dashboard({ profile }) {
  return (
    <div className="text-center space-y-4">
      <p>
        Welcome, <span className="font-semibold">{profile?.full_name ?? 'Employee'}</span>!
        <br />
        Role: <span className="font-medium">{profile?.role ?? 'Unknown'}</span>
      </p>

      <nav className="space-x-4 text-blue-700 underline">
        <Link to="/app">Dashboard</Link>
        <Link to="/sales">Sales</Link>
        {/* Add more pages like Speed, Labor, etc. */}
      </nav>

      <p className="text-gray-600 mt-4">Choose a page to begin!</p>
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

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session?.user?.id)
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
      <h1 className="text-3xl font-bold text-red-700 mb-6 text-center">
        Arby’s Performance App
      </h1>

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
