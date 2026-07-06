
-- Idempotent lockdown: ensure anon and PUBLIC cannot execute get_user_role.
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;

-- Signed-in users need EXECUTE so the in-function self/admin guard can run.
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO service_role;
