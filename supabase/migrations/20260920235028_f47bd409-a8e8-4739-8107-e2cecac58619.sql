CREATE TABLE public.waitlist_blocked_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reason text NOT NULL CHECK (reason IN ('honeypot','too_fast','rate_limited','invalid_body')),
  role text CHECK (role IN ('artist','venue')),
  ip_hash text,
  client_kind text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_waitlist_blocked_attempts_created_at ON public.waitlist_blocked_attempts (created_at DESC);

GRANT SELECT, DELETE ON public.waitlist_blocked_attempts TO authenticated;
GRANT ALL ON public.waitlist_blocked_attempts TO service_role;

ALTER TABLE public.waitlist_blocked_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view blocked signup attempts"
ON public.waitlist_blocked_attempts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can clear blocked signup attempts"
ON public.waitlist_blocked_attempts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));