/**
 * Reach Score — a transparent 0–100 indicator of an artist's audience strength,
 * built so a venue can judge in a glance whether an act will draw a crowd.
 *
 * It combines three first-party signals already synced into `social_connections`
 * (and, for growth, `social_stats_snapshots`):
 *   • total following across platforms  (log-scaled — followers span orders of magnitude)
 *   • average engagement rate           (real fans interact; filters bought audiences)
 *   • recent follower growth            (rising vs. fading)
 *
 * Kept pure and dependency-free so the profile card, the search badge, and the
 * sort logic all share ONE definition, and so it's trivial to unit-test.
 *
 * See Review Brief §6.3.
 */

// ---------------------------------------------------------------------------
// Tunable constants. Every "magic number" lives here so the score is easy to
// calibrate later without hunting through the code.
// ---------------------------------------------------------------------------
export const REACH_TUNING = {
  /** Following that earns the full follower allocation (log scale). */
  FOLLOWERS_FOR_MAX: 10_000_000,
  /** Max points contributed by raw following. */
  FOLLOWER_POINTS_MAX: 70,

  /** Engagement rate (%) that earns the full engagement allocation. 8%+ is exceptional. */
  ENGAGEMENT_FOR_MAX: 8,
  /** Max points contributed by engagement. */
  ENGAGEMENT_POINTS_MAX: 20,

  /** Growth thresholds (% follower change over the window). */
  GROWTH_STRONG: 10,
  GROWTH_POSITIVE: 2,
  GROWTH_FLAT_FLOOR: -2,
  /** Points awarded per growth bucket. */
  GROWTH_POINTS_STRONG: 10,
  GROWTH_POINTS_POSITIVE: 6,
  GROWTH_POINTS_NEUTRAL: 3, // also used when growth is unknown (not enough history yet)
  GROWTH_POINTS_DECLINING: 0,

  /** Reach Score band cutoffs. */
  BAND_ESTABLISHED_MIN: 40,
  BAND_MAJOR_MIN: 70,

  /** Engagement qualifier cutoffs (%). */
  ENGAGEMENT_AVERAGE_MIN: 1,
  ENGAGEMENT_STRONG_MIN: 3,
} as const;

export type ReachBand = 'Emerging' | 'Established' | 'Major';
export type EngagementQualifier = 'low' | 'average' | 'strong' | 'unknown';

export interface ReachInputs {
  totalFollowers: number;
  /** Average engagement rate as a percentage, or null if unknown. */
  avgEngagementRate: number | null;
  /** Follower growth (%) over the window, or null if not enough history. */
  growthPct: number | null;
}

export interface ReachResult {
  score: number; // 0..100
  band: ReachBand;
  followerPoints: number;
  engagementPoints: number;
  growthPoints: number;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Points from raw following, on a log scale (0 .. FOLLOWER_POINTS_MAX). */
export function followerPoints(totalFollowers: number): number {
  const t = REACH_TUNING;
  const safe = Math.max(totalFollowers, 1);
  const ratio = Math.log10(safe) / Math.log10(t.FOLLOWERS_FOR_MAX);
  return clamp(Math.round(t.FOLLOWER_POINTS_MAX * ratio), 0, t.FOLLOWER_POINTS_MAX);
}

/** Points from engagement (0 .. ENGAGEMENT_POINTS_MAX). Null contributes nothing. */
export function engagementPoints(avgEngagementRate: number | null): number {
  const t = REACH_TUNING;
  if (avgEngagementRate == null) return 0;
  const pts = (avgEngagementRate / t.ENGAGEMENT_FOR_MAX) * t.ENGAGEMENT_POINTS_MAX;
  return clamp(Math.round(pts), 0, t.ENGAGEMENT_POINTS_MAX);
}

/** Points from growth. Null (not enough history) scores the neutral middle, not 0. */
export function growthPoints(growthPct: number | null): number {
  const t = REACH_TUNING;
  if (growthPct == null) return t.GROWTH_POINTS_NEUTRAL;
  if (growthPct > t.GROWTH_STRONG) return t.GROWTH_POINTS_STRONG;
  if (growthPct >= t.GROWTH_POSITIVE) return t.GROWTH_POINTS_POSITIVE;
  if (growthPct > t.GROWTH_FLAT_FLOOR) return t.GROWTH_POINTS_NEUTRAL;
  return t.GROWTH_POINTS_DECLINING;
}

export function reachBand(score: number): ReachBand {
  const t = REACH_TUNING;
  if (score >= t.BAND_MAJOR_MIN) return 'Major';
  if (score >= t.BAND_ESTABLISHED_MIN) return 'Established';
  return 'Emerging';
}

export function engagementQualifier(avgEngagementRate: number | null): EngagementQualifier {
  const t = REACH_TUNING;
  if (avgEngagementRate == null) return 'unknown';
  if (avgEngagementRate >= t.ENGAGEMENT_STRONG_MIN) return 'strong';
  if (avgEngagementRate >= t.ENGAGEMENT_AVERAGE_MIN) return 'average';
  return 'low';
}

/** The one entry point the UI/sort should call. */
export function computeReachScore(inputs: ReachInputs): ReachResult {
  const fp = followerPoints(inputs.totalFollowers);
  const ep = engagementPoints(inputs.avgEngagementRate);
  const gp = growthPoints(inputs.growthPct);
  const score = clamp(fp + ep + gp, 0, 100);
  return { score, band: reachBand(score), followerPoints: fp, engagementPoints: ep, growthPoints: gp };
}

// ---------------------------------------------------------------------------
// Aggregation helper: turn per-platform rows (from social_connections_public)
// into the totals the score needs. Encodes the correctness rule from Brief §6.6:
// EXCLUDE null engagement rates from the average — never treat null as 0, which
// would unfairly drag the score down for platforms that don't report it.
// ---------------------------------------------------------------------------
export interface PlatformStat {
  follower_count: number | null;
  engagement_rate: number | null;
}

export function aggregateReach(stats: PlatformStat[]): {
  totalFollowers: number;
  avgEngagementRate: number | null;
} {
  let totalFollowers = 0;
  const engagements: number[] = [];
  for (const s of stats) {
    totalFollowers += s.follower_count ?? 0;
    if (s.engagement_rate != null) engagements.push(s.engagement_rate);
  }
  const avgEngagementRate = engagements.length
    ? engagements.reduce((a, b) => a + b, 0) / engagements.length
    : null;
  return { totalFollowers, avgEngagementRate };
}

/**
 * Follower growth (%) between an older snapshot total and the current total.
 * Returns null when there isn't a usable baseline (so the UI shows "New").
 */
export function computeGrowthPct(currentTotal: number, olderTotal: number | null): number | null {
  if (olderTotal == null || olderTotal <= 0) return null;
  return ((currentTotal - olderTotal) / olderTotal) * 100;
}

/** Compact follower display: 1.2K / 3.4M. */
export function formatFollowers(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0)}M`;
}
