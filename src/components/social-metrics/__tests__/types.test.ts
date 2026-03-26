import { describe, it, expect } from 'vitest';
import { emptyMetrics, parseNum, parseFloat_, metricsSchema, ALL_PLATFORMS, PLATFORM_CONFIG } from '../types';

describe('emptyMetrics', () => {
  it('returns empty metrics for a given platform', () => {
    const m = emptyMetrics('spotify');
    expect(m.platform).toBe('spotify');
    expect(m.platform_username).toBe('');
    expect(m.profile_url).toBe('');
    expect(m.follower_count).toBeNull();
    expect(m.engagement_rate).toBeNull();
  });
});

describe('parseNum', () => {
  it('returns null for empty string', () => {
    expect(parseNum('')).toBeNull();
    expect(parseNum('   ')).toBeNull();
  });
  it('parses valid integers', () => {
    expect(parseNum('42')).toBe(42);
    expect(parseNum('0')).toBe(0);
  });
  it('returns null for non-numeric', () => {
    expect(parseNum('abc')).toBeNull();
  });
});

describe('parseFloat_', () => {
  it('returns null for empty string', () => {
    expect(parseFloat_('')).toBeNull();
  });
  it('parses floats', () => {
    expect(parseFloat_('3.14')).toBeCloseTo(3.14);
  });
  it('returns null for non-numeric', () => {
    expect(parseFloat_('xyz')).toBeNull();
  });
});

describe('metricsSchema', () => {
  it('accepts valid metrics', () => {
    const result = metricsSchema.safeParse({
      platform_username: 'user1',
      profile_url: 'https://example.com',
      follower_count: 100,
      likes_count: null,
      comments_count: null,
      shares_count: null,
      engagement_rate: 5.5,
      avg_likes_per_post: null,
      avg_comments_per_post: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects username over 100 chars', () => {
    const result = metricsSchema.safeParse({
      platform_username: 'a'.repeat(101),
      profile_url: '',
      follower_count: null,
      likes_count: null,
      comments_count: null,
      shares_count: null,
      engagement_rate: null,
      avg_likes_per_post: null,
      avg_comments_per_post: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid URL', () => {
    const result = metricsSchema.safeParse({
      platform_username: '',
      profile_url: 'ftp://bad',
      follower_count: null,
      likes_count: null,
      comments_count: null,
      shares_count: null,
      engagement_rate: null,
      avg_likes_per_post: null,
      avg_comments_per_post: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects engagement_rate over 100', () => {
    const result = metricsSchema.safeParse({
      platform_username: '',
      profile_url: '',
      follower_count: null,
      likes_count: null,
      comments_count: null,
      shares_count: null,
      engagement_rate: 101,
      avg_likes_per_post: null,
      avg_comments_per_post: null,
    });
    expect(result.success).toBe(false);
  });

  // Helper for concise boundary tests
  const parseMetrics = (overrides: Record<string, any>) =>
    metricsSchema.safeParse({
      platform_username: '',
      profile_url: '',
      follower_count: null,
      likes_count: null,
      comments_count: null,
      shares_count: null,
      engagement_rate: null,
      avg_likes_per_post: null,
      avg_comments_per_post: null,
      ...overrides,
    });

  it('accepts URL at exactly 500 chars', () => {
    const url = 'https://' + 'a'.repeat(492);
    expect(url).toHaveLength(500);
    expect(parseMetrics({ profile_url: url }).success).toBe(true);
  });

  it('rejects URL exceeding 500 chars', () => {
    const url = 'https://' + 'a'.repeat(493);
    expect(url).toHaveLength(501);
    const result = parseMetrics({ profile_url: url });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('URL too long');
    }
  });

  it('accepts engagement_rate at 0', () => {
    expect(parseMetrics({ engagement_rate: 0 }).success).toBe(true);
  });

  it('accepts engagement_rate at 100', () => {
    expect(parseMetrics({ engagement_rate: 100 }).success).toBe(true);
  });

  it('rejects engagement_rate at -0.01', () => {
    expect(parseMetrics({ engagement_rate: -0.01 }).success).toBe(false);
  });

  it('rejects engagement_rate at 100.01', () => {
    expect(parseMetrics({ engagement_rate: 100.01 }).success).toBe(false);
  });

  it('accepts engagement_rate as null', () => {
    expect(parseMetrics({ engagement_rate: null }).success).toBe(true);
  });

  it('accepts empty URL string', () => {
    expect(parseMetrics({ profile_url: '' }).success).toBe(true);
  });

  it('accepts username at exactly 100 chars', () => {
    expect(parseMetrics({ platform_username: 'a'.repeat(100) }).success).toBe(true);
  });
});

describe('constants', () => {
  it('ALL_PLATFORMS has 4 entries', () => {
    expect(ALL_PLATFORMS).toHaveLength(4);
  });

  it('PLATFORM_CONFIG has config for each platform', () => {
    for (const p of ALL_PLATFORMS) {
      expect(PLATFORM_CONFIG[p]).toBeDefined();
      expect(PLATFORM_CONFIG[p].name).toBeTruthy();
    }
  });
});
