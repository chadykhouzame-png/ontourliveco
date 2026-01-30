-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a more secure policy - allow insert via service role only (edge functions)
-- Users shouldn't be able to create arbitrary notifications
-- Edge functions use service_role key which bypasses RLS