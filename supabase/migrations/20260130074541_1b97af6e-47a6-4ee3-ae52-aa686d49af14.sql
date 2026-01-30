-- Create enum for social platforms
CREATE TYPE public.social_platform AS ENUM ('spotify', 'instagram', 'tiktok', 'soundcloud');

-- Create social_connections table to store OAuth connections and follower data
CREATE TABLE public.social_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  platform_user_id TEXT,
  platform_username TEXT,
  profile_url TEXT,
  follower_count INTEGER,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  connected_at TIMESTAMP WITH TIME ZONE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Each artist can only have one connection per platform
  UNIQUE(artist_id, platform)
);

-- Enable RLS
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- Artists can view their own social connections
CREATE POLICY "Artists can view their own social connections"
ON public.social_connections
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.artists 
    WHERE artists.id = social_connections.artist_id 
    AND artists.user_id = auth.uid()
  )
);

-- Anyone can view connected social stats (for venues to see follower counts)
CREATE POLICY "Anyone can view connected social stats"
ON public.social_connections
FOR SELECT
USING (is_connected = true);

-- Artists can insert their own social connections
CREATE POLICY "Artists can insert their own social connections"
ON public.social_connections
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.artists 
    WHERE artists.id = social_connections.artist_id 
    AND artists.user_id = auth.uid()
  )
);

-- Artists can update their own social connections
CREATE POLICY "Artists can update their own social connections"
ON public.social_connections
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.artists 
    WHERE artists.id = social_connections.artist_id 
    AND artists.user_id = auth.uid()
  )
);

-- Artists can delete their own social connections
CREATE POLICY "Artists can delete their own social connections"
ON public.social_connections
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.artists 
    WHERE artists.id = social_connections.artist_id 
    AND artists.user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_social_connections_updated_at
BEFORE UPDATE ON public.social_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();