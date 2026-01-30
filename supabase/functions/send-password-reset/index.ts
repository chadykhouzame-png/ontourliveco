import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import React from "https://esm.sh/react@18.3.1";
import { renderAsync } from "https://esm.sh/@react-email/components@0.0.22";
import { PasswordResetEmail } from './_templates/password-reset.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MINUTES = 15; // Time window in minutes
const MAX_REQUESTS_PER_EMAIL = 3; // Max requests per email in the time window
const MAX_REQUESTS_PER_IP = 10; // Max requests per IP in the time window

// Input validation schema - strict email validation
const PasswordResetSchema = z.object({
  email: z.string().email().max(254), // RFC 5321 max email length
});

// Get client IP from request headers
function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         req.headers.get('cf-connecting-ip') ||
         'unknown';
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- INPUT VALIDATION ---
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parseResult = PasswordResetSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      console.error('Input validation failed:', parseResult.error.errors);
      // Don't reveal validation details for security
      return new Response(
        JSON.stringify({ success: true, message: 'If an account exists, a reset email will be sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email } = parseResult.data;
    const clientIP = getClientIP(req);
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log('Password reset requested for:', normalizedEmail, 'from IP:', clientIP);

    // --- RATE LIMITING ---
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - RATE_LIMIT_WINDOW_MINUTES);

    // Check email-based rate limit
    const { count: emailCount, error: emailCountError } = await supabase
      .from('password_reset_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('email', normalizedEmail)
      .gte('requested_at', windowStart.toISOString());

    if (emailCountError) {
      console.error('Error checking email rate limit:', emailCountError);
    }

    if (emailCount !== null && emailCount >= MAX_REQUESTS_PER_EMAIL) {
      console.warn(`Rate limit exceeded for email: ${normalizedEmail}`);
      // Return success response to not reveal rate limiting
      return new Response(
        JSON.stringify({ success: true, message: 'If an account exists, a reset email will be sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check IP-based rate limit (only if IP is known)
    if (clientIP !== 'unknown') {
      const { count: ipCount, error: ipCountError } = await supabase
        .from('password_reset_rate_limits')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', clientIP)
        .gte('requested_at', windowStart.toISOString());

      if (ipCountError) {
        console.error('Error checking IP rate limit:', ipCountError);
      }

      if (ipCount !== null && ipCount >= MAX_REQUESTS_PER_IP) {
        console.warn(`Rate limit exceeded for IP: ${clientIP}`);
        return new Response(
          JSON.stringify({ success: true, message: 'If an account exists, a reset email will be sent' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Record this request for rate limiting
    const { error: insertError } = await supabase
      .from('password_reset_rate_limits')
      .insert({
        email: normalizedEmail,
        ip_address: clientIP !== 'unknown' ? clientIP : null,
        requested_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error recording rate limit entry:', insertError);
      // Continue anyway - don't block the request if we can't record it
    }

    // Clean up old entries occasionally (1% chance per request)
    if (Math.random() < 0.01) {
      supabase.rpc('cleanup_old_rate_limits').then(({ error }) => {
        if (error) console.error('Error cleaning up rate limits:', error);
        else console.log('Rate limit cleanup completed');
      });
    }

    const resend = new Resend(resendApiKey);

    // Generate password reset link using Supabase Auth
    const { data, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${req.headers.get('origin') || supabaseUrl}/reset-password`,
      },
    });

    if (resetError) {
      console.error('Error generating reset link:', resetError);
      // Don't reveal if user exists or not for security
      return new Response(
        JSON.stringify({ success: true, message: 'If an account exists, a reset email will be sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resetUrl = data.properties?.action_link;
    
    if (!resetUrl) {
      console.error('No reset URL generated');
      return new Response(
        JSON.stringify({ success: true, message: 'If an account exists, a reset email will be sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Reset URL generated successfully');

    // Render the React Email template
    const html = await renderAsync(
      React.createElement(PasswordResetEmail, {
        resetUrl,
        userEmail: email,
      })
    );

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: 'On Tour <noreply@resend.dev>',
      to: [email],
      subject: 'Reset your On Tour password',
      html,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Password reset email sent successfully to:', email);

    return new Response(
      JSON.stringify({ success: true, message: 'Password reset email sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in send-password-reset:', error);
    // Don't expose internal error details
    return new Response(
      JSON.stringify({ success: false, error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
