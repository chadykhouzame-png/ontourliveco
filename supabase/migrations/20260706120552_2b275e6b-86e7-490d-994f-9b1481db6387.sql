ALTER TABLE public.waitlist
  ADD COLUMN first_name text,
  ADD COLUMN last_name text,
  ADD COLUMN artist_name text,
  ADD COLUMN venue_name text;

CREATE OR REPLACE FUNCTION public.waitlist_signup(
  p_email text,
  p_role text,
  p_ip text DEFAULT NULL,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_artist_name text DEFAULT NULL,
  p_venue_name text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_position int;
  v_created timestamptz;
  v_recent int;
  v_email text;
  v_first_name text;
  v_last_name text;
  v_artist_name text;
  v_venue_name text;
BEGIN
  v_email := lower(trim(p_email));
  IF v_email IS NULL OR length(v_email) < 3 OR length(v_email) > 255
     OR v_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  IF p_role NOT IN ('artist','venue') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;

  v_first_name := trim(p_first_name);
  v_last_name := trim(p_last_name);
  v_artist_name := trim(p_artist_name);
  v_venue_name := trim(p_venue_name);

  IF v_first_name IS NULL OR length(v_first_name) < 1 OR length(v_first_name) > 100 THEN
    RAISE EXCEPTION 'invalid_first_name';
  END IF;
  IF v_last_name IS NULL OR length(v_last_name) < 1 OR length(v_last_name) > 100 THEN
    RAISE EXCEPTION 'invalid_last_name';
  END IF;
  IF p_role = 'artist' AND (v_artist_name IS NULL OR length(v_artist_name) < 1 OR length(v_artist_name) > 100) THEN
    RAISE EXCEPTION 'invalid_artist_name';
  END IF;
  IF p_role = 'venue' AND (v_venue_name IS NULL OR length(v_venue_name) < 1 OR length(v_venue_name) > 100) THEN
    RAISE EXCEPTION 'invalid_venue_name';
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

  INSERT INTO public.waitlist (email, role, ip, first_name, last_name, artist_name, venue_name)
  VALUES (v_email, p_role, p_ip, v_first_name, v_last_name, v_artist_name, v_venue_name)
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