-- Revoke SELECT permission on sensitive token columns from all roles
-- This prevents even the row owner from reading tokens via client queries
-- Tokens should only be accessed server-side via service role in edge functions

REVOKE SELECT (access_token, refresh_token, token_expires_at, platform_user_id) 
ON public.social_connections 
FROM authenticated, anon;

-- Add comment documenting the security decision
COMMENT ON TABLE public.social_connections IS 'Stores OAuth tokens for social media connections. Token columns (access_token, refresh_token, token_expires_at, platform_user_id) have SELECT revoked for authenticated/anon roles - only accessible via service role in edge functions.';

-- Also ensure the public view doesn't expose these columns (it already doesn't, but let's be explicit)
COMMENT ON VIEW public.social_connections_public IS 'Public view of social_connections that excludes sensitive OAuth tokens. Use this view for all client-side queries to display social connection information.';

-- Fix the overly permissive RLS policies flagged by the linter
-- First, let's see what policies have USING (true) for INSERT/UPDATE/DELETE

-- The error_logs table should only allow inserts from authenticated users
DROP POLICY IF EXISTS "Anyone can insert error logs" ON public.error_logs;
CREATE POLICY "Authenticated users can insert error logs" 
ON public.error_logs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Tighten the error logs delete policy if it exists (only service role should delete)
DROP POLICY IF EXISTS "Anyone can delete error logs" ON public.error_logs;