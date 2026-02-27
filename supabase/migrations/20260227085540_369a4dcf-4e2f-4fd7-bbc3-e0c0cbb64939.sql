
-- Create webhook event log table
CREATE TABLE public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  payload JSONB,
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT webhook_events_event_id_unique UNIQUE (event_id)
);

-- Enable RLS
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service role full access" ON public.webhook_events
  FOR ALL USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Admins can view for auditing
CREATE POLICY "Admins can view webhook events" ON public.webhook_events
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for lookups
CREATE INDEX idx_webhook_events_event_id ON public.webhook_events (event_id);
CREATE INDEX idx_webhook_events_event_type ON public.webhook_events (event_type);
CREATE INDEX idx_webhook_events_created_at ON public.webhook_events (created_at DESC);
