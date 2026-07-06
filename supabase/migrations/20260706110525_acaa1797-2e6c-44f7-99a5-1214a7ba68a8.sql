
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('artist','venue')),
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_lower_unique ON public.waitlist (lower(email));
CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON public.waitlist (created_at);

GRANT SELECT ON public.waitlist TO authenticated;
GRANT ALL ON public.waitlist TO service_role;

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read waitlist" ON public.waitlist;
CREATE POLICY "Admins can read waitlist" ON public.waitlist
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.waitlist_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS waitlist_rl_ip_time_idx
  ON public.waitlist_rate_limits (ip, attempted_at);

GRANT SELECT ON public.waitlist_rate_limits TO authenticated;
GRANT ALL ON public.waitlist_rate_limits TO service_role;

ALTER TABLE public.waitlist_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read waitlist rate limits" ON public.waitlist_rate_limits;
CREATE POLICY "Admins read waitlist rate limits" ON public.waitlist_rate_limits
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.waitlist_signup(p_email text, p_role text, p_ip text DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_position int;
  v_created timestamptz;
  v_recent int;
  v_email text;
BEGIN
  v_email := lower(trim(p_email));
  IF v_email IS NULL OR length(v_email) < 3 OR length(v_email) > 255
     OR v_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;
  IF p_role NOT IN ('artist','venue') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  IF p_ip IS NOT NULL THEN
    SELECT count(*) INTO v_recent
    FROM public.waitlist_rate_limits
    WHERE ip = p_ip
      AND attempted_at > now() - interval '1 hour';
    IF v_recent >= 5 THEN
      RAISE EXCEPTION 'rate_limited';
    END IF;
    INSERT INTO public.waitlist_rate_limits (ip) VALUES (p_ip);

    IF random() < 0.05 THEN
      DELETE FROM public.waitlist_rate_limits
      WHERE attempted_at < now() - interval '24 hours';
    END IF;
  END IF;

  INSERT INTO public.waitlist (email, role, ip)
  VALUES (v_email, p_role, p_ip)
  ON CONFLICT (lower(email)) DO NOTHING
  RETURNING id, created_at INTO v_id, v_created;

  IF v_id IS NULL THEN
    SELECT id, created_at INTO v_id, v_created
    FROM public.waitlist WHERE lower(email) = v_email;
  END IF;

  SELECT count(*) INTO v_position
  FROM public.waitlist WHERE created_at <= v_created;

  RETURN v_position;
END;
$$;

REVOKE ALL ON FUNCTION public.waitlist_signup(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waitlist_signup(text, text, text) TO anon, authenticated, service_role;
