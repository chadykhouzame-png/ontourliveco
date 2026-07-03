import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { reachBand } from '@/lib/reachScore';

/**
 * Compact Reach Score badge for artist search cards. Data is already aggregated
 * in SearchArtists (total_followers / avg_engagement_rate); pass the computed
 * score and optional growth. See Review Brief §6.5.
 */

interface ReachBadgeProps {
  score: number;
  growthPct?: number | null;
  className?: string;
}

const BAND_STYLES: Record<string, string> = {
  Major: 'text-emerald-500',
  Established: 'text-sky-500',
  Emerging: 'text-muted-foreground',
};

export default function ReachBadge({ score, growthPct = null, className }: ReachBadgeProps) {
  const band = reachBand(score);
  const showGrowth = growthPct != null && Math.abs(growthPct) >= 2;
  const GrowthIcon = (growthPct ?? 0) >= 0 ? TrendingUp : TrendingDown;
  const growthColor = (growthPct ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-secondary/40 px-2 py-0.5 text-xs font-medium',
        className,
      )}
      title={`Reach Score ${score} · ${band}`}
    >
      <Sparkles className={cn('h-3 w-3', BAND_STYLES[band])} />
      <span className={BAND_STYLES[band]}>{score}</span>
      {showGrowth && (
        <span className={cn('flex items-center gap-0.5', growthColor)}>
          <GrowthIcon className="h-3 w-3" />
          {Math.abs(growthPct as number).toFixed(0)}%
        </span>
      )}
    </span>
  );
}
