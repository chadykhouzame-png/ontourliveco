import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// ──────────────────────────────────────────
// Spotify: uses Client Credentials flow
// Requires SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET
// ──────────────────────────────────────────
async function fetchSpotifyStats(artistUrl: string): Promise<PlatformStats | null> {
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    console.log('Spotify credentials not configured, skipping');
    return null;
  }

  try {
    // Extract artist ID from URL like https://open.spotify.com/artist/XXXX
    const match = artistUrl.match(/artist\/([a-zA-Z0-9]+)/);
    if (!match) return null;
    const artistId = match[1];

    // Get access token via client credentials
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(`Spotify token error: ${JSON.stringify(tokenData)}`);

    // Fetch artist data
    const artistRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
    });
    const artistData = await artistRes.json();
    if (!artistRes.ok) throw new Error(`Spotify artist error: ${JSON.stringify(artistData)}`);

    return {
      follower_count: artistData.followers?.total ?? null,
      platform_username: artistData.name ?? null,
    };
  } catch (err) {
    console.error('Spotify sync error:', err);
    return null;
  }
}

// ──────────────────────────────────────────
// Instagram: uses Instagram Graph API / Basic Display API
// Requires INSTAGRAM_ACCESS_TOKEN (long-lived user token)
// ──────────────────────────────────────────
async function fetchInstagramStats(username: string): Promise<PlatformStats | null> {
  const accessToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN');
  if (!accessToken) {
    console.log('Instagram credentials not configured, skipping');
    return null;
  }

  try {
    // Fetch user profile using Graph API
    const res = await fetch(
      `https://graph.instagram.com/me?fields=id,username,media_count,followers_count&access_token=${accessToken}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(`Instagram API error: ${JSON.stringify(data)}`);

    // Fetch recent media for engagement calculation
    const mediaRes = await fetch(
      `https://graph.instagram.com/me/media?fields=id,like_count,comments_count,timestamp&limit=25&access_token=${accessToken}`
    );
    const mediaData = await mediaRes.json();

    let totalLikes = 0;
    let totalComments = 0;
    let postCount = 0;

    if (mediaData.data) {
      for (const post of mediaData.data) {
        totalLikes += post.like_count || 0;
        totalComments += post.comments_count || 0;
        postCount++;
      }
    }

    const avgLikes = postCount > 0 ? Math.round(totalLikes / postCount) : null;
    const avgComments = postCount > 0 ? Math.round(totalComments / postCount) : null;
    const engRate = data.followers_count && postCount > 0
      ? parseFloat(((totalLikes + totalComments) / postCount / data.followers_count * 100).toFixed(2))
      : null;

    return {
      follower_count: data.followers_count ?? null,
      likes_count: totalLikes || null,
      comments_count: totalComments || null,
      engagement_rate: engRate,
      avg_likes_per_post: avgLikes,
      avg_comments_per_post: avgComments,
      platform_username: data.username ?? username,
    };
  } catch (err) {
    console.error('Instagram sync error:', err);
    return null;
  }
}

// ──────────────────────────────────────────
// TikTok: uses TikTok Research / Display API
// Requires TIKTOK_ACCESS_TOKEN
// ──────────────────────────────────────────
async function fetchTikTokStats(username: string): Promise<PlatformStats | null> {
  const accessToken = Deno.env.get('TIKTOK_ACCESS_TOKEN');
  if (!accessToken) {
    console.log('TikTok credentials not configured, skipping');
    return null;
  }

  try {
    const res = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=follower_count,likes_count,video_count,display_name', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`TikTok API error: ${JSON.stringify(data)}`);

    const user = data.data?.user;
    if (!user) return null;

    const avgLikes = user.video_count > 0 ? Math.round(user.likes_count / user.video_count) : null;
    const engRate = user.follower_count > 0 && user.video_count > 0
      ? parseFloat((user.likes_count / user.video_count / user.follower_count * 100).toFixed(2))
      : null;

    return {
      follower_count: user.follower_count ?? null,
      likes_count: user.likes_count ?? null,
      engagement_rate: engRate,
      avg_likes_per_post: avgLikes,
      platform_username: user.display_name ?? username,
    };
  } catch (err) {
    console.error('TikTok sync error:', err);
    return null;
  }
}

