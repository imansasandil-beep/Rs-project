import { tooManyRequests } from '../lib/errors.js';
import { config } from '../config/env.js';

/**
 * A fixed-window counter held in memory. This instance is a single process
 * serving one household, so a shared store would be infrastructure with no
 * users. If Rs ever runs multiple processes, this needs to move to the database.
 */
export function rateLimit({ windowMs = 60_000, max = 60, key = defaultKey } = {}) {
  const hits = new Map();

  // Drop expired windows periodically so a scan of unique IPs cannot grow the
  // map forever. `unref` keeps this timer from holding the process open.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [id, entry] of hits) if (entry.resetAt <= now) hits.delete(id);
  }, windowMs).unref();

  const middleware = (req, res, next) => {
    // Rate limiting a test suite just makes it flaky.
    if (config.env === 'test') return next();

    const id = key(req);
    const now = Date.now();
    const entry = hits.get(id);

    if (!entry || entry.resetAt <= now) {
      hits.set(id, { count: 1, resetAt: now + windowMs });
      setHeaders(res, max, max - 1, now + windowMs);
      return next();
    }

    entry.count += 1;
    setHeaders(res, max, Math.max(0, max - entry.count), entry.resetAt);

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return next(tooManyRequests('Too many requests, please slow down'));
    }

    next();
  };

  middleware.stop = () => clearInterval(sweep);
  return middleware;
}

function setHeaders(res, limit, remaining, resetAt) {
  res.set('RateLimit-Limit', String(limit));
  res.set('RateLimit-Remaining', String(remaining));
  res.set('RateLimit-Reset', String(Math.ceil((resetAt - Date.now()) / 1000)));
}

/** Signed-in users get their own bucket; everyone else is grouped by address. */
function defaultKey(req) {
  return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
}

/**
 * Login and registration are the endpoints worth guessing against, so they get
 * a much tighter budget, counted per email rather than per address — one
 * attacker behind a shared NAT should not lock out everyone else on it.
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  key: (req) => `auth:${req.ip}:${String(req.body?.email ?? '').toLowerCase()}`,
});
