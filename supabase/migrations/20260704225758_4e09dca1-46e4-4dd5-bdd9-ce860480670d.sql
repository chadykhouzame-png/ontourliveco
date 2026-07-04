
CREATE TABLE public.webhook_retry_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_event_id UUID NOT NULL REFERENCES public.webhook_events(id) ON DELETE CASCADE,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT,
  success BOOLEAN NOT NULL,
  http_status INTEGER,
  duration_ms INTEGER,
  retry_event_id TEXT,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_retry_attempts_event ON public.webhook_retry_attempts(webhook_event_id, created_at DESC);

GRANT SELECT ON public.webhook_retry_attempts TO authenticated;
GRANT ALL ON public.webhook_retry_attempts TO service_role;

ALTER TABLE public.webhook_retry_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view retry attempts"
  ON public.webhook_retry_attempts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
