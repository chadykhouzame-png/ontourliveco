import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// On Tour Live brand colors (from index.css design system)
const brand = {
  bg: '#ffffff',              // White email body (email best practice)
  cardBg: '#0a0a0a',         // Dark card background
  cardBorder: '#1f1f23',     // Subtle border
  primary: '#c9a88c',        // Rose/blush primary: hsl(15, 30%, 75%)
  primaryDark: '#b8926e',    // Slightly deeper for hover
  foreground: '#ddd5cd',     // hsl(15, 20%, 85%)
  muted: '#8a7f77',          // hsl(15, 10%, 50%)
  mutedDark: '#3d3d3d',      // Footer text
  accent: '#e87c6a',         // Warm accent for highlights
  success: '#22c55e',        // Green for accepted
  warning: '#f59e0b',        // Amber for counter-offers
  info: '#0ea5e9',           // Sky blue for new offers
  artistPink: '#d94f7a',     // hsl(350, 45%, 55%)
  venuePurple: '#9966cc',    // hsl(280, 30%, 50%)
};

function emailShell(content: string, supabaseUrl: string): string {
  const appUrl = supabaseUrl.replace('.supabase.co', '.lovableproject.com');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>On Tour Live</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${brand.bg}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Card -->
    <div style="background-color: ${brand.cardBg}; border-radius: 20px; overflow: hidden; border: 1px solid ${brand.cardBorder};">
      
      <!-- Header with logo -->
      <div style="padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid ${brand.cardBorder};">
        <div style="display: inline-block; margin-bottom: 4px;">
          <span style="font-size: 32px; font-weight: 900; letter-spacing: -0.04em; line-height: 1;">
            <span style="color: ${brand.primary};">ON</span><span style="color: #ffffff;">TOUR</span>
          </span>
        </div>
        <div style="font-size: 11px; letter-spacing: 0.2em; color: ${brand.muted}; text-transform: uppercase; margin-top: 2px;">Live Entertainment</div>
      </div>

      <!-- Content -->
      <div style="padding: 36px 40px;">
        ${content}
      </div>

      <!-- Footer -->
      <div style="padding: 24px 40px; border-top: 1px solid ${brand.cardBorder}; text-align: center;">
        <p style="color: ${brand.mutedDark}; font-size: 13px; margin: 0 0 8px; line-height: 1.5;">
          You're receiving this because you have an account on
          <a href="${appUrl}" style="color: ${brand.primary}; text-decoration: none;">On Tour Live</a>.
        </p>
        <p style="color: ${brand.mutedDark}; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} On Tour Live. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function ctaButton(text: string, url: string, color: string = brand.primary): string {
  return `<div style="text-align: center; margin-top: 28px;">
    <a href="${url}" style="display: inline-block; background-color: ${color}; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 14px; font-weight: 600; font-size: 15px; letter-spacing: 0.01em; min-width: 180px;">
      ${text}
    </a>
  </div>`;
}

function amountBadge(label: string, amount: number, color: string): string {
  return `<div style="background-color: ${color}15; border: 1px solid ${color}30; border-radius: 14px; padding: 16px 20px; margin: 16px 0; text-align: center;">
    <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: ${brand.muted}; margin-bottom: 6px;">${label}</div>
    <div style="font-size: 28px; font-weight: 800; color: ${color}; letter-spacing: -0.02em;">$${amount.toLocaleString()}</div>
  </div>`;
}

function dateBadge(formattedDate: string): string {
  return `<div style="display: inline-block; background-color: #1a1a1e; border: 1px solid ${brand.cardBorder}; border-radius: 10px; padding: 8px 16px; margin: 8px 0;">
    <span style="font-size: 13px; color: ${brand.muted};">📅</span>
    <span style="font-size: 14px; color: ${brand.foreground}; font-weight: 500; margin-left: 6px;">${formattedDate}</span>
  </div>`;
}

