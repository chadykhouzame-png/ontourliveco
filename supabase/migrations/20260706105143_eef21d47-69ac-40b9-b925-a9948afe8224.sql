
-- Harden record_login_attempt: only clear failed attempts when the caller is
-- authenticated AND their auth email matches p_email. Anon callers (and
-- callers logging attempts for a different email) can only append rows.
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_email text,
  p_success boolean,
  p_ip_address text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  caller_email text;
BEGIN
  -- Always record the attempt
  INSERT INTO public.login_attempts (email, ip_address, success)
  VALUES (LOWER(p_email), p_ip_address, p_success);

  -- Only clear failed attempts when the caller is authenticated as this email
  IF p_success AND auth.uid() IS NOT NULL THEN
    SELECT LOWER(email) INTO caller_email FROM auth.users WHERE id = auth.uid();
    IF caller_email = LOWER(p_email) THEN
      DELETE FROM public.login_attempts
      WHERE email = LOWER(p_email) AND success = false;
    END IF;
  END IF;

  -- Opportunistic cleanup of old rows
  IF random() < 0.05 THEN
    DELETE FROM public.login_attempts
    WHERE attempted_at < NOW() - INTERVAL '24 hours';
  END IF;
END;
$function$;

-- Harden get_user_role: only allow querying own role, or admins can query any.
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  IF _user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN NULL;
  END IF;
  RETURN (SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1);
END;
$function$;
