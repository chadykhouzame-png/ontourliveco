-- Create profile_views table to track when profiles are viewed
CREATE TABLE public.profile_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_type TEXT NOT NULL CHECK (profile_type IN ('artist', 'venue')),
  profile_id UUID NOT NULL,
  viewer_id UUID,
  viewer_type TEXT CHECK (viewer_type IN ('artist', 'venue', 'anonymous')),
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_profile_views_profile ON public.profile_views(profile_type, profile_id);
CREATE INDEX idx_profile_views_date ON public.profile_views(viewed_at);

-- Enable RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert views (for anonymous viewing)
CREATE POLICY "Anyone can record profile views"
ON public.profile_views
FOR INSERT
WITH CHECK (true);

-- Profile owners can view their own analytics
CREATE POLICY "Artists can view their profile analytics"
ON public.profile_views
FOR SELECT
USING (
  profile_type = 'artist' AND 
  EXISTS (
    SELECT 1 FROM artists 
    WHERE artists.id = profile_views.profile_id 
    AND artists.user_id = auth.uid()
  )
);

CREATE POLICY "Venues can view their profile analytics"
ON public.profile_views
FOR SELECT
USING (
  profile_type = 'venue' AND 
  EXISTS (
    SELECT 1 FROM venues 
    WHERE venues.id = profile_views.profile_id 
    AND venues.user_id = auth.uid()
  )
);