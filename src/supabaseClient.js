import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yscduvodbocxhhxqjdzy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzY2R1dm9kYm9jeGhoeHFqZHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTkxMDQsImV4cCI6MjA2ODc5NTEwNH0.Ii1KVckXUrHPzjAfpMaMNf7rpI6iq86zuaHnCsgT9Qk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
