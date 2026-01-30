import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NotifyArtistsRequest {
  entertainment_request_id: string;
  venue_id: string;
  venue_name: string;
  requested_date: string;
  start_time: string;
  end_time?: string;
  budget_min?: number;
  budget_max?: number;
  description: string;
  preferred_genres: string[];
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: NotifyArtistsRequest = await req.json();
    console.log('Received notify-artists request:', body);

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

    // Find artists whose genres overlap with preferred_genres
    // AND who have travel dates that include the requested date and city (matching venue's city)
    const { data: venue } = await supabase
      .from('venues')
      .select('city')
      .eq('id', venue_id)
      .single();

    if (!venue) {
      throw new Error('Venue not found');
    }

    const venueCity = venue.city.toLowerCase();

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
      // Email sending logic will be added when RESEND_API_KEY is set up
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
  } catch (error: any) {
    console.error('Error in notify-artists function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
