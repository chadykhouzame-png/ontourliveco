-- Recreate the view with explicit SECURITY INVOKER to satisfy the linter
-- This ensures RLS policies of the querying user are enforced
DROP VIEW IF EXISTS public.social_connections_public;

CREATE VIEW public.social_connections_public 
WITH (security_invoker = true) AS
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