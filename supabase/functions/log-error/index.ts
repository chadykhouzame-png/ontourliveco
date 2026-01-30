import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ErrorLogPayload {
  error_code: string
  error_message: string
  context?: string
  url?: string
  user_agent?: string
  stack_trace?: string
  metadata?: Record<string, unknown>
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Use service role to insert (bypasses RLS for reliability)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user ID from auth header if present
    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null
    
    if (authHeader) {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } }
      })
      const { data: { user } } = await userClient.auth.getUser()
      userId = user?.id || null
    }

    const payload: ErrorLogPayload = await req.json()
    
    // Validate required fields
    if (!payload.error_code || !payload.error_message) {
      return new Response(
        JSON.stringify({ error: 'error_code and error_message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize and truncate fields to prevent abuse
    const sanitizedPayload = {
      error_code: String(payload.error_code).slice(0, 100),
      error_message: String(payload.error_message).slice(0, 1000),
      user_id: userId,
      context: payload.context ? String(payload.context).slice(0, 200) : null,
      url: payload.url ? String(payload.url).slice(0, 500) : null,
      user_agent: payload.user_agent ? String(payload.user_agent).slice(0, 500) : null,
      stack_trace: payload.stack_trace ? String(payload.stack_trace).slice(0, 5000) : null,
      metadata: payload.metadata || {},
    }

    const { error } = await supabase
      .from('error_logs')
      .insert(sanitizedPayload)

    if (error) {
      console.error('Failed to log error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to log error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Error logged: ${sanitizedPayload.error_code} - ${sanitizedPayload.context || 'no context'}`)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error in log-error function:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})