/**
 * In-memory rate limiter middleware.
 *
 * Tracks requests per key (IP + optional x-user-id header) inside a
 * sliding window.  When the limit is exceeded the client receives a
 * 429 Too Many Requests response with a Retry-After header.
 *
 * Usage:
 *   const { rateLimit } = require("../middleware/rateLimit");
 *
 *   // 20 requests per 15-minute window (defaults)
 *   app.post("/api/events", rateLimit(), async (req, res) => { ... });
 *
 *   // Custom limits
 *   app.post("/api/auth/register", rateLimit({ windowMs: 60000, max: 5 }), ...);
 */

function rateLimit(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 20, // max requests per window
    message = "Too many requests, please try again later.",
  } = options;

  // Map<string, { count: number, resetTime: number }>
  const hits = new Map();

  // Periodically purge expired entries to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now >= entry.resetTime) {
        hits.delete(key);
      }
    }
  }, windowMs);

  // Allow the timer to be unreferenced so it doesn't keep the
  // process alive during tests or graceful shutdown.
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  function middleware(req, res, next) {
    const userId = req.headers["x-user-id"] || "anon";
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const key = `${ip}:${userId}`;
    const now = Date.now();

    let entry = hits.get(key);

    if (!entry || now >= entry.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
      hits.set(key, entry);
    } else {
      entry.count += 1;
    }

    // Set informational headers
    res.set("X-RateLimit-Limit", String(max));
    res.set("X-RateLimit-Remaining", String(Math.max(0, max - entry.count)));

    if (entry.count > max) {
      const retryAfterSec = Math.ceil((entry.resetTime - now) / 1000);
      res.set("Retry-After", String(retryAfterSec));
      return res.status(429).json({ error: message });
    }

    next();
  }

  // Expose internals for testing
  middleware._hits = hits;
  middleware._cleanup = cleanupInterval;

  return middleware;
}

module.exports = { rateLimit };
