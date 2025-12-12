// supabase/functions/reset-employee-password/index.ts
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error('Missing Supabase env vars')
}

// Admin client: can update auth users bypassing RLS
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Caller client: respects RLS, uses the manager's JWT
function clientForRequest(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace('Bearer ', '')

  return createClient(SUPABASE_URL!, ANON_KEY!, {
    global: {
      headers: { Authorization: `Bearer ${jwt}` },
    },
  })
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    const body = await req.json()
    const { employeeId, newPassword } = body as {
      employeeId?: string
      newPassword?: string
    }

    if (!employeeId || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Missing employeeId or newPassword' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Validate password length
    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Verify caller is authenticated and is a MANAGER/ADMIN
    const callerClient = clientForRequest(req)
    const {
      data: { user: callerUser },
      error: callerUserError,
    } = await callerClient.auth.getUser()

    if (callerUserError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Check profiles table for caller's role
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', callerUser.id)
      .single()

    if (callerProfileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Caller profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Check if caller is a manager (case-insensitive)
    const callerRole = (callerProfile.role || '').toUpperCase()
    const isManager = callerRole === 'MANAGER' || callerRole === 'ADMIN'

    if (!isManager) {
      return new Response(
        JSON.stringify({ error: 'Only managers can reset passwords' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Prevent resetting your own password through this endpoint
    if (employeeId === callerUser.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot reset your own password through this endpoint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Get the employee to verify they exist and belong to same location
    const { data: employee, error: empFetchError } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single()

    if (empFetchError || !employee) {
      return new Response(
        JSON.stringify({ error: 'Employee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Check location matches
    if (callerProfile.location_id && callerProfile.location_id !== employee.location_id) {
      return new Response(
        JSON.stringify({ error: 'Cannot reset password for employees from a different location' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Update the user's password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      employeeId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('updateError', updateError)
      return new Response(
        JSON.stringify({ error: updateError.message || 'Failed to reset password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
