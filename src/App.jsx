import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        navigate('/')
      }
      setLoading(false)
    }

    checkSession()
  }, [navigate])

  if (loading) {
    return <p className="text-center p-8">Loading...</p>
  }

  return (
    <div className="min-h-screen bg-red-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-red-700 mb-4">
        Arby’s Performance App
      </h1>
      <p className="text-lg text-gray-700 mb-6">
        Ready to build! 🚀
      </p>
      <button
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
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
