import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all artists with social connections
    const { data: artists, error: artistsError } = await supabase
      .from('social_connections')
      .select('artist_id')
      .eq('is_connected', true);

    if (artistsError) throw artistsError;

    const uniqueArtistIds = [...new Set((artists || []).map(a => a.artist_id))];
    console.log(`Syncing social stats for ${uniqueArtistIds.length} artists`);

    let successCount = 0;
    let errorCount = 0;

    for (const artistId of uniqueArtistIds) {
      try {
        // Call the existing sync function internally via service role
        const { data: artist } = await supabase
          .from('artists')
          .select('id, spotify_url, instagram_url, tiktok_url, soundcloud_url')
          .eq('id', artistId)
          .single();

        if (!artist) continue;

        const { data: connections } = await supabase
          .from('social_connections')
          .select('*')
          .eq('artist_id', artistId);

        // Sync Spotify
        const spotifyConn = connections?.find(c => c.platform === 'spotify');
        const spotifyUrl = artist.spotify_url || spotifyConn?.profile_url;
        if (spotifyUrl) {
          const stats = await fetchSpotifyStats(spotifyUrl);
          if (stats && spotifyConn) {
            await supabase.from('social_connections').update({
              ...stats,
              last_synced_at: new Date().toISOString(),
            }).eq('id', spotifyConn.id);
          }
        }

        // Sync SoundCloud
        const scConn = connections?.find(c => c.platform === 'soundcloud');
        const scUrl = artist.soundcloud_url || scConn?.profile_url;
        if (scUrl) {
          const stats = await fetchSoundCloudStats(scUrl);
          if (stats && scConn) {
            await supabase.from('social_connections').update({
              ...stats,
              last_synced_at: new Date().toISOString(),
            }).eq('id', scConn.id);
          }
        }

        successCount++;
      } catch (err) {
        console.error(`Failed to sync artist ${artistId}:`, err);
        errorCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      synced: successCount,
      errors: errorCount,
      total: uniqueArtistIds.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Batch sync error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// --- Platform fetchers (duplicated to keep edge function self-contained) ---

interface PlatformStats {
  follower_count?: number | null;
  likes_count?: number | null;
  comments_count?: number | null;
  shares_count?: number | null;
  engagement_rate?: number | null;
  avg_likes_per_post?: number | null;
  avg_comments_per_post?: number | null;
  platform_username?: string | null;
}

async function fetchSpotifyStats(artistUrl: string): Promise<PlatformStats | null> {
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  try {
    const match = artistUrl.match(/artist\/([a-zA-Z0-9]+)/);
    if (!match) return null;

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) return null;

    const artistRes = await fetch(`https://api.spotify.com/v1/artists/${match[1]}`, {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });
    const artistData = await artistRes.json();
    if (!artistRes.ok) return null;

    return {
      follower_count: artistData.followers?.total ?? null,
      platform_username: artistData.name ?? null,
    };
  } catch { return null; }
}

async function fetchSoundCloudStats(profileUrl: string): Promise<PlatformStats | null> {
  const clientId = Deno.env.get('SOUNDCLOUD_CLIENT_ID');
  if (!clientId) return null;

  try {
    const res = await fetch(
      `https://api.soundcloud.com/resolve?url=${encodeURIComponent(profileUrl)}&client_id=${clientId}`
    );
    const data = await res.json();
    if (!res.ok) return null;

    return {
      follower_count: data.followers_count ?? null,
      likes_count: data.likes_count ?? null,
      platform_username: data.username ?? null,
    };
  } catch { return null; }
}
