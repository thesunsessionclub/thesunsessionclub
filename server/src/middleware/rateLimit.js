const buckets = new Map();

function nowMs() {
  return Date.now();
}

function toIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
}

function keyFor(req, keyPrefix) {
  return `${keyPrefix}:${toIp(req)}`;
}

export function createRateLimiter({ windowMs, max, keyPrefix }) {
  const safeWindow = Number(windowMs || 60000);
  const safeMax = Number(max || 60);
  const prefix = String(keyPrefix || 'global');

  return (req, res, next) => {
    const key = keyFor(req, prefix);
    const ts = nowMs();
    const current = buckets.get(key);
    if (!current || ts > current.resetAt) {
      buckets.set(key, { count: 1, resetAt: ts + safeWindow });
      next();
      return;
    }

    if (current.count >= safeMax) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - ts) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ message: 'Demasiadas solicitudes, intenta de nuevo en unos segundos' });
      return;
    }

    current.count += 1;
    buckets.set(key, current);
    next();
  };
}
