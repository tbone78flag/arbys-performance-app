import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Layout from './components/Layout'

function App() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const loadSessionAndProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session

      if (!session) {
        navigate('/')
        return
      }

      // Fetch user profile from Supabase
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error('Failed to load profile:', error.message)
      } else {
        setProfile(profileData)
      }

      setLoading(false)
    }

    loadSessionAndProfile()
  }, [navigate])

  if (loading) {
    return <p className="text-center p-8">Loading...</p>
  }

  return (
    <div className="min-h-screen bg-red-100 flex flex-col items-center justify-center p-4">
      <p className="text-gray-800 text-lg mb-4">
          Welcome, <span className="font-semibold">{profile?.full_name ?? 'Employee'}</span>!
      <br />
          Title: <span className="font-medium">{profile?.title ?? 'Unknown'}</span>
      </p>

      <h1 className="text-3xl font-bold text-red-700 mb-4">
        Arby’s Performance App
      </h1>

    <button
      className="bg-white text-red-600 border border-red-600 px-4 py-2 rounded hover:bg-red-50 mt-4"
      onClick={() => navigate('/sales')}
    >
      Go to Sales Page
    </button>

    <button
      className="bg-white text-red-600 border border-red-600 px-4 py-2 rounded hover:bg-red-50 mt-4"
      onClick={() => navigate('/food')}
    >
      Go to Food Page
    </button>

    <button
      className="bg-white text-red-600 border border-red-600 px-4 py-2 rounded hover:bg-red-50 mt-4"
      onClick={() => navigate('/speed')}
    >
      Go to Speed Page
    </button>

    <button
      className="bg-white text-red-600 border border-red-600 px-4 py-2 rounded hover:bg-red-50 mt-4"
      onClick={() => navigate('/experience')}
    >
      Go to Guest Experience Page
    </button>

    <button
      className="bg-white text-red-600 border border-red-600 px-4 py-2 rounded hover:bg-red-50 mt-4"
      onClick={() => navigate('/points')}
    >
      Go to Points Page
    </button>


    {profile?.title === 'Assistant Manager' && (
      <button 
      className="bg-white text-red-600 border border-red-600 px-4 py-2 rounded hover:bg-red-50 mt-4"
      onClick={() => navigate('/points')}
    >
      Go to Goals Page
      </button>
    )}

  
    <button
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mt-4"
        onClick={async () => {
          await supabase.auth.signOut()
          navigate('/')
        }}
      >
        Log Out
      </button>
    </div>
  );
}

export default App;
