import { describe, expect, it } from 'vitest';
import { nextRetryAt, retryDelayMs } from './syncRetry';

describe('shared-server sync retry', () => {
  it('backs off from 30 seconds and caps at five minutes', () => {
    expect([1, 2, 3, 4, 5, 6].map(retryDelayMs)).toEqual([30_000, 60_000, 120_000, 240_000, 300_000, 300_000]);
  });

  it('calculates the retry time from the supplied clock', () => {
    expect(nextRetryAt(2, 1_000)).toBe(61_000);
  });
});
