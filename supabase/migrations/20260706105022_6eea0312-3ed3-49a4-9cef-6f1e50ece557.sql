
-- error_logs: scope writes so users can only insert their own (or unattributed) logs
DROP POLICY IF EXISTS "Anonymous users can insert error logs" ON public.error_logs;
DROP POLICY IF EXISTS "Authenticated users can insert error logs" ON public.error_logs;

CREATE POLICY "Anonymous users can insert unattributed error logs"
ON public.error_logs
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

CREATE POLICY "Authenticated users can insert their own error logs"
ON public.error_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- login_attempts: remove permissive public insert; only SECURITY DEFINER function record_login_attempt writes
DROP POLICY IF EXISTS "Allow insert login attempts" ON public.login_attempts;

-- profile_views: scope viewer_id to auth.uid() (or null for anon)
DROP POLICY IF EXISTS "Anyone can record profile views" ON public.profile_views;

CREATE POLICY "Anonymous can record anonymous profile views"
ON public.profile_views
FOR INSERT
TO anon
WITH CHECK (viewer_id IS NULL);

CREATE POLICY "Authenticated can record their own profile views"
ON public.profile_views
FOR INSERT
TO authenticated
WITH CHECK (viewer_id IS NULL OR viewer_id = auth.uid());
