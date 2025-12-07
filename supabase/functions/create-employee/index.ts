// supabase/functions/create-employee/index.ts
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

// Admin client: can create auth users and insert rows bypassing RLS
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
    const { username, displayName, role, locationId, password, title } = body as {
      username?: string
      displayName?: string
      role?: string
      locationId?: string
      password?: string
      title?: string
    }

    if (!username || !displayName || !role || !locationId || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Verify caller is authenticated and is a MANAGER/ADMIN at this location
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

    // Check profiles table (used by your app's login system)
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
        JSON.stringify({ error: 'Only managers can add employees' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Check location matches (if caller has a location_id)
    if (callerProfile.location_id && callerProfile.location_id !== locationId) {
      return new Response(
        JSON.stringify({ error: 'Cannot add employees to a different location' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Build a pseudo-email for the new user
    const email = `${locationId}__${username}@arbys-performance.local`

    // 1) Create Auth user
    const { data: newUser, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (createUserError || !newUser) {
      console.error('createUserError', createUserError)
      return new Response(
        JSON.stringify({
          error: createUserError?.message || 'Failed to create auth user',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const userId = newUser.user.id

    // 2) Insert into employees table
    const { error: empInsertError } = await supabaseAdmin
      .from('employees')
      .insert({
        id: userId,
        location_id: locationId,
        username,
        display_name: displayName,
        role,
        title: title || null,
        is_active: true,
      })

    if (empInsertError) {
      console.error('empInsertError', empInsertError)
      // Clean up auth user if employee insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({
          error: empInsertError.message || 'Failed to insert employee row',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 3) Insert into profiles table (for login system compatibility)
    // Use username as employee_id for login lookup
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        email,
        employee_id: username,
        full_name: displayName,
        role: role.toLowerCase(),
        title: title || null,
        location_id: locationId,
      })

    if (profileInsertError) {
      console.error('profileInsertError', profileInsertError)
      // Clean up if profile insert fails
      await supabaseAdmin.from('employees').delete().eq('id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({
          error: profileInsertError.message || 'Failed to insert profile row',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ success: true, userId }),
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
