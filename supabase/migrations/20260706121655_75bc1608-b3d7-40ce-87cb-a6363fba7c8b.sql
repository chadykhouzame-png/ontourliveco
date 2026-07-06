
GRANT SELECT, DELETE ON public.waitlist TO authenticated;

DROP POLICY IF EXISTS "Admins can delete waitlist" ON public.waitlist;
CREATE POLICY "Admins can delete waitlist"
  ON public.waitlist
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
