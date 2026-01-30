-- Drop the problematic policy that exposes access_token and refresh_token
DROP POLICY IF EXISTS "Anyone can view connected social stats" ON public.social_connections;

-- Create a secure view that only exposes non-sensitive columns
CREATE OR REPLACE VIEW public.social_connections_public AS
SELECT 
  id,
  artist_id,
  platform,
  platform_username,
  profile_url,
  follower_count,
  is_connected,
  connected_at,
  last_synced_at,
  created_at,
  updated_at
FROM public.social_connections
WHERE is_connected = true;

-- Grant read access to the secure view for all users
GRANT SELECT ON public.social_connections_public TO anon, authenticated;