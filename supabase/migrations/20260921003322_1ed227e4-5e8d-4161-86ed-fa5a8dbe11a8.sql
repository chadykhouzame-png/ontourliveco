CREATE TABLE public.webhook_alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric text NOT NULL UNIQUE CHECK (metric IN ('failure_rate','processing_time','pending_count')),
  enabled boolean NOT NULL DEFAULT true,
  threshold numeric NOT NULL,
  window_minutes integer NOT NULL DEFAULT 60 CHECK (window_minutes BETWEEN 5 AND 1440),
  min_events integer NOT NULL DEFAULT 5 CHECK (min_events >= 0),
  cooldown_minutes integer NOT NULL DEFAULT 60 CHECK (cooldown_minutes BETWEEN 5 AND 1440),
  notify_email boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  last_checked_at timestamptz,
  last_value numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_alert_rules TO authenticated;
GRANT ALL ON public.webhook_alert_rules TO service_role;

ALTER TABLE public.webhook_alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage webhook alert rules"
ON public.webhook_alert_rules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_webhook_alert_rules_updated_at
BEFORE UPDATE ON public.webhook_alert_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.webhook_alert_rules (metric, threshold, window_minutes, min_events, cooldown_minutes)
VALUES
  ('failure_rate', 20, 60, 5, 60),
  ('processing_time', 10, 60, 3, 60),
  ('pending_count', 10, 60, 0, 60);