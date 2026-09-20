DROP POLICY IF EXISTS "site_settings readable by everyone" ON public.site_settings;
REVOKE SELECT ON public.site_settings FROM anon, authenticated;
GRANT SELECT (key, value, updated_at) ON public.site_settings TO anon;
GRANT SELECT ON public.site_settings TO authenticated;
CREATE POLICY "site_settings public keys readable"
  ON public.site_settings FOR SELECT
  TO anon, authenticated
  USING (key IN ('holding_page_enabled', 'launch_date'));
CREATE POLICY "site_settings admin read all"
  ON public.site_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));