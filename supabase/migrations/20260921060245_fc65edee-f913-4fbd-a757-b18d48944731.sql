CREATE TABLE public.waitlist_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text CHECK (role IN ('artist','venue')),
  template text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent','suppressed','failed')),
  reason text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.waitlist_email_log TO authenticated;
GRANT ALL ON public.waitlist_email_log TO service_role;

ALTER TABLE public.waitlist_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view confirmation email log"
ON public.waitlist_email_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_waitlist_email_log_created ON public.waitlist_email_log (created_at DESC);
CREATE INDEX idx_waitlist_email_log_status ON public.waitlist_email_log (status);