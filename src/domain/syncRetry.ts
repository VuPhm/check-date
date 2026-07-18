const INITIAL_RETRY_MS = 30_000;
const MAX_RETRY_MS = 5 * 60_000;

/**
 * A deterministic, capped backoff for an unavailable shared server. Keeping it
 * pure makes the "server was turned off" behavior easy to test and avoids a
 * retry storm from every open device.
 */
export function retryDelayMs(failedAttempts: number): number {
  const attempt = Math.max(1, Math.floor(failedAttempts));
  return Math.min(MAX_RETRY_MS, INITIAL_RETRY_MS * (2 ** (attempt - 1)));
}

export function nextRetryAt(failedAttempts: number, from = Date.now()): number {
  return from + retryDelayMs(failedAttempts);
}
