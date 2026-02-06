/**
 * In-memory per-user rate limiter for expensive AI endpoints.
 *
 * Uses a sliding-window counter stored in a Map keyed by `userId:routeKey`.
 * Entries are lazily pruned on each request so no background timer is needed.
 *
 * Options:
 *   windowMs  – sliding window size in milliseconds  (default 60 000 = 1 min)
 *   max       – max requests per window per user      (default 10)
 *   keyPrefix – route-level namespace                 (default 'global')
 */

const hits = new Map(); // key → { timestamps: number[] }

export function rateLimit({ windowMs = 60_000, max = 10, keyPrefix = 'global' } = {}) {
  return (req, res, next) => {
    const userId = req.user?.id || req.ip || 'anon';
    const key = `${keyPrefix}:${userId}`;
    const now = Date.now();
    const cutoff = now - windowMs;

    let entry = hits.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      hits.set(key, entry);
    }

    // Drop timestamps outside the window
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);

    if (entry.timestamps.length >= max) {
      const retryAfter = Math.ceil((entry.timestamps[0] + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${retryAfter}s.`,
        retry_after_seconds: retryAfter,
      });
    }

    entry.timestamps.push(now);
    next();
  };
}
