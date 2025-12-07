// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// These MUST match your Supabase project settings (Project Settings → API)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!')
  console.error('Make sure you have a .env file with:')
  console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co')
  console.error('  VITE_SUPABASE_ANON_KEY=your-anon-key')
}

// This is the project ref from your deploy output: yscduvodbocxhhxqjdzy
// Functions live on this separate subdomain
const supabaseFunctionsUrl = 'https://yscduvodbocxhhxqjdzy.functions.supabase.co'

// Create the client with fallback empty strings to prevent crash
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  functions: {
    url: supabaseFunctionsUrl,
  },
})
