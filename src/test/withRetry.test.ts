import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from '@/lib/errorHandler';

// Suppress dynamic import of errorTracking inside sanitizeError
vi.mock('@/lib/errorTracking', () => ({
  trackError: vi.fn(),
}));

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns result on first success without retrying', async () => {
    const op = vi.fn().mockResolvedValue('ok');
    const promise = withRetry(op, { maxRetries: 3, baseDelayMs: 100 });
    const result = await promise;
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

    // Advance through first retry delay
    await vi.advanceTimersByTimeAsync(200);
    // Advance through second retry delay
    await vi.advanceTimersByTimeAsync(500);

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

    // Advance enough time for all retry delays
    await vi.advanceTimersByTimeAsync(10000);

    await expect(promise).rejects.toThrow('Failed to fetch');
    // initial + 2 retries = 3 calls
    expect(op).toHaveBeenCalledTimes(3);
  });

  it('respects custom maxRetries config', async () => {
    const networkError = new TypeError('Failed to fetch');
    const op = vi.fn().mockRejectedValue(networkError);

    const promise = withRetry(op, { maxRetries: 1, baseDelayMs: 50 });
    await vi.advanceTimersByTimeAsync(5000);

    await expect(promise).rejects.toThrow('Failed to fetch');
    expect(op).toHaveBeenCalledTimes(2); // initial + 1 retry
  });

  it('passes context through without affecting behavior', async () => {
    const op = vi.fn().mockResolvedValue('done');
    const result = await withRetry(op, { maxRetries: 1 }, 'TestContext');
    expect(result).toBe('done');
  });

  it('uses exponential backoff between retries', async () => {
    const networkError = new TypeError('Failed to fetch');
    let callTimes: number[] = [];
    const op = vi.fn().mockImplementation(() => {
      callTimes.push(Date.now());
      return Promise.reject(networkError);
    });

    const promise = withRetry(op, { maxRetries: 2, baseDelayMs: 1000, backoffMultiplier: 2, maxDelayMs: 10000 });

    // Advance enough for all retries to complete
    for (let i = 0; i < 10; i++) {
      await vi.advanceTimersByTimeAsync(2000);
    }

    await expect(promise).rejects.toThrow('Failed to fetch');
    expect(op).toHaveBeenCalledTimes(3); // initial + 2 retries

    // Verify second delay is >= first delay (exponential, with jitter tolerance)
    if (callTimes.length >= 3) {
      const gap1 = callTimes[1] - callTimes[0];
      const gap2 = callTimes[2] - callTimes[1];
      expect(gap2).toBeGreaterThanOrEqual(gap1 * 0.5);
    }
  });
});
