import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Music, Instagram, Users, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import {
  aggregateReach,
  computeGrowthPct,
  computeReachScore,
  engagementQualifier,
  formatFollowers,
  type PlatformStat,
} from '@/lib/reachScore';

/**
 * Venue-facing summary of an artist's audience strength. Answers, at a glance:
 * how big is their reach, are they growing, and are their fans engaged.
 * Sits above the detailed SocialMediaDashboard on the artist profile.
 * See Review Brief §6.4.
 */

interface ArtistReachCardProps {
  artistId: string;
  className?: string;
}

type Platform = 'spotify' | 'instagram' | 'tiktok' | 'soundcloud';

interface ConnectionRow extends PlatformStat {
  platform: Platform;
}

const PLATFORM_ICON: Record<Platform, { icon: typeof Music; color: string }> = {
  spotify: { icon: Music, color: 'text-[#1DB954]' },
  instagram: { icon: Instagram, color: 'text-[#E4405F]' },
  tiktok: { icon: Music, color: 'text-foreground' },
  soundcloud: { icon: Music, color: 'text-[#FF5500]' },
};

const BAND_STYLES: Record<string, string> = {
  Major: 'text-emerald-500',
  Established: 'text-sky-500',
  Emerging: 'text-muted-foreground',
};

const ENGAGEMENT_LABEL: Record<string, string> = {
  strong: 'Strong engagement',
  average: 'Average engagement',
  low: 'Low engagement',
  unknown: 'Engagement N/A',
};

// How many days back we look for a growth baseline, and the minimum history
// required before we show a growth figure at all (avoids noisy day-1 numbers).
const GROWTH_TARGET_DAYS = 30;
const GROWTH_MIN_DAYS = 14;
const GROWTH_WINDOW_DAYS = 45;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Pick the snapshot date closest to ~30 days ago that is at least 14 days old. */
function selectBaselineTotal(byDate: Map<string, number>): number | null {
  const target = new Date(daysAgo(GROWTH_TARGET_DAYS)).getTime();
  const cutoff = new Date(daysAgo(GROWTH_MIN_DAYS)).getTime();
  let best: { date: number; total: number } | null = null;
  for (const [date, total] of byDate) {
    const t = new Date(date).getTime();
    if (t > cutoff) continue; // too recent to be a baseline
    if (!best || Math.abs(t - target) < Math.abs(best.date - target)) {
      best = { date: t, total };
    }
  }
  return best ? best.total : null;
}

export default function ArtistReachCard({ artistId, className }: ArtistReachCardProps) {
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [growthPct, setGrowthPct] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      // Current per-platform stats (token-safe public view).
      const { data: conns } = await supabase
        .from('social_connections_public')
        .select('platform, follower_count, engagement_rate')
        .eq('artist_id', artistId)
        .eq('is_connected', true);

      // Growth baseline from the snapshot history.
      // NOTE: `social_stats_snapshots_public` is added by the new migration.
      // The `as any` cast can be removed once Supabase types are regenerated.
      const { data: snaps } = await (supabase as any)
        .from('social_stats_snapshots_public')
        .select('follower_count, snapshot_date')
        .eq('artist_id', artistId)
        .gte('snapshot_date', daysAgo(GROWTH_WINDOW_DAYS))
        .order('snapshot_date', { ascending: true });

      if (cancelled) return;

      const rows = (conns ?? []) as ConnectionRow[];
      setConnections(rows);

      const { totalFollowers } = aggregateReach(rows);
      const byDate = new Map<string, number>();
      for (const s of (snaps ?? []) as { follower_count: number | null; snapshot_date: string }[]) {
        byDate.set(s.snapshot_date, (byDate.get(s.snapshot_date) ?? 0) + (s.follower_count ?? 0));
      }
      setGrowthPct(computeGrowthPct(totalFollowers, selectBaselineTotal(byDate)));

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [artistId]);

  if (loading) {
    return (
      <Card className={cn('glass border-border/50 rounded-2xl overflow-hidden', className)}>
        <CardContent className="p-6">
          <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
        </CardContent>
      </Card>
    );
  }

  // No connected platforms — show a quiet empty state, never a scary red 0.
  if (connections.length === 0) {
    return (
      <Card className={cn('glass border-border/50 rounded-2xl overflow-hidden', className)}>
        <CardHeader className="border-b border-border/30 bg-secondary/20">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5" /> Audience Reach
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">No audience data yet.</p>
        </CardContent>
      </Card>
    );
  }

  const { totalFollowers, avgEngagementRate } = aggregateReach(connections);
  const { score, band } = computeReachScore({ totalFollowers, avgEngagementRate, growthPct });
  const engQual = engagementQualifier(avgEngagementRate);

  const GrowthIcon = growthPct == null ? Minus : growthPct >= 2 ? TrendingUp : growthPct <= -2 ? TrendingDown : Minus;
  const growthLabel =
    growthPct == null
      ? 'New'
      : `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(growthPct > -10 && growthPct < 10 ? 1 : 0)}% · 30d`;
  const growthColor =
    growthPct == null ? 'text-muted-foreground' : growthPct >= 2 ? 'text-emerald-500' : growthPct <= -2 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <Card className={cn('glass border-border/50 rounded-2xl overflow-hidden', className)}>
      <CardHeader className="border-b border-border/30 bg-secondary/20">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5" /> Audience Reach
        </CardTitle>
        <p className="text-xs text-muted-foreground">What this act can bring to your venue</p>
      </CardHeader>

      <CardContent className="pt-5">
        <div className="flex items-center gap-5">
          {/* Score */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-secondary/30 px-5 py-3 min-w-[92px]">
            <span className={cn('text-3xl font-bold leading-none', BAND_STYLES[band])}>{score}</span>
            <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">Reach</span>
            <span className={cn('text-xs font-medium', BAND_STYLES[band])}>{band}</span>
          </div>

          {/* Key stats */}
          <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span className="text-xs">Following</span>
              </div>
              <p className="text-lg font-semibold">{formatFollowers(totalFollowers)}</p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <GrowthIcon className="h-3.5 w-3.5" />
                <span className="text-xs">Growth</span>
              </div>
              <p className={cn('text-lg font-semibold', growthColor)}>{growthLabel}</p>
            </div>

            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">
                {ENGAGEMENT_LABEL[engQual]}
                {avgEngagementRate != null && (
                  <span className="text-foreground font-medium"> · {avgEngagementRate.toFixed(1)}%</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Per-platform mini row */}
        <div className="mt-4 flex flex-wrap gap-3 border-t border-border/30 pt-3">
          {connections.map((c) => {
            const cfg = PLATFORM_ICON[c.platform];
            const Icon = cfg?.icon ?? Music;
            return (
              <div key={c.platform} className="flex items-center gap-1.5 text-sm">
                <Icon className={cn('h-4 w-4', cfg?.color)} />
                <span className="text-muted-foreground">{formatFollowers(c.follower_count ?? 0)}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
