DROP FUNCTION IF EXISTS public.waitlist_signup(text, text, text);

REVOKE ALL ON FUNCTION public.waitlist_signup(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.waitlist_signup(text, text, text, text, text, text, text) TO service_role;