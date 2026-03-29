import { Router } from 'express';
import { URL } from 'url';

const router = Router();

router.get('/image', async (req, res) => {
  try {
    const { url } = req.query || {};
    if (!url || typeof url !== 'string') return res.status(400).send('Missing url');
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).send('Invalid url');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).send('Invalid protocol');
    const response = await fetch(url, { redirect: 'follow' });
    const ct = response.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) return res.status(415).send('Unsupported media type');
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const buf = Buffer.from(await response.arrayBuffer());
    res.send(buf);
  } catch {
    res.status(502).send('Fetch failed');
  }
});

export default router;
