import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Helper function to generate review request email HTML
function generateReviewEmail(revieweeName: string, date: string, revieweeType: 'artist' | 'venue'): string {
  const heading = revieweeType === 'artist' 
    ? `⭐ How was ${revieweeName}'s performance?`
    : `⭐ How was your gig at ${revieweeName}?`;
  
  const bodyContent = revieweeType === 'artist'
    ? `<p>Your booking with <strong>${revieweeName}</strong> on <strong>${date}</strong> is now complete!</p>
       <p>Your feedback helps other venues make better booking decisions. Share your experience!</p>`
    : `<p>Your performance at <strong>${revieweeName}</strong> on <strong>${date}</strong> is now complete!</p>
       <p>Your feedback helps other artists know what to expect. Share your experience!</p>`;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  
  return `
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
               style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
              Leave a Review
            </a>
          </div>
          
          <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #27272a; text-align: center;">
            <p style="color: #52525b; font-size: 14px; margin: 0;">
              Reviews help build trust in our community. Thank you for sharing your experience!
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Input validation schema
const BookingNotificationSchema = z.object({
  type: z.enum(['new_offer', 'counter_offer', 'accepted', 'declined', 'completed']),
  booking_request_id: z.string().uuid(),
  sender_name: z.string().min(1).max(200).optional(), // Optional for 'completed' type
  recipient_user_id: z.string().uuid().optional(), // Optional for 'completed' type (sends to both parties)
  requested_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  offer_amount: z.number().positive().optional(),
  counter_offer: z.number().positive().optional(),
  message: z.string().max(2000).optional(),
});

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // --- JWT AUTHENTICATION ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's auth token for verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      console.error('JWT verification failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('Authenticated user:', userId);

    // --- INPUT VALIDATION ---
    const rawBody = await req.json();
    const parseResult = BookingNotificationSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      console.error('Input validation failed:', parseResult.error.errors);
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parseResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = parseResult.data;
    console.log('Validated booking notification request:', body);

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // --- AUTHORIZATION: Verify user is part of this booking ---
    const { data: booking, error: bookingError } = await supabase
      .from('booking_requests')
      .select(`
        id,
        artist_id,
        venue_id,
        artists!inner(user_id, artist_name),
        venues!inner(user_id, venue_name)
      `)
      .eq('id', booking_request_id)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Booking request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is either the artist or venue in this booking
    const artistUserId = (booking.artists as any)?.user_id;
    const venueUserId = (booking.venues as any)?.user_id;
    const artistName = (booking.artists as any)?.artist_name;
    const venueName = (booking.venues as any)?.venue_name;
    
    if (userId !== artistUserId && userId !== venueUserId) {
      console.error('Authorization failed - user not part of booking');
      return new Response(
        JSON.stringify({ error: 'Forbidden - You are not authorized for this booking' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format the date for display
    const formattedDate = new Date(requested_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // --- HANDLE COMPLETED TYPE SPECIALLY (sends to both parties) ---
    if (type === 'completed') {
      console.log('Processing completed booking notification - sending to both parties');
      
      // Get both profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, email_notifications_enabled')
        .in('user_id', [artistUserId, venueUserId]);

      if (profilesError || !profiles) {
        console.error('Error fetching profiles:', profilesError);
        throw new Error('Could not fetch user profiles');
      }

      const artistProfile = profiles.find(p => p.user_id === artistUserId);
      const venueProfile = profiles.find(p => p.user_id === venueUserId);

      const resendApiKey = Deno.env.get('RESEND_API_KEY');
      const resend = resendApiKey ? new Resend(resendApiKey) : null;

      const results = { artist: { email_sent: false, notification_created: false }, venue: { email_sent: false, notification_created: false } };

      // Send to artist (asking them to review the venue)
      if (artistProfile) {
        const { error: artistNotifError } = await supabase
          .from('notifications')
          .insert({
            user_id: artistUserId,
            title: `How was your gig at ${venueName}?`,
            message: `Your booking on ${formattedDate} is complete! Leave a review to help other artists.`,
            type: 'review_request',
            reference_id: booking_request_id,
            reference_type: 'booking_request',
          });
        results.artist.notification_created = !artistNotifError;

        if (resend && artistProfile.email_notifications_enabled !== false) {
          const artistHtml = generateReviewEmail(venueName, formattedDate, 'venue');
          const { error: emailError } = await resend.emails.send({
            from: 'OnTour <noreply@resend.dev>',
            to: [artistProfile.email],
            subject: `How was your gig at ${venueName}? Leave a review!`,
            html: artistHtml,
          });
          results.artist.email_sent = !emailError;
          if (emailError) console.error('Error sending artist review email:', emailError);
        }
      }

      // Send to venue (asking them to review the artist)
      if (venueProfile) {
        const { error: venueNotifError } = await supabase
          .from('notifications')
          .insert({
            user_id: venueUserId,
            title: `How was ${artistName}'s performance?`,
            message: `Your booking on ${formattedDate} is complete! Leave a review to help other venues.`,
            type: 'review_request',
            reference_id: booking_request_id,
            reference_type: 'booking_request',
          });
        results.venue.notification_created = !venueNotifError;

        if (resend && venueProfile.email_notifications_enabled !== false) {
          const venueHtml = generateReviewEmail(artistName, formattedDate, 'artist');
          const { error: emailError } = await resend.emails.send({
            from: 'OnTour <noreply@resend.dev>',
            to: [venueProfile.email],
            subject: `How was ${artistName}'s performance? Leave a review!`,
            html: venueHtml,
          });
          results.venue.email_sent = !emailError;
          if (emailError) console.error('Error sending venue review email:', emailError);
        }
      }

      console.log('Completed booking notification results:', results);
      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- STANDARD NOTIFICATION FLOW (for non-completed types) ---
    if (!sender_name || !recipient_user_id) {
      return new Response(
        JSON.stringify({ error: 'sender_name and recipient_user_id are required for this notification type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recipient's email and notification preferences from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, email_notifications_enabled')
      .eq('user_id', recipient_user_id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching recipient profile:', profileError);
      throw new Error('Recipient not found');
    }

    // Check if user has opted out of email notifications
    const emailOptedOut = profile.email_notifications_enabled === false;

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

    // Check if user has opted out of email notifications
    if (emailOptedOut) {
      console.log('User has opted out of email notifications, skipping email');
      return new Response(
        JSON.stringify({ success: true, email_sent: false, notification_created: true, reason: 'User opted out of email notifications' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email if Resend is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ success: true, email_sent: false, notification_created: true, reason: 'RESEND_API_KEY not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);

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

  } catch (error: unknown) {
    console.error('Error in send-booking-notification function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
