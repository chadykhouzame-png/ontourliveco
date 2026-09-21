ALTER TABLE public.webhook_failure_alerts
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_by uuid,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid,
  ADD COLUMN IF NOT EXISTS resolution_note text;

GRANT UPDATE ON public.webhook_failure_alerts TO authenticated;

DROP POLICY IF EXISTS "Admins can update webhook failure alerts" ON public.webhook_failure_alerts;
CREATE POLICY "Admins can update webhook failure alerts"
ON public.webhook_failure_alerts
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_webhook_failure_alerts_open
  ON public.webhook_failure_alerts (created_at DESC)
  WHERE resolved_at IS NULL;