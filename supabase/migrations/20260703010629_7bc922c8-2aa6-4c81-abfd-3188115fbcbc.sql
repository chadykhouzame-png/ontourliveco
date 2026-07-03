-- Growth history for artist social stats.
CREATE TABLE IF NOT EXISTS public.social_stats_snapshots (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id       UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  platform        public.social_platform NOT NULL,
  follower_count  INTEGER,
  engagement_rate NUMERIC,
  snapshot_date   DATE NOT NULL DEFAULT current_date,
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT social_stats_snapshots_unique UNIQUE (artist_id, platform, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_social_stats_snapshots_artist_date
  ON public.social_stats_snapshots (artist_id, snapshot_date DESC);

ALTER TABLE public.social_stats_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view social snapshots"
  ON public.social_stats_snapshots
  FOR SELECT
  USING (true);

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
GRANT SELECT ON public.social_stats_snapshots TO authenticated, anon;
GRANT ALL ON public.social_stats_snapshots TO service_role;