// ──────────────────────────────────────────
// SoundCloud: uses public API (limited)
// Requires SOUNDCLOUD_CLIENT_ID
// ──────────────────────────────────────────
async function fetchSoundCloudStats(profileUrl: string): Promise<PlatformStats | null> {
  const clientId = Deno.env.get('SOUNDCLOUD_CLIENT_ID');
  if (!clientId) {
    console.log('SoundCloud credentials not configured, skipping');
    return null;
  }

  try {
    const resolveRes = await fetch(
      `https://api.soundcloud.com/resolve?url=${encodeURIComponent(profileUrl)}&client_id=${clientId}`
    );
    const userData = await resolveRes.json();
    if (!resolveRes.ok) throw new Error(`SoundCloud resolve error: ${JSON.stringify(userData)}`);

    return {
      follower_count: userData.followers_count ?? null,
      likes_count: userData.likes_count ?? null,
      platform_username: userData.username ?? null,
    };
  } catch (err) {
    console.error('SoundCloud sync error:', err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { artist_id } = await req.json();
    if (!artist_id) {
      return new Response(JSON.stringify({ error: 'artist_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user owns this artist
    const { data: artist } = await supabase
      .from('artists')
      .select('id, user_id, spotify_url, instagram_url, tiktok_url, soundcloud_url')
      .eq('id', artist_id)
      .single();

    if (!artist || artist.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch existing connections
    const { data: connections } = await supabase
      .from('social_connections')
      .select('*')
      .eq('artist_id', artist_id);

    const results: Record<string, { synced: boolean; error?: string }> = {};

    // Platform sync mapping
    const platformSyncers: Record<string, () => Promise<PlatformStats | null>> = {};

    if (artist.spotify_url || connections?.find(c => c.platform === 'spotify')) {
      const url = artist.spotify_url || connections?.find(c => c.platform === 'spotify')?.profile_url || '';
      platformSyncers.spotify = () => fetchSpotifyStats(url);
    }
    if (artist.instagram_url || connections?.find(c => c.platform === 'instagram')) {
      const username = connections?.find(c => c.platform === 'instagram')?.platform_username || '';
      platformSyncers.instagram = () => fetchInstagramStats(username);
    }
    if (artist.tiktok_url || connections?.find(c => c.platform === 'tiktok')) {
      const username = connections?.find(c => c.platform === 'tiktok')?.platform_username || '';
      platformSyncers.tiktok = () => fetchTikTokStats(username);
    }
    if (artist.soundcloud_url || connections?.find(c => c.platform === 'soundcloud')) {
      const url = artist.soundcloud_url || connections?.find(c => c.platform === 'soundcloud')?.profile_url || '';
      platformSyncers.soundcloud = () => fetchSoundCloudStats(url);
    }

    // Sync each platform
    for (const [platform, fetcher] of Object.entries(platformSyncers)) {
      const stats = await fetcher();
      if (stats) {
        // Upsert the connection
        const existing = connections?.find(c => c.platform === platform);
        if (existing) {
          await supabase
            .from('social_connections')
            .update({
              ...stats,
              is_connected: true,
              last_synced_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('social_connections')
            .insert({
              artist_id,
              platform,
              ...stats,
              is_connected: true,
              connected_at: new Date().toISOString(),
              last_synced_at: new Date().toISOString(),
            });
        }
        // Record a daily snapshot for growth history (one row per artist/platform/day)
        if (stats.follower_count != null) {
          await supabase
            .from('social_stats_snapshots')
            .upsert(
              {
                artist_id,
                platform,
                follower_count: stats.follower_count,
                engagement_rate: stats.engagement_rate ?? null,
              },
              { onConflict: 'artist_id,platform,snapshot_date' }
            );
        }

        results[platform] = { synced: true };
      } else {
        results[platform] = { synced: false, error: 'No credentials configured or API error' };
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Sync error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
