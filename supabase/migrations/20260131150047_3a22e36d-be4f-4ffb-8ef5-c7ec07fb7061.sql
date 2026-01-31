-- Create disputes table for handling user reports and issues
CREATE TABLE public.disputes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_user_id UUID NOT NULL,
  reported_user_id UUID,
  reported_artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  reported_venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  booking_request_id UUID REFERENCES public.booking_requests(id) ON DELETE SET NULL,
  dispute_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_dispute_type CHECK (dispute_type IN ('general', 'booking', 'payment', 'behavior', 'fraud', 'other')),
  CONSTRAINT valid_status CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed'))
);

-- Enable RLS on disputes
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Users can view their own disputes (as reporter or reported)
CREATE POLICY "Users can view their own disputes"
ON public.disputes
FOR SELECT
USING (
  auth.uid() = reporter_user_id OR
  auth.uid() = reported_user_id OR
  (reported_artist_id IS NOT NULL AND public.user_owns_artist(reported_artist_id)) OR
  (reported_venue_id IS NOT NULL AND public.user_owns_venue(reported_venue_id))
);

-- Users can create disputes
CREATE POLICY "Authenticated users can create disputes"
ON public.disputes
FOR INSERT
WITH CHECK (auth.uid() = reporter_user_id);

-- Admins can view all disputes
CREATE POLICY "Admins can view all disputes"
ON public.disputes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update disputes
CREATE POLICY "Admins can update disputes"
ON public.disputes
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Add admin policies for artists table
CREATE POLICY "Admins can view all artists"
ON public.artists
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any artist"
ON public.artists
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Add admin policies for venues table
CREATE POLICY "Admins can view all venues"
ON public.venues
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any venue"
ON public.venues
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Add admin policies for booking_requests
CREATE POLICY "Admins can view all booking requests"
ON public.booking_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any booking request"
ON public.booking_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Add admin policies for user_roles (to manage roles)
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at on disputes
CREATE TRIGGER update_disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();