
-- 1) Fix privilege escalation: restrict user_roles self-insert
DROP POLICY IF EXISTS "Users can insert their own role during signup" ON public.user_roles;
CREATE POLICY "Users can insert their own non-admin role during signup"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role IN ('artist'::app_role, 'venue'::app_role)
  );

-- 2) Restrict sensitive columns on artists via column-level privileges
REVOKE SELECT (mobile, stripe_account_id) ON public.artists FROM anon;
REVOKE SELECT (mobile, stripe_account_id) ON public.artists FROM authenticated;

-- Helper for owner to read their own mobile (used by edit-profile UI)
CREATE OR REPLACE FUNCTION public.get_my_artist_mobile()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.mobile FROM public.artists a
  WHERE a.user_id = auth.uid()
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_artist_mobile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_artist_mobile() TO authenticated;

-- 3) SECURITY DEFINER view fix: make view honor caller's RLS
ALTER VIEW public.social_connections_public SET (security_invoker = on);

-- 4) Tighten EXECUTE on internal SECURITY DEFINER helpers
-- Cleanup helpers are admin/cron-only
REVOKE EXECUTE ON FUNCTION public.cleanup_old_error_logs() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM PUBLIC, anon, authenticated;

-- These are trigger functions — no user should call directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_legacy_social_urls() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_artist_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_venue_rating() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_conversation_last_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Auth-only helpers used by policies/app logic: keep for authenticated, remove anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_artist(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_owns_venue(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_in_conversation(uuid) FROM PUBLIC, anon;

-- Lockout/rate-limit RPCs must remain callable during sign-in (anon)
-- record_login_attempt and check_account_lockout stay public.

-- 5) Storage: artist-media ownership checks
DROP POLICY IF EXISTS "Authenticated users can upload artist media" ON storage.objects;
CREATE POLICY "Artists can upload media to their own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'artist-media'
    AND EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own artist media" ON storage.objects;
CREATE POLICY "Artists can delete media from their own folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'artist-media'
    AND EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND a.user_id = auth.uid()
    )
  );

-- 6) Public buckets: keep files public via CDN URLs, but disable API listing
-- Public URLs continue to work because the buckets are public; these policies
-- only controlled `list`/`select` through the API.
DROP POLICY IF EXISTS "Profile images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view artist media files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view message attachments" ON storage.objects;
