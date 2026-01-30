import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Allowed genre values (must match database enum)
const ALLOWED_GENRES = [
  'house', 'techno', 'disco', 'hip_hop', 'rnb', 'afrobeats', 'amapiano',
  'latin', 'pop', 'rock', 'jazz', 'soul', 'funk', 'drum_and_bass',
  'uk_garage', 'reggae', 'dancehall', 'other'
] as const;

// Time format regex (HH:MM or HH:MM:SS, 12h or 24h)
const TIME_REGEX = /^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?(\s?[AaPp][Mm])?$/;

// Dangerous patterns that could indicate injection attempts
const DANGEROUS_PATTERNS = [
  /[<>]/g,                    // HTML injection
  /['";]/g,                   // Quote injection (extra safety)
  /--/g,                      // SQL comment
  /\/\*/g,                    // SQL block comment
  /\bor\b.*=/i,               // SQL OR injection
  /\band\b.*=/i,              // SQL AND injection
  /\bunion\b/i,               // SQL UNION
  /\bdrop\b/i,                // SQL DROP
  /\bdelete\b/i,              // SQL DELETE
  /\binsert\b/i,              // SQL INSERT
  /\bupdate\b.*\bset\b/i,     // SQL UPDATE
  /\bexec\b/i,                // SQL EXEC
  /\bexecute\b/i,             // SQL EXECUTE
];

// Sanitize string to remove dangerous patterns
function sanitizeString(input: string): string {
  let sanitized = input.trim();
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  return sanitized;
}

// Validate date is not in the past
function isValidFutureDate(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

// Input validation schema with strict rules
const NotifyArtistsSchema = z.object({
  entertainment_request_id: z.string().uuid({ message: 'Invalid entertainment request ID format' }),
  venue_id: z.string().uuid({ message: 'Invalid venue ID format' }),
  venue_name: z.string()
    .min(1, 'Venue name is required')
    .max(200, 'Venue name must be less than 200 characters')
    .transform(sanitizeString),
  requested_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(isValidFutureDate, 'Requested date cannot be in the past'),
  start_time: z.string()
    .min(1, 'Start time is required')
    .max(20, 'Invalid time format')
    .regex(TIME_REGEX, 'Invalid time format (use HH:MM)'),
  end_time: z.string()
    .max(20, 'Invalid time format')
    .regex(TIME_REGEX, 'Invalid time format (use HH:MM)')
    .optional()
    .or(z.literal('')),
  budget_min: z.number()
    .positive('Minimum budget must be positive')
    .max(1000000, 'Budget exceeds maximum allowed')
    .optional(),
  budget_max: z.number()
    .positive('Maximum budget must be positive')
    .max(1000000, 'Budget exceeds maximum allowed')
    .optional(),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .transform(sanitizeString),
  preferred_genres: z.array(z.enum(ALLOWED_GENRES))
    .min(1, 'At least one genre must be selected')
    .max(18, 'Too many genres selected'),
}).refine(
  (data) => {
    // Validate budget_max >= budget_min when both provided
    if (data.budget_min && data.budget_max) {
      return data.budget_max >= data.budget_min;
    }
    return true;
  },
  { message: 'Maximum budget must be greater than or equal to minimum budget', path: ['budget_max'] }
);

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
    const parseResult = NotifyArtistsSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      console.error('Input validation failed:', parseResult.error.errors);
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parseResult.error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = parseResult.data;
    console.log('Validated notify-artists request:', body);

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      entertainment_request_id,
      venue_id,
      venue_name,
      requested_date,
      start_time,
      end_time,
      budget_min,
      budget_max,
      description,
      preferred_genres,
    } = body;

    // --- AUTHORIZATION: Verify user owns this venue ---
    const { data: userVenue, error: venueAuthError } = await supabase
      .from('venues')
      .select('id, city')
      .eq('id', venue_id)
      .eq('user_id', userId)
      .single();

    if (venueAuthError || !userVenue) {
      console.error('Authorization failed - user does not own venue:', venueAuthError);
      return new Response(
        JSON.stringify({ error: 'Forbidden - You can only notify artists for your own venue' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const venueCity = userVenue.city.toLowerCase();

    // Format the date for display
    const formattedDate = new Date(requested_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Format time range
    const timeRange = end_time ? `${start_time} - ${end_time}` : `Starting at ${start_time}`;

    // Format budget
    let budgetText = '';
    if (budget_min && budget_max) {
      budgetText = `$${budget_min} - $${budget_max}`;
    } else if (budget_min) {
      budgetText = `From $${budget_min}`;
    } else if (budget_max) {
      budgetText = `Up to $${budget_max}`;
    }

    // Get all artists with matching genres
    const { data: matchingArtists, error: artistsError } = await supabase
      .from('artists')
      .select('id, user_id, artist_name, genres')
      .filter('genres', 'ov', `{${preferred_genres.join(',')}}`);

    if (artistsError) {
      console.error('Error fetching artists:', artistsError);
      throw artistsError;
    }

    console.log(`Found ${matchingArtists?.length || 0} artists with matching genres`);

    if (!matchingArtists || matchingArtists.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified_count: 0, message: 'No artists match the preferred genres' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check which artists are available on the requested date in the venue's city
    const artistIds = matchingArtists.map(a => a.id);
    
    const { data: availableTravelDates, error: travelError } = await supabase
      .from('travel_dates')
      .select('artist_id')
      .in('artist_id', artistIds)
      .lte('start_date', requested_date)
      .gte('end_date', requested_date)
      .eq('is_available', true)
      .ilike('city', `%${venueCity}%`);

    if (travelError) {
      console.error('Error fetching travel dates:', travelError);
    }

    // Also include artists whose primary city matches
    const { data: localArtists } = await supabase
      .from('artists')
      .select('id')
      .in('id', artistIds)
      .ilike('primary_city', `%${venueCity}%`);

    // Combine available traveling artists and local artists
    const travelingArtistIds = new Set((availableTravelDates || []).map(td => td.artist_id));
    const localArtistIds = new Set((localArtists || []).map(a => a.id));
    
    const availableArtistIds = new Set([...travelingArtistIds, ...localArtistIds]);
    
    const artistsToNotify = matchingArtists.filter(a => availableArtistIds.has(a.id));
    
    console.log(`${artistsToNotify.length} artists are available in ${venueCity} on ${requested_date}`);

    if (artistsToNotify.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified_count: 0, message: 'No artists available in the venue city on the requested date' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notifications for each matching artist
    const notifications = artistsToNotify.map(artist => ({
      user_id: artist.user_id,
      title: `${venue_name} is looking for an artist!`,
      message: `${venue_name} needs entertainment on ${formattedDate} (${timeRange})${budgetText ? ` • Budget: ${budgetText}` : ''}. ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
      type: 'entertainment_request',
      reference_id: entertainment_request_id,
      reference_type: 'entertainment_request',
    }));

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notificationError) {
      console.error('Error creating notifications:', notificationError);
      throw notificationError;
    }

    console.log(`Successfully created ${notifications.length} notifications`);

    // TODO: Add email notifications when RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      console.log('Email notifications would be sent here (Resend API key configured)');
    } else {
      console.log('Skipping email notifications - RESEND_API_KEY not configured');
    }

    return new Response(
      JSON.stringify({
        success: true,
        notified_count: artistsToNotify.length,
        message: `Notified ${artistsToNotify.length} genre-matched artists`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in notify-artists function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
