-- Create table to track login attempts
CREATE TABLE public.login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT false
);

-- Create index for faster lookups
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts (email, attempted_at DESC);
CREATE INDEX idx_login_attempts_ip_time ON public.login_attempts (ip_address, attempted_at DESC) WHERE ip_address IS NOT NULL;

-- Enable RLS but allow inserts from anon (for tracking) 
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert login attempts (needed for tracking before auth)
CREATE POLICY "Allow insert login attempts"
ON public.login_attempts FOR INSERT
WITH CHECK (true);

-- Only service role can read/delete (cleanup)
CREATE POLICY "Service role can manage login attempts"
ON public.login_attempts FOR ALL
USING (auth.role() = 'service_role');

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION public.check_account_lockout(
  p_email TEXT,
  p_max_attempts INTEGER DEFAULT 5,
  p_lockout_minutes INTEGER DEFAULT 15
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_count INTEGER;
  lockout_until TIMESTAMP WITH TIME ZONE;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate window start time
  window_start := NOW() - (p_lockout_minutes || ' minutes')::INTERVAL;
  
  -- Count failed attempts in the window
  SELECT COUNT(*) INTO failed_count
  FROM public.login_attempts
  WHERE email = LOWER(p_email)
    AND attempted_at > window_start
    AND success = false;
  
  -- Check if locked
  IF failed_count >= p_max_attempts THEN
    -- Find when lockout expires (lockout_minutes after the oldest counted attempt)
    SELECT attempted_at + (p_lockout_minutes || ' minutes')::INTERVAL INTO lockout_until
    FROM public.login_attempts
    WHERE email = LOWER(p_email)
      AND attempted_at > window_start
      AND success = false
    ORDER BY attempted_at ASC
    LIMIT 1;
    
    RETURN json_build_object(
      'locked', true,
      'remaining_attempts', 0,
      'lockout_until', lockout_until,
      'minutes_remaining', EXTRACT(EPOCH FROM (lockout_until - NOW())) / 60
    );
  END IF;
  
  RETURN json_build_object(
    'locked', false,
    'remaining_attempts', p_max_attempts - failed_count,
    'lockout_until', NULL,
    'minutes_remaining', 0
  );
END;
$$;

-- Function to record a login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email TEXT,
  p_success BOOLEAN,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Record the attempt
  INSERT INTO public.login_attempts (email, ip_address, success)
  VALUES (LOWER(p_email), p_ip_address, p_success);
  
  -- If successful, clear previous failed attempts for this email
  IF p_success THEN
    DELETE FROM public.login_attempts
    WHERE email = LOWER(p_email) AND success = false;
  END IF;
  
  -- Cleanup old attempts (older than 24 hours)
  IF random() < 0.05 THEN
    DELETE FROM public.login_attempts
    WHERE attempted_at < NOW() - INTERVAL '24 hours';
  END IF;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.check_account_lockout TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_attempt TO anon, authenticated;