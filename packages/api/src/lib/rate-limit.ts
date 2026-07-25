/**
 * Minimal in-process sliding-window rate limiter.
 *
 * Caveat: this state lives in a single server instance's memory. On
 * serverless/multi-instance deployments (e.g. Vercel functions) each
 * instance keeps its own counters, so a client can get up to
 * `limit * instanceCount` attempts by hitting different instances.
 * This is defense-in-depth, not a hard guarantee — pair it with
 * high-entropy secrets (e.g. invite codes) rather than relying on it
 * alone. A real distributed limit needs a shared store (Redis/Upstash).
 */

const WINDOW_MS = 60_000;
const MAX_KEYS = 10_000;

const hits = new Map<string, number[]>();

/** Drop entries whose most recent hit has already expired, to cap memory growth. */
function pruneMap(now: number): void {
  if (hits.size <= MAX_KEYS) return;
  for (const [key, timestamps] of hits) {
    const last = timestamps[timestamps.length - 1];
    if (last === undefined || now - last > WINDOW_MS) {
      hits.delete(key);
    }
  }
}

/**
 * Records an attempt for `key` and reports whether it is within the
 * allowed rate.
 *
 * @param key identifies the rate-limit bucket (e.g. `join-invite:${userId}`)
 * @param limit max attempts allowed per window
 * @param windowMs sliding window size in ms (defaults to 60s)
 * @returns true if the attempt is allowed, false if the limit was exceeded
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = WINDOW_MS,
): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter(
    (t) => now - t < windowMs,
  );

  if (timestamps.length >= limit) {
    hits.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  hits.set(key, timestamps);

  pruneMap(now);

  return true;
}
