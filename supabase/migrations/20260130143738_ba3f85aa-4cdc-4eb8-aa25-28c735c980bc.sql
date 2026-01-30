-- Create negotiation history table
CREATE TABLE public.booking_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id uuid NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  actor_type text NOT NULL CHECK (actor_type IN ('venue', 'artist')),
  action_type text NOT NULL CHECK (action_type IN ('initial_offer', 'counter_offer', 'accept', 'decline', 'update_offer')),
  amount integer,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_negotiations ENABLE ROW LEVEL SECURITY;

-- Participants can view negotiation history
CREATE POLICY "Booking participants can view negotiations"
ON public.booking_negotiations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM booking_requests br
    JOIN artists a ON a.id = br.artist_id
    JOIN venues v ON v.id = br.venue_id
    WHERE br.id = booking_negotiations.booking_request_id
    AND (a.user_id = auth.uid() OR v.user_id = auth.uid())
  )
);

-- Participants can insert negotiation events
CREATE POLICY "Booking participants can add negotiations"
ON public.booking_negotiations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM booking_requests br
    JOIN artists a ON a.id = br.artist_id
    JOIN venues v ON v.id = br.venue_id
    WHERE br.id = booking_negotiations.booking_request_id
    AND (a.user_id = auth.uid() OR v.user_id = auth.uid())
  )
);

-- Create index for faster lookups
CREATE INDEX idx_booking_negotiations_request ON public.booking_negotiations(booking_request_id);

-- Add trigger for timestamp
CREATE TRIGGER update_booking_negotiations_updated_at
BEFORE UPDATE ON public.booking_negotiations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();