import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import SalesPage from './SalesPage'

export default function SalesPageWrapper() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const loadProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session

      if (!session) {
        navigate('/')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error(error)
        navigate('/')
      } else {
        setProfile(data)
      }

      setLoading(false)
    }

    loadProfile()
  }, [navigate])

  if (loading) return <p className="p-4">Loading...</p>

  return <SalesPage profile={profile} />
}
