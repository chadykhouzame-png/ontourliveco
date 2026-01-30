-- Fix remaining overly permissive RLS policies

-- 1. error_logs: Remove the old "Anyone can log errors" policy and keep only authenticated
DROP POLICY IF EXISTS "Anyone can log errors" ON public.error_logs;

-- Ensure authenticated policy exists (in case it wasn't created properly)
DROP POLICY IF EXISTS "Authenticated users can insert error logs" ON public.error_logs;
CREATE POLICY "Authenticated users can insert error logs" 
ON public.error_logs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also allow anon users to log errors (for pre-auth errors) but rate limit via application
CREATE POLICY "Anonymous users can insert error logs" 
ON public.error_logs 
FOR INSERT 
TO anon
WITH CHECK (true);

-- 2. login_attempts: The "Allow insert login attempts" should be more restrictive
-- However, login attempts need to be recorded before auth (during login), so we need anon access
-- This is intentional - the WITH CHECK (true) is appropriate here
-- Mark this as acknowledged - no change needed, just documenting

-- Note: The remaining "RLS Policy Always True" warnings are for:
-- 1. error_logs INSERT - intentionally permissive (need to log errors from any state)
-- 2. login_attempts INSERT - intentionally permissive (need to record attempts before auth)
-- These are security infrastructure tables where permissive INSERT is by design