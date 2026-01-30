-- Create entertainment_requests table for venue slot requests
CREATE TABLE public.entertainment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  budget_min INTEGER,
  budget_max INTEGER,
  description TEXT,
  requirements TEXT,
  preferred_genres genre[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'booking', 'entertainment_request', 'review')),
  reference_id UUID,
  reference_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entertainment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for entertainment_requests
CREATE POLICY "Anyone can view open entertainment requests"
ON public.entertainment_requests FOR SELECT
USING (status = 'open');

CREATE POLICY "Venues can view their own requests"
ON public.entertainment_requests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM venues WHERE venues.id = entertainment_requests.venue_id AND venues.user_id = auth.uid()
));

CREATE POLICY "Venues can create entertainment requests"
ON public.entertainment_requests FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM venues WHERE venues.id = entertainment_requests.venue_id AND venues.user_id = auth.uid()
));

CREATE POLICY "Venues can update their own requests"
ON public.entertainment_requests FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM venues WHERE venues.id = entertainment_requests.venue_id AND venues.user_id = auth.uid()
));

CREATE POLICY "Venues can delete their own requests"
ON public.entertainment_requests FOR DELETE
USING (EXISTS (
  SELECT 1 FROM venues WHERE venues.id = entertainment_requests.venue_id AND venues.user_id = auth.uid()
));

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_entertainment_requests_venue_id ON public.entertainment_requests(venue_id);
CREATE INDEX idx_entertainment_requests_status ON public.entertainment_requests(status);
CREATE INDEX idx_entertainment_requests_date ON public.entertainment_requests(requested_date);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Trigger for updated_at
CREATE TRIGGER update_entertainment_requests_updated_at
BEFORE UPDATE ON public.entertainment_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();