/** Fixed-window limiter (best effort per serverless instance; protects the Gemini quota). */
export function createLimiter(max = 20, windowMs = 60_000, now = Date.now) {
  const hits = new Map();
  return {
    allow(key) {
      const t = now();
      const entry = hits.get(key);
      if (!entry || t - entry.start >= windowMs) {
        if (hits.size > 5000) hits.clear();
        hits.set(key, { start: t, n: 1 });
        return true;
      }
      entry.n += 1;
      return entry.n <= max;
    },
  };
}
