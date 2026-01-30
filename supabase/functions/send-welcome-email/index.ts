import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import React from "https://esm.sh/react@18.3.1";
import { renderAsync } from "https://esm.sh/@react-email/components@0.0.22";
import { WelcomeEmail } from './_templates/welcome.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface WelcomeEmailRequest {
  email: string;
  userType: 'artist' | 'venue';
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);
    const { email, userType }: WelcomeEmailRequest = await req.json();

    console.log('Welcome email requested for:', email, 'as', userType);

    if (!email || !userType) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and userType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine dashboard URL based on user type
    const origin = req.headers.get('origin') || 'https://ontour.app';
    const dashboardUrl = userType === 'artist' 
      ? `${origin}/artist/setup`
      : `${origin}/venue/setup`;

    // Render the React Email template
    const html = await renderAsync(
      React.createElement(WelcomeEmail, {
        userType,
        userEmail: email,
        dashboardUrl,
      })
    );

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: 'On Tour <noreply@resend.dev>',
      to: [email],
      subject: userType === 'artist' 
        ? '🎵 Welcome to On Tour, Artist!' 
        : '🏢 Welcome to On Tour, Venue Partner!',
      html,
    });

    if (emailError) {
      console.error('Error sending welcome email:', emailError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Welcome email sent successfully to:', email);

    return new Response(
      JSON.stringify({ success: true, message: 'Welcome email sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in send-welcome-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
