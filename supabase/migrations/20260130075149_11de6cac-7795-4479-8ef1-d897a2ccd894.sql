-- Create reviews table for mutual ratings
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_request_id UUID NOT NULL REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  
  -- Who is writing the review
  reviewer_type TEXT NOT NULL CHECK (reviewer_type IN ('artist', 'venue')),
  reviewer_artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  reviewer_venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  
  -- Who is being reviewed
  reviewee_type TEXT NOT NULL CHECK (reviewee_type IN ('artist', 'venue')),
  reviewee_artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE,
  reviewee_venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
  
  -- The actual review
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure each party can only review once per booking
  UNIQUE(booking_request_id, reviewer_type),
  
  -- Validation constraints
  CONSTRAINT valid_reviewer CHECK (
    (reviewer_type = 'artist' AND reviewer_artist_id IS NOT NULL AND reviewer_venue_id IS NULL) OR
    (reviewer_type = 'venue' AND reviewer_venue_id IS NOT NULL AND reviewer_artist_id IS NULL)
  ),
  CONSTRAINT valid_reviewee CHECK (
    (reviewee_type = 'artist' AND reviewee_artist_id IS NOT NULL AND reviewee_venue_id IS NULL) OR
    (reviewee_type = 'venue' AND reviewee_venue_id IS NOT NULL AND reviewee_artist_id IS NULL)
  )
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews (for transparency)
CREATE POLICY "Anyone can view reviews"
ON public.reviews
FOR SELECT
USING (true);

-- Artists can create reviews for venues they've worked with
CREATE POLICY "Artists can create reviews for completed bookings"
ON public.reviews
FOR INSERT
WITH CHECK (
  reviewer_type = 'artist' AND
  EXISTS (
    SELECT 1 FROM public.booking_requests br
    JOIN public.artists a ON a.id = br.artist_id
    WHERE br.id = booking_request_id
    AND br.status = 'completed'
    AND a.user_id = auth.uid()
    AND reviewer_artist_id = a.id
  )
);

-- Venues can create reviews for artists they've worked with
CREATE POLICY "Venues can create reviews for completed bookings"
ON public.reviews
FOR INSERT
WITH CHECK (
  reviewer_type = 'venue' AND
  EXISTS (
    SELECT 1 FROM public.booking_requests br
    JOIN public.venues v ON v.id = br.venue_id
    WHERE br.id = booking_request_id
    AND br.status = 'completed'
    AND v.user_id = auth.uid()
    AND reviewer_venue_id = v.id
  )
);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
ON public.reviews
FOR UPDATE
USING (
  (reviewer_type = 'artist' AND EXISTS (
    SELECT 1 FROM public.artists WHERE id = reviewer_artist_id AND user_id = auth.uid()
  )) OR
  (reviewer_type = 'venue' AND EXISTS (
    SELECT 1 FROM public.venues WHERE id = reviewer_venue_id AND user_id = auth.uid()
  ))
);

-- Add trigger for updated_at
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add average rating columns to artists and venues for quick access
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2);
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2);
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Create function to update average ratings for artists
CREATE OR REPLACE FUNCTION public.update_artist_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_artist_id UUID;
BEGIN
  -- Get the artist ID from NEW or OLD
  IF TG_OP = 'DELETE' THEN
    target_artist_id := OLD.reviewee_artist_id;
  ELSE
    target_artist_id := NEW.reviewee_artist_id;
  END IF;
  
  -- Only update if this review is for an artist
  IF target_artist_id IS NOT NULL THEN
    UPDATE public.artists
    SET 
      average_rating = (
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM public.reviews
        WHERE reviewee_artist_id = target_artist_id
      ),
      total_reviews = (
        SELECT COUNT(*)
        FROM public.reviews
        WHERE reviewee_artist_id = target_artist_id
      )
    WHERE id = target_artist_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to update average ratings for venues
CREATE OR REPLACE FUNCTION public.update_venue_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_venue_id UUID;
BEGIN
  -- Get the venue ID from NEW or OLD
  IF TG_OP = 'DELETE' THEN
    target_venue_id := OLD.reviewee_venue_id;
  ELSE
    target_venue_id := NEW.reviewee_venue_id;
  END IF;
  
  -- Only update if this review is for a venue
  IF target_venue_id IS NOT NULL THEN
    UPDATE public.venues
    SET 
      average_rating = (
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM public.reviews
        WHERE reviewee_venue_id = target_venue_id
      ),
      total_reviews = (
        SELECT COUNT(*)
        FROM public.reviews
        WHERE reviewee_venue_id = target_venue_id
      )
    WHERE id = target_venue_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers to auto-update ratings
CREATE TRIGGER update_artist_rating_on_review
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_artist_rating();

CREATE TRIGGER update_venue_rating_on_review
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_venue_rating();