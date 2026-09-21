ALTER TABLE public.waitlist_email_log
  ADD COLUMN IF NOT EXISTS trigger_source text NOT NULL DEFAULT 'signup';

ALTER TABLE public.waitlist_email_log
  ADD CONSTRAINT waitlist_email_log_trigger_source_check
  CHECK (trigger_source IN ('signup','resend','admin_resend'));

CREATE INDEX IF NOT EXISTS idx_waitlist_email_log_email_created
  ON public.waitlist_email_log (lower(email), created_at DESC);