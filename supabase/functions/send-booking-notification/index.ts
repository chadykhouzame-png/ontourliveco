import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface BookingNotificationRequest {
  type: 'new_offer' | 'counter_offer' | 'accepted' | 'declined';
  booking_request_id: string;
  sender_name: string;
  recipient_user_id: string;
  requested_date: string;
  offer_amount?: number;
  counter_offer?: number;
  message?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ success: true, email_sent: false, reason: 'RESEND_API_KEY not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: BookingNotificationRequest = await req.json();
    console.log('Received booking notification request:', body);

    const {
      type,
      booking_request_id,
      sender_name,
      recipient_user_id,
      requested_date,
      offer_amount,
      counter_offer,
      message,
    } = body;

    // Get recipient's email from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('user_id', recipient_user_id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching recipient profile:', profileError);
      throw new Error('Recipient not found');
    }

    // Format the date for display
    const formattedDate = new Date(requested_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Build email subject and content based on notification type
    let subject = '';
    let heading = '';
    let bodyContent = '';
    let ctaText = 'View Request';

    switch (type) {
      case 'new_offer':
        subject = `New Booking Request from ${sender_name}`;
        heading = '🎵 New Booking Request!';
        bodyContent = `
          <p><strong>${sender_name}</strong> wants to book you for <strong>${formattedDate}</strong>.</p>
          ${offer_amount ? `<p style="font-size: 24px; font-weight: bold; color: #0ea5e9;">Offer: $${offer_amount.toLocaleString()}</p>` : ''}
          ${message ? `<p style="color: #666; font-style: italic;">"${message}"</p>` : ''}
          <p>Log in to your dashboard to accept, decline, or make a counter-offer.</p>
        `;
        break;

      case 'counter_offer':
        subject = `Counter-Offer from ${sender_name}`;
        heading = '💰 Counter-Offer Received';
        bodyContent = `
          <p><strong>${sender_name}</strong> has responded to your booking request for <strong>${formattedDate}</strong>.</p>
          ${offer_amount ? `<p style="color: #666;">Your original offer: $${offer_amount.toLocaleString()}</p>` : ''}
          ${counter_offer ? `<p style="font-size: 24px; font-weight: bold; color: #a855f7;">Counter-offer: $${counter_offer.toLocaleString()}</p>` : ''}
          <p>Log in to your dashboard to review and respond.</p>
        `;
        ctaText = 'Review Counter-Offer';
        break;

      case 'accepted':
        subject = `Booking Accepted by ${sender_name}`;
        heading = '✅ Booking Confirmed!';
        bodyContent = `
          <p>Great news! <strong>${sender_name}</strong> has accepted your booking for <strong>${formattedDate}</strong>.</p>
          <p>You're all set! Check your dashboard for event details.</p>
        `;
        ctaText = 'View Booking';
        break;

      case 'declined':
        subject = `Booking Update from ${sender_name}`;
        heading = 'Booking Request Update';
        bodyContent = `
          <p><strong>${sender_name}</strong> was unable to accept your booking request for <strong>${formattedDate}</strong>.</p>
          <p>Don't worry – keep exploring other artists or create an entertainment request to find the perfect match!</p>
        `;
        ctaText = 'Find More Artists';
        break;
    }

    // Create in-app notification
    const notificationTitle = type === 'new_offer' 
      ? `New booking request from ${sender_name}`
      : type === 'counter_offer'
        ? `Counter-offer from ${sender_name}`
        : type === 'accepted'
          ? `${sender_name} accepted your booking`
          : `${sender_name} declined your booking`;

    const notificationMessage = type === 'new_offer'
      ? `${sender_name} wants to book you for ${formattedDate}${offer_amount ? ` • Offer: $${offer_amount.toLocaleString()}` : ''}`
      : type === 'counter_offer'
        ? `Counter-offer of $${counter_offer?.toLocaleString()} for ${formattedDate}`
        : type === 'accepted'
          ? `Your booking for ${formattedDate} has been confirmed!`
          : `Your booking request for ${formattedDate} was declined`;

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: recipient_user_id,
        title: notificationTitle,
        message: notificationMessage,
        type: 'booking',
        reference_id: booking_request_id,
        reference_type: 'booking_request',
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    // Send email
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; margin: 0; padding: 40px 20px;">
          <div style="max-width: 560px; margin: 0 auto; background-color: #18181b; border-radius: 16px; padding: 40px; border: 1px solid #27272a;">
            <div style="text-align: center; margin-bottom: 32px;">
              <span style="font-size: 28px; font-weight: 900; letter-spacing: -0.05em;">
                <span style="color: #0ea5e9;">ON</span><span style="color: #ffffff;">TOUR</span>
              </span>
            </div>
            
            <h1 style="color: #ffffff; font-size: 24px; text-align: center; margin-bottom: 24px;">${heading}</h1>
            
            <div style="color: #a1a1aa; font-size: 16px; line-height: 1.6;">
              ${bodyContent}
            </div>
            
            <div style="text-align: center; margin-top: 32px;">
              <a href="${supabaseUrl.replace('.supabase.co', '.lovableproject.com')}" 
                 style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                ${ctaText}
              </a>
            </div>
            
            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #27272a; text-align: center;">
              <p style="color: #52525b; font-size: 14px; margin: 0;">
                You're receiving this because you have an account on OnTour.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'OnTour <noreply@resend.dev>',
      to: [profile.email],
      subject: subject,
      html: html,
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      // Don't throw - notification was still created
      return new Response(
        JSON.stringify({ success: true, email_sent: false, notification_created: true, error: emailError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email sent successfully:', emailData);

    return new Response(
      JSON.stringify({ success: true, email_sent: true, notification_created: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-booking-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
