
-- 1. Restrict sensitive columns on artists
REVOKE SELECT (stripe_account_id, mobile) ON public.artists FROM anon, authenticated;

-- 2. Drop unused SECURITY DEFINER helper
DROP FUNCTION IF EXISTS public.get_my_stripe_account_id();

-- 3. Lock down SECURITY DEFINER execute privileges to only what's needed
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_conversation_last_message() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_error_logs() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_rate_limits() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_artist_rating() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_venue_rating() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_legacy_social_urls() FROM anon, authenticated, PUBLIC;

-- Login flow helpers: keep anon+authenticated (required pre-auth); no change

-- RLS helpers: authenticated needs EXECUTE; explicitly revoke anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_owns_artist(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_owns_venue(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_in_conversation(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_artist_mobile() FROM anon, PUBLIC;

-- 4. Message attachments: enforce path ownership on upload
DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
CREATE POLICY "Users can upload message attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
