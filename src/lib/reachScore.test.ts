import { describe, it, expect } from 'vitest';
import {
  REACH_TUNING,
  followerPoints,
  engagementPoints,
  growthPoints,
  reachBand,
  engagementQualifier,
  computeReachScore,
  aggregateReach,
  computeGrowthPct,
  formatFollowers,
} from './reachScore';

describe('followerPoints', () => {
  it('is 0 for no audience', () => {
    expect(followerPoints(0)).toBe(0);
    expect(followerPoints(1)).toBe(0);
  });

  it('awards the full allocation at the max-follower anchor', () => {
    expect(followerPoints(REACH_TUNING.FOLLOWERS_FOR_MAX)).toBe(REACH_TUNING.FOLLOWER_POINTS_MAX);
  });

  it('caps beyond the anchor (never exceeds the max)', () => {
    expect(followerPoints(500_000_000)).toBe(REACH_TUNING.FOLLOWER_POINTS_MAX);
  });

  it('increases monotonically with following', () => {
    expect(followerPoints(1_000)).toBeLessThan(followerPoints(100_000));
    expect(followerPoints(100_000)).toBeLessThan(followerPoints(5_000_000));
  });
});

describe('engagementPoints', () => {
  it('is 0 when engagement is unknown (null), not a penalty beyond that', () => {
    expect(engagementPoints(null)).toBe(0);
  });

  it('awards the full allocation at the engagement anchor', () => {
    expect(engagementPoints(REACH_TUNING.ENGAGEMENT_FOR_MAX)).toBe(REACH_TUNING.ENGAGEMENT_POINTS_MAX);
  });

  it('caps for exceptional engagement', () => {
    expect(engagementPoints(25)).toBe(REACH_TUNING.ENGAGEMENT_POINTS_MAX);
  });

  it('scales linearly below the anchor', () => {
    expect(engagementPoints(4)).toBe(10); // half of 8% -> half of 20
  });
});

describe('growthPoints', () => {
  it('gives the neutral middle when growth is unknown', () => {
    expect(growthPoints(null)).toBe(REACH_TUNING.GROWTH_POINTS_NEUTRAL);
  });

  it('rewards strong growth', () => {
    expect(growthPoints(15)).toBe(REACH_TUNING.GROWTH_POINTS_STRONG);
  });

  it('rewards positive growth', () => {
    expect(growthPoints(5)).toBe(REACH_TUNING.GROWTH_POINTS_POSITIVE);
  });

  it('treats flat as neutral', () => {
    expect(growthPoints(0)).toBe(REACH_TUNING.GROWTH_POINTS_NEUTRAL);
  });

  it('gives nothing for decline', () => {
    expect(growthPoints(-8)).toBe(REACH_TUNING.GROWTH_POINTS_DECLINING);
  });
});

describe('reachBand', () => {
  it('classifies by cutoffs', () => {
    expect(reachBand(10)).toBe('Emerging');
    expect(reachBand(39)).toBe('Emerging');
    expect(reachBand(40)).toBe('Established');
    expect(reachBand(69)).toBe('Established');
    expect(reachBand(70)).toBe('Major');
    expect(reachBand(100)).toBe('Major');
  });
});

describe('engagementQualifier', () => {
  it('labels engagement in plain language', () => {
    expect(engagementQualifier(null)).toBe('unknown');
    expect(engagementQualifier(0.5)).toBe('low');
    expect(engagementQualifier(2)).toBe('average');
    expect(engagementQualifier(5)).toBe('strong');
  });
});

describe('computeReachScore', () => {
  it('always stays within 0..100', () => {
    const max = computeReachScore({ totalFollowers: 50_000_000, avgEngagementRate: 30, growthPct: 50 });
    const min = computeReachScore({ totalFollowers: 0, avgEngagementRate: null, growthPct: -50 });
    expect(max.score).toBeLessThanOrEqual(100);
    expect(min.score).toBeGreaterThanOrEqual(0);
  });

  it('scores a brand-new artist with no data as low but non-negative', () => {
    const r = computeReachScore({ totalFollowers: 0, avgEngagementRate: null, growthPct: null });
    expect(r.score).toBe(REACH_TUNING.GROWTH_POINTS_NEUTRAL); // only the neutral growth middle
    expect(r.band).toBe('Emerging');
  });

  it('scores a strong, growing, engaged artist highly', () => {
    const r = computeReachScore({ totalFollowers: 2_000_000, avgEngagementRate: 6, growthPct: 12 });
    expect(r.score).toBeGreaterThan(REACH_TUNING.BAND_ESTABLISHED_MIN);
    expect(r.followerPoints + r.engagementPoints + r.growthPoints).toBe(r.score);
  });
});

describe('aggregateReach', () => {
  it('sums followers across platforms', () => {
    const { totalFollowers } = aggregateReach([
      { follower_count: 1000, engagement_rate: 2 },
      { follower_count: 500, engagement_rate: null },
      { follower_count: null, engagement_rate: null },
    ]);
    expect(totalFollowers).toBe(1500);
  });

  it('excludes null engagement from the average (does not treat null as 0)', () => {
    const { avgEngagementRate } = aggregateReach([
      { follower_count: 1000, engagement_rate: 4 },
      { follower_count: 1000, engagement_rate: null },
      { follower_count: 1000, engagement_rate: 6 },
    ]);
    expect(avgEngagementRate).toBe(5); // (4 + 6) / 2, the null is ignored
  });

  it('returns null engagement when no platform reports it', () => {
    const { avgEngagementRate } = aggregateReach([
      { follower_count: 1000, engagement_rate: null },
    ]);
    expect(avgEngagementRate).toBeNull();
  });
});

describe('computeGrowthPct', () => {
  it('returns null without a usable baseline', () => {
    expect(computeGrowthPct(1000, null)).toBeNull();
    expect(computeGrowthPct(1000, 0)).toBeNull();
  });

  it('computes percentage change', () => {
    expect(computeGrowthPct(1100, 1000)).toBeCloseTo(10);
    expect(computeGrowthPct(900, 1000)).toBeCloseTo(-10);
  });
});

describe('formatFollowers', () => {
  it('formats across ranges', () => {
    expect(formatFollowers(999)).toBe('999');
    expect(formatFollowers(1500)).toBe('1.5K');
    expect(formatFollowers(12_000)).toBe('12K');
    expect(formatFollowers(1_200_000)).toBe('1.2M');
    expect(formatFollowers(15_000_000)).toBe('15M');
  });
});
