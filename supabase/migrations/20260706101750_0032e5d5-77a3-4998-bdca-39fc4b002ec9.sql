
-- Revoke table-level SELECT so column-level grants take effect
REVOKE SELECT ON public.artists FROM anon, authenticated;

-- Re-grant SELECT on every column EXCEPT stripe_account_id and mobile
GRANT SELECT (
  id, user_id, artist_name, primary_city, bio, genres, profile_image_url,
  instagram_url, soundcloud_url, spotify_url, fee_range_min, fee_range_max,
  show_fee_range, is_profile_complete, created_at, updated_at, first_name,
  last_name, review_status, tiktok_url, average_rating, total_reviews,
  stripe_onboarding_complete, age
) ON public.artists TO anon, authenticated;

-- Keep write operations working for signed-in owners
GRANT INSERT, UPDATE, DELETE ON public.artists TO authenticated;
GRANT ALL ON public.artists TO service_role;

-- Restrict profiles INSERT to authenticated only
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
