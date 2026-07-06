REVOKE SELECT (stripe_account_id) ON public.artists FROM anon, authenticated;
GRANT SELECT (stripe_account_id) ON public.artists TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_stripe_account_id()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT stripe_account_id FROM public.artists WHERE user_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_stripe_account_id() TO authenticated;