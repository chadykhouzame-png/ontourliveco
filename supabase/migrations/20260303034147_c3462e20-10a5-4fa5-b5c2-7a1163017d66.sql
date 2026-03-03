
-- Allow artists to also create booking requests
CREATE POLICY "Artists can create booking requests"
ON public.booking_requests
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM artists
    WHERE artists.id = booking_requests.artist_id
      AND artists.user_id = auth.uid()
  )
);
