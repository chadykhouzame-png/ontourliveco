
-- Create artist_media table for EPK (promo photos, logos, stage shots, PDF press kit)
CREATE TABLE public.artist_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'promo_photo', 'logo', 'stage_shot', 'press_kit_pdf'
  file_size INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.artist_media ENABLE ROW LEVEL SECURITY;

-- Anyone can view artist media (public EPK)
CREATE POLICY "Anyone can view artist media"
  ON public.artist_media FOR SELECT
  USING (true);

-- Artists can insert their own media
CREATE POLICY "Artists can insert their own media"
  ON public.artist_media FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.artists
    WHERE artists.id = artist_media.artist_id AND artists.user_id = auth.uid()
  ));

-- Artists can update their own media
CREATE POLICY "Artists can update their own media"
  ON public.artist_media FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.artists
    WHERE artists.id = artist_media.artist_id AND artists.user_id = auth.uid()
  ));

-- Artists can delete their own media
CREATE POLICY "Artists can delete their own media"
  ON public.artist_media FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.artists
    WHERE artists.id = artist_media.artist_id AND artists.user_id = auth.uid()
  ));

-- Create storage bucket for artist EPK media
INSERT INTO storage.buckets (id, name, public) VALUES ('artist-media', 'artist-media', true);

-- Storage policies for artist-media bucket
CREATE POLICY "Anyone can view artist media files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'artist-media');

CREATE POLICY "Authenticated users can upload artist media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'artist-media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own artist media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'artist-media' AND auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER update_artist_media_updated_at
  BEFORE UPDATE ON public.artist_media
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
