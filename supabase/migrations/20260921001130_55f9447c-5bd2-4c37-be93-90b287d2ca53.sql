CREATE TABLE public.webhook_failure_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL,
  stage text NOT NULL,
  event_id text,
  event_type text,
  error_message text NOT NULL,
  burst_count integer NOT NULL DEFAULT 1,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.webhook_failure_alerts TO authenticated;
GRANT ALL ON public.webhook_failure_alerts TO service_role;

ALTER TABLE public.webhook_failure_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook failure alerts"
ON public.webhook_failure_alerts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_webhook_failure_alerts_created_at
ON public.webhook_failure_alerts (created_at DESC);

CREATE INDEX idx_webhook_failure_alerts_source_created
ON public.webhook_failure_alerts (source, created_at DESC);