function generateBookingEmailContent(
  type: string,
  senderName: string,
  formattedDate: string,
  offerAmount?: number,
  counterOffer?: number,
  message?: string,
  appUrl?: string,
  extra?: { artistName?: string; venueName?: string; bookingId?: string; agreedAmount?: number },
): { subject: string; content: string } {
  const url = appUrl || '#';
  
  switch (type) {
    case 'new_offer': {
      const content = `
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 40px; margin-bottom: 12px;">🎵</div>
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 6px; letter-spacing: -0.02em;">New Booking Request</h1>
          <p style="color: ${brand.muted}; font-size: 15px; margin: 0;">from <strong style="color: ${brand.foreground};">${senderName}</strong></p>
        </div>
        
        ${dateBadge(formattedDate)}
        ${offerAmount ? amountBadge('Offer Amount', offerAmount, brand.info) : ''}
        ${message ? `<div style="margin: 16px 0; padding: 16px; background: #1a1a1e; border-radius: 12px; border-left: 3px solid ${brand.primary};"><p style="color: ${brand.foreground}; font-size: 14px; font-style: italic; margin: 0; line-height: 1.6;">"${message}"</p></div>` : ''}
        
        <p style="color: ${brand.muted}; font-size: 14px; text-align: center; line-height: 1.6; margin-top: 20px;">
          Head to your dashboard to accept, decline, or send a counter-offer.
        </p>
        ${ctaButton('View Request', url)}
      `;
      return { subject: `New Booking Request from ${senderName}`, content };
    }

    case 'counter_offer': {
      const content = `
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 40px; margin-bottom: 12px;">💰</div>
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 6px; letter-spacing: -0.02em;">Counter-Offer Received</h1>
          <p style="color: ${brand.muted}; font-size: 15px; margin: 0;">from <strong style="color: ${brand.foreground};">${senderName}</strong></p>
        </div>
        
        ${dateBadge(formattedDate)}
        
        <div style="display: flex; gap: 12px; margin: 16px 0;">
          ${offerAmount ? `<div style="flex: 1; background-color: #1a1a1e; border-radius: 14px; padding: 14px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: ${brand.muted}; margin-bottom: 4px;">Your Offer</div>
            <div style="font-size: 20px; font-weight: 700; color: ${brand.muted}; text-decoration: line-through;">$${offerAmount.toLocaleString()}</div>
          </div>` : ''}
          ${counterOffer ? `<div style="flex: 1; background-color: ${brand.warning}12; border: 1px solid ${brand.warning}30; border-radius: 14px; padding: 14px; text-align: center;">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: ${brand.warning}; margin-bottom: 4px;">Counter-Offer</div>
            <div style="font-size: 20px; font-weight: 700; color: ${brand.warning};">$${counterOffer.toLocaleString()}</div>
          </div>` : ''}
        </div>
        
        <p style="color: ${brand.muted}; font-size: 14px; text-align: center; line-height: 1.6; margin-top: 20px;">
          Review the counter-offer and respond on your dashboard.
        </p>
        ${ctaButton('Review Counter-Offer', url, brand.warning)}
      `;
      return { subject: `Counter-Offer from ${senderName}`, content };
    }

    case 'accepted': {
      const aName = extra?.artistName || senderName;
      const vName = extra?.venueName || '';
      const agreed = extra?.agreedAmount || counterOffer || offerAmount;
      const refId = extra?.bookingId ? extra.bookingId.substring(0, 8).toUpperCase() : '';

      const content = `
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
          <h1 style="color: ${brand.success}; font-size: 24px; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.03em;">Booking Confirmed!</h1>
          <p style="color: ${brand.muted}; font-size: 14px; margin: 0;">It's official — you're booked.</p>
        </div>

        ${refId ? `<div style="text-align: center; margin-bottom: 20px;">
          <span style="display: inline-block; background: #1a1a1e; border: 1px solid ${brand.cardBorder}; border-radius: 8px; padding: 6px 14px; font-size: 12px; letter-spacing: 0.12em; color: ${brand.muted}; font-family: monospace;">REF #${refId}</span>
        </div>` : ''}

        <!-- Booking details card -->
        <div style="background: #111114; border: 1px solid ${brand.cardBorder}; border-radius: 16px; overflow: hidden; margin-bottom: 20px;">
          <!-- Artist row -->
          <div style="padding: 16px 20px; border-bottom: 1px solid ${brand.cardBorder}; display: flex; align-items: center;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: ${brand.artistPink}20; display: flex; align-items: center; justify-content: center; margin-right: 14px;">
              <span style="font-size: 16px;">🎤</span>
            </div>
            <div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: ${brand.muted}; margin-bottom: 2px;">Artist</div>
              <div style="font-size: 15px; font-weight: 600; color: ${brand.foreground};">${aName}</div>
            </div>
          </div>

          ${vName ? `<!-- Venue row -->
          <div style="padding: 16px 20px; border-bottom: 1px solid ${brand.cardBorder}; display: flex; align-items: center;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: ${brand.venuePurple}20; display: flex; align-items: center; justify-content: center; margin-right: 14px;">
              <span style="font-size: 16px;">🏠</span>
            </div>
            <div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: ${brand.muted}; margin-bottom: 2px;">Venue</div>
              <div style="font-size: 15px; font-weight: 600; color: ${brand.foreground};">${vName}</div>
            </div>
          </div>` : ''}

          <!-- Date row -->
          <div style="padding: 16px 20px;${agreed ? ` border-bottom: 1px solid ${brand.cardBorder};` : ''} display: flex; align-items: center;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: ${brand.primary}20; display: flex; align-items: center; justify-content: center; margin-right: 14px;">
              <span style="font-size: 16px;">📅</span>
            </div>
            <div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: ${brand.muted}; margin-bottom: 2px;">Date</div>
              <div style="font-size: 15px; font-weight: 600; color: ${brand.foreground};">${formattedDate}</div>
            </div>
          </div>

          ${agreed ? `<!-- Agreed fee row -->
          <div style="padding: 16px 20px; display: flex; align-items: center;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: ${brand.success}20; display: flex; align-items: center; justify-content: center; margin-right: 14px;">
              <span style="font-size: 16px;">💵</span>
            </div>
            <div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: ${brand.muted}; margin-bottom: 2px;">Agreed Fee</div>
              <div style="font-size: 20px; font-weight: 800; color: ${brand.success}; letter-spacing: -0.02em;">$${agreed.toLocaleString()}</div>
            </div>
          </div>` : ''}
        </div>

        <!-- Success banner -->
        <div style="background: ${brand.success}10; border: 1px solid ${brand.success}25; border-radius: 14px; padding: 16px 20px; text-align: center; margin-bottom: 8px;">
          <p style="color: ${brand.foreground}; font-size: 14px; margin: 0; line-height: 1.6;">
            ✅ Both parties have been notified. Head to your dashboard for full details and next steps.
          </p>
        </div>

        ${ctaButton('View Booking Details', url, brand.success)}
      `;
      return { subject: `🎉 Booking Confirmed — ${aName} × ${vName || 'Your Venue'}`, content };
    }

    case 'declined': {
      const content = `
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 40px; margin-bottom: 12px;">📋</div>
          <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 6px; letter-spacing: -0.02em;">Booking Update</h1>
          <p style="color: ${brand.muted}; font-size: 15px; margin: 0;">from <strong style="color: ${brand.foreground};">${senderName}</strong></p>
        </div>
        
        ${dateBadge(formattedDate)}
        
        <div style="margin: 20px 0; padding: 20px; background: #1a1a1e; border-radius: 14px; text-align: center;">
          <p style="color: ${brand.foreground}; font-size: 15px; margin: 0 0 8px; line-height: 1.6;">
            ${senderName} was unable to accept this booking request.
          </p>
          <p style="color: ${brand.muted}; font-size: 14px; margin: 0; line-height: 1.6;">
            Don't worry — keep exploring to find the perfect match!
          </p>
        </div>
        ${ctaButton('Browse Artists', url, brand.primary)}
      `;
      return { subject: `Booking Update from ${senderName}`, content };
    }

    default:
      return { subject: 'Booking Update', content: '<p style="color: #ffffff;">You have a booking update. Check your dashboard for details.</p>' };
  }
}

