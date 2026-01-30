-- Create rate limiting table for tracking password reset requests
CREATE TABLE public.password_reset_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups by email and time
CREATE INDEX idx_password_reset_rate_limits_email_time 
ON public.password_reset_rate_limits (email, requested_at DESC);

-- Create index for IP-based lookups
CREATE INDEX idx_password_reset_rate_limits_ip_time 
ON public.password_reset_rate_limits (ip_address, requested_at DESC);

-- Enable RLS but allow service role to manage
ALTER TABLE public.password_reset_rate_limits ENABLE ROW LEVEL SECURITY;

-- No public access - only service role can read/write
-- This table is only accessed by the edge function using service role key

-- Create function to clean up old rate limit entries (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.password_reset_rate_limits
  WHERE requested_at < NOW() - INTERVAL '24 hours';
END;
$$;