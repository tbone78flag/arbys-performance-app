// supabase/functions/delete-employee/index.ts
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

// Admin client: can delete auth users and rows bypassing RLS
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
    const { employeeId } = body as {
      employeeId?: string
    }

    if (!employeeId) {
      return new Response(
        JSON.stringify({ error: 'Missing employeeId' }),
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
        JSON.stringify({ error: 'Only managers can delete employees' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Prevent deleting yourself
    if (employeeId === callerUser.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete yourself' }),
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
        JSON.stringify({ error: 'Cannot delete employees from a different location' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 1) Delete from points_log table (cascade delete points history)
    const { error: pointsDeleteError } = await supabaseAdmin
      .from('points_log')
      .delete()
      .or(`employee_id.eq.${employeeId},awarded_by.eq.${employeeId}`)

    if (pointsDeleteError) {
      console.error('pointsDeleteError', pointsDeleteError)
      // Continue anyway - points may not exist
    }

    // 2) Delete from employees table
    const { error: empDeleteError } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', employeeId)

    if (empDeleteError) {
      console.error('empDeleteError', empDeleteError)
      return new Response(
        JSON.stringify({ error: empDeleteError.message || 'Failed to delete employee row' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 3) Delete from profiles table
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', employeeId)

    if (profileDeleteError) {
      console.error('profileDeleteError', profileDeleteError)
      // Continue anyway - profile may not exist
    }

    // 4) Delete the Auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(employeeId)

    if (authDeleteError) {
      console.error('authDeleteError', authDeleteError)
      // Return success anyway since employee/profile rows are deleted
      // The auth user may have already been deleted manually
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