function generateReviewEmailContent(
  revieweeName: string,
  formattedDate: string,
  revieweeType: 'artist' | 'venue',
  appUrl: string,
): string {
  const isArtist = revieweeType === 'artist';
  const accentColor = isArtist ? brand.artistPink : brand.venuePurple;
  
  return `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 40px; margin-bottom: 12px;">⭐</div>
      <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 6px; letter-spacing: -0.02em;">
        ${isArtist ? `How was ${revieweeName}'s performance?` : `How was your gig at ${revieweeName}?`}
      </h1>
    </div>
    
    ${dateBadge(formattedDate)}
    
    <div style="margin: 20px 0; padding: 20px; background: ${accentColor}10; border: 1px solid ${accentColor}25; border-radius: 14px; text-align: center;">
      <p style="color: ${brand.foreground}; font-size: 15px; margin: 0; line-height: 1.6;">
        ${isArtist 
          ? 'Your feedback helps other venues make better booking decisions.' 
          : 'Your feedback helps other artists know what to expect.'}
      </p>
    </div>

    <div style="text-align: center; margin: 20px 0;">
      <span style="font-size: 28px; letter-spacing: 4px;">★★★★★</span>
    </div>
    
    ${ctaButton('Leave a Review', appUrl, accentColor)}
  `;
}

// Input validation schema
const BookingNotificationSchema = z.object({
  type: z.enum(['new_offer', 'counter_offer', 'accepted', 'declined', 'completed']),
  booking_request_id: z.string().uuid(),
  sender_name: z.string().min(1).max(200).optional(),
  recipient_user_id: z.string().uuid().optional(),
  requested_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  offer_amount: z.number().positive().optional(),
  counter_offer: z.number().positive().optional(),
  message: z.string().max(2000).optional(),
});

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const appUrl = supabaseUrl.replace('.supabase.co', '.lovableproject.com');

    // --- JWT AUTHENTICATION ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    
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

    const formattedDate = new Date(requested_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // --- HANDLE COMPLETED TYPE (sends to both parties) ---
    if (type === 'completed') {
      console.log('Processing completed booking notification - sending to both parties');
      
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

      // Send to artist (review the venue)
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
          const reviewContent = generateReviewEmailContent(venueName, formattedDate, 'venue', appUrl);
          const html = emailShell(reviewContent, supabaseUrl);
          const { error: emailError } = await resend.emails.send({
            from: 'On Tour <noreply@ontourlive.co>',
            to: [artistProfile.email],
            subject: `How was your gig at ${venueName}? Leave a review!`,
            html,
          });
          results.artist.email_sent = !emailError;
          if (emailError) console.error('Error sending artist review email:', emailError);
        }
      }

      // Send to venue (review the artist)
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
          const reviewContent = generateReviewEmailContent(artistName, formattedDate, 'artist', appUrl);
          const html = emailShell(reviewContent, supabaseUrl);
          const { error: emailError } = await resend.emails.send({
            from: 'On Tour <noreply@ontourlive.co>',
            to: [venueProfile.email],
            subject: `How was ${artistName}'s performance? Leave a review!`,
            html,
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

    // --- STANDARD NOTIFICATION FLOW ---
    if (!sender_name || !recipient_user_id) {
      return new Response(
        JSON.stringify({ error: 'sender_name and recipient_user_id are required for this notification type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, email_notifications_enabled')
      .eq('user_id', recipient_user_id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching recipient profile:', profileError);
      throw new Error('Recipient not found');
    }

    const emailOptedOut = profile.email_notifications_enabled === false;

    // Build notification
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

    if (emailOptedOut) {
      console.log('User has opted out of email notifications, skipping email');
      return new Response(
        JSON.stringify({ success: true, email_sent: false, notification_created: true, reason: 'User opted out of email notifications' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping email');
      return new Response(
        JSON.stringify({ success: true, email_sent: false, notification_created: true, reason: 'RESEND_API_KEY not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);

    const extraContext = type === 'accepted' ? {
      artistName: artistName,
      venueName: venueName,
      bookingId: booking_request_id,
      agreedAmount: booking.counter_offer || booking.offer_amount || offer_amount,
    } : undefined;

    // Fetch booking amounts for accepted confirmation
    let bookingAmounts = { counter_offer: counter_offer, offer_amount: offer_amount };
    if (type === 'accepted' && extraContext) {
      const { data: fullBooking } = await supabase
        .from('booking_requests')
        .select('offer_amount, counter_offer')
        .eq('id', booking_request_id)
        .single();
      if (fullBooking) {
        extraContext.agreedAmount = fullBooking.counter_offer || fullBooking.offer_amount || offer_amount;
      }
    }

    const { subject, content } = generateBookingEmailContent(
      type, sender_name, formattedDate, offer_amount, counter_offer, message, appUrl, extraContext
    );
    const html = emailShell(content, supabaseUrl);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'On Tour <noreply@ontourlive.co>',
      to: [profile.email],
      subject,
      html,
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
