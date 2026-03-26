-- Function to sync legacy URLs to social_connections
CREATE OR REPLACE FUNCTION public.sync_legacy_social_urls()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  platforms text[] := ARRAY['spotify', 'instagram', 'soundcloud', 'tiktok'];
  p text;
  url_val text;
BEGIN
  FOREACH p IN ARRAY platforms LOOP
    CASE p
      WHEN 'spotify' THEN url_val := NEW.spotify_url;
      WHEN 'instagram' THEN url_val := NEW.instagram_url;
      WHEN 'soundcloud' THEN url_val := NEW.soundcloud_url;
      WHEN 'tiktok' THEN url_val := NEW.tiktok_url;
    END CASE;

    IF url_val IS NOT NULL AND url_val <> '' THEN
      INSERT INTO public.social_connections (artist_id, platform, profile_url, is_connected, connected_at)
      VALUES (NEW.id, p::social_platform, url_val, true, now())
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger on insert/update of artist social URLs
CREATE TRIGGER trg_sync_legacy_social_urls
  AFTER INSERT OR UPDATE OF spotify_url, instagram_url, soundcloud_url, tiktok_url
  ON public.artists
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_legacy_social_urls();

-- Add unique constraint to prevent duplicates per artist+platform
ALTER TABLE public.social_connections
  ADD CONSTRAINT social_connections_artist_platform_unique
  UNIQUE (artist_id, platform);