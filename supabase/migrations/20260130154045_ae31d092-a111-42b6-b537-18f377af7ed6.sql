-- Drop existing view and recreate with security_invoker
DROP VIEW IF EXISTS public.social_connections_public;

CREATE VIEW public.social_connections_public
WITH (security_invoker = on) AS
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

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.social_connections_public TO authenticated, anon;

-- Update the base table RLS policies to restrict SELECT access
-- First, drop the existing overly permissive policy if it exists
DROP POLICY IF EXISTS "Artists can view their own social connections" ON public.social_connections;

-- Create a restrictive SELECT policy - only the artist who owns the connection can see it directly
-- This protects the tokens from being exposed
CREATE POLICY "Artists can view their own social connections"
ON public.social_connections
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.artists
    WHERE artists.id = social_connections.artist_id
    AND artists.user_id = auth.uid()
  )
);

-- Add a comment explaining the security model
COMMENT ON VIEW public.social_connections_public IS 'Public view of social connections that excludes sensitive OAuth tokens. Use this view for all public-facing queries.';