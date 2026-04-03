import { prisma } from '../prisma.js';
import { validationResult } from 'express-validator';
import { randomBytes } from 'node:crypto';

/**
 * POST /api/newsletter/subscribe
 * Public endpoint – anyone can subscribe from the footer form
 */
export const subscribe = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validación fallida', errors: errors.array() });

  const email = String(req.body?.email || '').trim().toLowerCase();
  const name = String(req.body?.name || '').trim() || null;

  if (!email) return res.status(400).json({ message: 'Email requerido' });

  try {
    const existing = await prisma.subscriber.findUnique({ where: { email } });

    if (existing) {
      if (existing.active) {
        return res.json({ ok: true, already: true, message: 'Ya estás suscrito' });
      }
      // Re-activate
      await prisma.subscriber.update({
        where: { email },
        data: { active: true, name: name || existing.name, unsubscribedAt: null },
      });
      return res.json({ ok: true, reactivated: true, message: 'Suscripción reactivada' });
    }

    await prisma.subscriber.create({
      data: { email, name, tier: 'FREE', active: true },
    });

    return res.status(201).json({ ok: true, message: 'Suscripción exitosa' });
  } catch (err) {
    if (err?.code === 'P2002') {
      return res.json({ ok: true, already: true, message: 'Ya estás suscrito' });
    }
    return res.status(500).json({ message: 'Error al suscribirse', details: err?.message });
  }
};

/**
 * GET /api/newsletter/unsubscribe?token=xxx
 * Public – unsubscribe via link in email
 */
export const unsubscribe = async (req, res) => {
  const token = String(req.query?.token || '').trim();
  if (!token) return res.status(400).json({ message: 'Token requerido' });

  try {
    // Token is base64(email)
    const email = Buffer.from(token, 'base64').toString('utf8').toLowerCase().trim();
    if (!email || !email.includes('@')) return res.status(400).json({ message: 'Token inválido' });

    const sub = await prisma.subscriber.findUnique({ where: { email } });
    if (!sub) return res.status(404).json({ message: 'Suscriptor no encontrado' });

    await prisma.subscriber.update({
      where: { email },
      data: { active: false, unsubscribedAt: new Date() },
    });

    // Return a simple HTML page confirming unsubscribe
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cancelar suscripción</title>
      <style>body{background:#060d08;color:#fff;font-family:'Helvetica Neue',sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;}
      .box{text-align:center;padding:40px;}.check{font-size:48px;margin-bottom:16px;}h2{color:#00FFAA;}</style></head>
      <body><div class="box"><div class="check">✓</div><h2>Suscripción cancelada</h2><p>Ya no recibirás notificaciones de The Sun Session Club.</p></div></body></html>`);
  } catch (err) {
    return res.status(500).json({ message: 'Error al cancelar suscripción', details: err?.message });
  }
};

/**
 * GET /api/newsletter/subscribers  (admin only)
 */
export const listSubscribers = async (req, res) => {
  try {
    const activeOnly = req.query?.active !== '0';
    const where = activeOnly ? { active: true } : {};
    const subs = await prisma.subscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, tier: true, active: true, createdAt: true },
    });
    res.json(subs);
  } catch {
    res.json([]);
  }
};

/**
 * PUT /api/newsletter/subscribers/:id/tier  (admin only)
 * Update a subscriber's tier
 */
export const updateTier = async (req, res) => {
  const { id } = req.params;
  const tier = String(req.body?.tier || 'FREE').toUpperCase();
  const validTiers = ['FREE', 'MEMBER', 'VIP', 'ELITE', 'DIAMOND'];
  if (!validTiers.includes(tier)) return res.status(400).json({ message: 'Tier inválido' });

  try {
    const sub = await prisma.subscriber.update({ where: { id }, data: { tier } });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo actualizar tier', details: err?.message });
  }
};
