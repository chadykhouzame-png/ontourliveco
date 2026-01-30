-- Create error_logs table for tracking application errors
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  user_id UUID,
  context TEXT,
  url TEXT,
  user_agent TEXT,
  stack_trace TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for querying recent errors
CREATE INDEX idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX idx_error_logs_error_code ON public.error_logs (error_code);
CREATE INDEX idx_error_logs_user_id ON public.error_logs (user_id);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Allow inserts from authenticated users and anon (for pre-login errors)
CREATE POLICY "Anyone can log errors"
  ON public.error_logs FOR INSERT
  WITH CHECK (true);

-- Only allow service role to read errors (for admin dashboards)
CREATE POLICY "Service role can read errors"
  ON public.error_logs FOR SELECT
  USING (auth.role() = 'service_role');

-- Cleanup old errors (older than 30 days) - can be called by cron
CREATE OR REPLACE FUNCTION public.cleanup_old_error_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.error_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;