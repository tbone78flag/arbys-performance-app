import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// IMPORTANT: this is your project ref + .functions.supabase.co
const supabaseFunctionsUrl = 'https://yscduvodbocxhhxqjdzy.functions.supabase.co'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  functions: {
    url: supabaseFunctionsUrl,
  },
})
