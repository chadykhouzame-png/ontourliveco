-- Growth history for artist social stats.
--
-- `social_connections` stores only the *current* follower count, so there is no
-- way to tell whether an artist is rising or fading. This table keeps one
-- lightweight snapshot per artist / platform / day, which lets us compute
-- follower growth for the venue-facing Reach Score. See Review Brief §6.2.

CREATE TABLE IF NOT EXISTS public.social_stats_snapshots (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id       UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  platform        public.social_platform NOT NULL,
  follower_count  INTEGER,
  engagement_rate NUMERIC,
  snapshot_date   DATE NOT NULL DEFAULT current_date,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- One snapshot per artist/platform/day. Re-running a sync the same day should
  -- UPSERT on this constraint, not create duplicate rows.
  CONSTRAINT social_stats_snapshots_unique UNIQUE (artist_id, platform, snapshot_date)
);

-- "Give me this artist's history, newest first" is the hot path (growth calc).
CREATE INDEX IF NOT EXISTS idx_social_stats_snapshots_artist_date
  ON public.social_stats_snapshots (artist_id, snapshot_date DESC);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
ALTER TABLE public.social_stats_snapshots ENABLE ROW LEVEL SECURITY;

-- Snapshots contain only aggregate vanity metrics (follower count, engagement,
-- date) — the same category of data already exposed publicly by
-- `social_connections_public`. So SELECT is public; this powers growth arrows on
-- artist profiles and search for any venue viewing the profile.
CREATE POLICY "Public can view social snapshots"
  ON public.social_stats_snapshots
  FOR SELECT
  USING (true);

-- NOTE: No INSERT/UPDATE/DELETE policy is granted on purpose. Writes happen only
-- from the sync edge functions using the service-role key, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- Token-safe public view (mirrors social_connections_public so client code uses
-- the same access pattern). Read this from the app, never the base table.
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS public.social_stats_snapshots_public;
CREATE VIEW public.social_stats_snapshots_public
WITH (security_invoker = on) AS
SELECT
  id,
  artist_id,
  platform,
  follower_count,
  engagement_rate,
  snapshot_date,
  created_at
FROM public.social_stats_snapshots;

GRANT SELECT ON public.social_stats_snapshots_public TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- Wiring reminder for the sync edge functions (sync-social-stats,
-- sync-all-social-stats): after updating social_connections, also run —
--
--   INSERT INTO public.social_stats_snapshots
--     (artist_id, platform, follower_count, engagement_rate)
--   VALUES ($artist_id, $platform, $follower_count, $engagement_rate)
--   ON CONFLICT (artist_id, platform, snapshot_date)
--   DO UPDATE SET follower_count  = EXCLUDED.follower_count,
--                 engagement_rate = EXCLUDED.engagement_rate;
--
-- Growth will read as "New" until ~2–4 weeks of snapshots accumulate. Expected.
-- ---------------------------------------------------------------------------
