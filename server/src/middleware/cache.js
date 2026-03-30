/**
 * Intelligent Cache Control Middleware
 *
 * Three layers:
 *   1. NO CACHE   – auth, sessions, tickets, orders, admin (private, never cached)
 *   2. SHORT CACHE – events, merch, artists, gallery, music (60s + stale-while-revalidate)
 *   3. LONG CACHE  – static assets: images, CSS, JS (1 year, immutable)
 *
 * CDN-compatible: uses standard Cache-Control + Vary headers.
 */

/* ── route classification ─────────────────────────────── */

const NO_CACHE_PREFIXES = [
  '/api/auth',
  '/api/tickets',
  '/api/orders',
  '/api/settings',
  '/api/analytics',
  '/api/contact',
];

const SHORT_CACHE_PREFIXES = [
  '/api/events',
  '/api/merch',
  '/api/artists',
  '/api/gallery',
  '/api/music',
  '/api/videos',
  '/api/vinyl',
  '/api/genres',
];

const LONG_CACHE_EXTENSIONS = /\.(png|jpe?g|gif|webp|avif|svg|ico|css|js|woff2?|ttf|eot|mp3|mp4|webm)$/i;

/* ── header values ────────────────────────────────────── */

const HEADERS_NO_CACHE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'Expires': '0',
};

const HEADERS_SHORT_CACHE = {
  'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
};

const HEADERS_LONG_CACHE = {
  'Cache-Control': 'public, max-age=31536000, immutable',
};

/* ── helpers ──────────────────────────────────────────── */

function matchesPrefix(url, prefixes) {
  for (const prefix of prefixes) {
    if (url.startsWith(prefix)) return true;
  }
  return false;
}

function isWriteMethod(method) {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

/* ── middleware ────────────────────────────────────────── */

/**
 * API cache middleware — applies cache headers based on route type.
 * Must be mounted BEFORE route handlers.
 */
export function apiCache(req, res, next) {
  const url = req.originalUrl.split('?')[0]; // strip query params for matching

  // All write operations: never cache
  if (isWriteMethod(req.method)) {
    Object.entries(HEADERS_NO_CACHE).forEach(([k, v]) => res.set(k, v));
    res.set('Vary', 'Cookie, Authorization');
    return next();
  }

  // No-cache routes (auth, tickets, orders, admin)
  if (matchesPrefix(url, NO_CACHE_PREFIXES)) {
    Object.entries(HEADERS_NO_CACHE).forEach(([k, v]) => res.set(k, v));
    res.set('Vary', 'Cookie, Authorization');
    return next();
  }

  // Short-cache routes (events, merch, artists, etc.)
  if (matchesPrefix(url, SHORT_CACHE_PREFIXES)) {
    Object.entries(HEADERS_SHORT_CACHE).forEach(([k, v]) => res.set(k, v));
    res.set('Vary', 'Accept-Encoding');
    return next();
  }

  // Default: no cache for unclassified API routes
  Object.entries(HEADERS_NO_CACHE).forEach(([k, v]) => res.set(k, v));
  next();
}

/**
 * Static asset cache middleware — applies long cache for images/CSS/JS.
 * Use as options for express.static() or as a standalone middleware.
 */
export function staticCacheHeaders(req, res, next) {
  const url = req.originalUrl.split('?')[0];

  if (LONG_CACHE_EXTENSIONS.test(url)) {
    Object.entries(HEADERS_LONG_CACHE).forEach(([k, v]) => res.set(k, v));
  }

  next();
}

/**
 * Upload files get moderate cache (tickets/payments may update)
 * Ticket images are immutable once generated, so we can cache aggressively.
 */
export function uploadsCacheHeaders(req, res, next) {
  const url = req.originalUrl;

  if (url.includes('/uploads/tickets/')) {
    // Ticket images are immutable (unique filename per ticket code)
    Object.entries(HEADERS_LONG_CACHE).forEach(([k, v]) => res.set(k, v));
  } else {
    // Payment proofs etc — short cache
    res.set('Cache-Control', 'private, max-age=300');
  }

  next();
}
