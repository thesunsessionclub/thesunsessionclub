import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { createRateLimiter } from './middleware/rateLimit.js';
import { apiCache, staticCacheHeaders, uploadsCacheHeaders } from './middleware/cache.js';

const app = express();
const projectRoot = path.resolve(process.cwd(), '..');

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'http://localhost:8001',
        'http://127.0.0.1:8001',
      ];
      if (!origin || origin === 'null') return callback(null, 'null');
      if (config.nodeEnv !== 'production') return callback(null, origin);
      if (allowed.includes(origin)) return callback(null, origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(morgan('dev'));

// Cache control: uploads (ticket images = immutable, payments = private short cache)
app.use('/uploads', uploadsCacheHeaders, express.static(path.resolve(process.cwd(), 'uploads')));

// Cache control: API routes (no-cache for auth/tickets/orders, short for events/merch/artists)
app.use('/api', apiCache);

// Rate limiters
app.use('/api/auth/login', createRateLimiter({ windowMs: 60_000, max: 20, keyPrefix: 'auth-login' }));
app.use('/api/auth/register', createRateLimiter({ windowMs: 60_000, max: 10, keyPrefix: 'auth-register' }));
app.use('/api/tickets/request', createRateLimiter({ windowMs: 60_000, max: 20, keyPrefix: 'tickets-request' }));
app.use('/api/orders', createRateLimiter({ windowMs: 60_000, max: 40, keyPrefix: 'orders' }));
app.use('/api/contact', createRateLimiter({ windowMs: 60_000, max: 8, keyPrefix: 'contact' }));
app.use('/api', createRateLimiter({ windowMs: 60_000, max: 300, keyPrefix: 'api-global' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api', routes);

// Cache control: static frontend assets (long cache for images/CSS/JS)
app.use(staticCacheHeaders);
app.use(express.static(projectRoot));

// Validate-ticket URL (linked from QR codes) → redirects to ticket viewer page
app.get('/validate-ticket/:code', (req, res) => {
  const code = String(req.params.code || '').trim();
  if (!code) return res.redirect('/');
  res.redirect(`/ticket.html?code=${encodeURIComponent(code)}`);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

export default app;
