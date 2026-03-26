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
