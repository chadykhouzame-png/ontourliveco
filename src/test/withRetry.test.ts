import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from '@/lib/errorHandler';

vi.mock('@/lib/errorTracking', () => ({
  trackError: vi.fn(),
}));

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Ensure DEV mode is off so sanitizeError doesn't trigger dynamic imports
    vi.stubEnv('DEV', '');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('returns result on first success without retrying', async () => {
    const op = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(op, { maxRetries: 3, baseDelayMs: 100 });
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable error and succeeds', async () => {
    const networkError = new TypeError('Failed to fetch');
    const op = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('recovered');

    const promise = withRetry(op, { maxRetries: 3, baseDelayMs: 100 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('recovered');
    expect(op).toHaveBeenCalledTimes(3);
  });

  it('throws immediately for non-retryable errors', async () => {
    const authError = new Error('Invalid email format');
    const op = vi.fn().mockRejectedValue(authError);

    await expect(withRetry(op, { maxRetries: 3, baseDelayMs: 100 }))
      .rejects.toThrow('Invalid email format');
    expect(op).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting all retries', async () => {
    const networkError = new TypeError('Failed to fetch');
    const op = vi.fn().mockRejectedValue(networkError);

    const promise = withRetry(op, { maxRetries: 2, baseDelayMs: 100 });
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('Failed to fetch');
    expect(op).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('respects custom maxRetries config', async () => {
    const networkError = new TypeError('Failed to fetch');
    const op = vi.fn().mockRejectedValue(networkError);

    const promise = withRetry(op, { maxRetries: 1, baseDelayMs: 50 });
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('Failed to fetch');
    expect(op).toHaveBeenCalledTimes(2); // initial + 1 retry
  });

  it('passes context through without affecting behavior', async () => {
    const op = vi.fn().mockResolvedValue('done');
    const result = await withRetry(op, { maxRetries: 1 }, 'TestContext');
    expect(result).toBe('done');
  });

  it('applies exponential backoff delays between retries', async () => {
    const networkError = new TypeError('Failed to fetch');
    const callTimes: number[] = [];
    const op = vi.fn().mockImplementation(() => {
      callTimes.push(Date.now());
      return Promise.reject(networkError);
    });

    const promise = withRetry(op, { maxRetries: 2, baseDelayMs: 1000, backoffMultiplier: 2, maxDelayMs: 10000 });
    await vi.runAllTimersAsync();
    await promise.catch(() => {}); // swallow expected rejection

    expect(op).toHaveBeenCalledTimes(3);

    // Verify delays increase (with jitter tolerance)
    const gap1 = callTimes[1] - callTimes[0];
    const gap2 = callTimes[2] - callTimes[1];
    // Base delay is 1000ms, second should be ~2000ms (2x backoff, ±25% jitter)
    expect(gap1).toBeGreaterThanOrEqual(750);  // 1000 * 0.75
    expect(gap2).toBeGreaterThanOrEqual(1500); // 2000 * 0.75
    expect(gap2).toBeGreaterThan(gap1 * 0.75);
  });
});
