// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// These MUST match your Supabase project settings (Project Settings → API)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Optional: temporary logging if you want to confirm they're set
// console.log('supabaseUrl', supabaseUrl)
// console.log('supabaseAnonKey', supabaseAnonKey ? 'present' : 'missing')

// This is the project ref from your deploy output: yscduvodbocxhhxqjdzy
// Functions live on this separate subdomain
const supabaseFunctionsUrl = 'https://yscduvodbocxhhxqjdzy.functions.supabase.co'

// Create the client. No throws here, so if envs are wrong, the app still loads.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  functions: {
    url: supabaseFunctionsUrl,
  },
})
