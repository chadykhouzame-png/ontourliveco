CREATE TABLE public.booking_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  email text NOT NULL CHECK (char_length(btrim(email)) BETWEEN 3 AND 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  organisation text CHECK (organisation IS NULL OR char_length(organisation) <= 120),
  enquiry_type text NOT NULL DEFAULT 'other' CHECK (enquiry_type IN ('artist','venue','other')),
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 1000),
  handled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.booking_enquiries TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.booking_enquiries TO authenticated;
GRANT ALL ON public.booking_enquiries TO service_role;

ALTER TABLE public.booking_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a booking enquiry"
ON public.booking_enquiries FOR INSERT TO anon, authenticated
WITH CHECK (handled = false);

CREATE POLICY "Admins can read booking enquiries"
ON public.booking_enquiries FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update booking enquiries"
ON public.booking_enquiries FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete booking enquiries"
ON public.booking_enquiries FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX booking_enquiries_created_at_idx ON public.booking_enquiries (created_at DESC);