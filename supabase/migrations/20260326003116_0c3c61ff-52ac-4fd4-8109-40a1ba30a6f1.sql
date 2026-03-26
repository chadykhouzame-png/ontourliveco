ALTER TABLE public.social_connections
  ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shares_count integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS engagement_rate numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avg_likes_per_post integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avg_comments_per_post integer DEFAULT NULL;

-- Update the public view to include new columns
DROP VIEW IF EXISTS public.social_connections_public;
CREATE VIEW public.social_connections_public AS
  SELECT
    id, artist_id, platform, follower_count, is_connected,
    connected_at, last_synced_at, created_at, updated_at,
    platform_username, profile_url,
    likes_count, comments_count, shares_count,
    engagement_rate, avg_likes_per_post, avg_comments_per_post
  FROM public.social_connections;