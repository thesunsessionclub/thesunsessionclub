import { prisma } from '../prisma.js';
import { validationResult } from 'express-validator';

function safeJson(value) {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return '{}';
  }
}

function toIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || null;
}

export const track = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validacion fallida', errors: errors.array() });

  const eventName = String(req.body?.event || '').trim();
  const page = String(req.body?.page || '').trim() || null;
  const meta = req.body?.meta ?? {};
  if (!eventName) return res.status(400).json({ message: 'Evento requerido' });

  try {
    await prisma.analyticsEvent.create({
      data: {
        userId: req.user?.id || null,
        event: eventName.slice(0, 120),
        page: page ? page.slice(0, 255) : null,
        meta: safeJson(meta),
        ip: toIp(req),
      },
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'No se pudo guardar analytics', details: err?.message });
  }
};

export const summary = async (_req, res) => {
  try {
    const [totalsByEvent, latest, totalUsers, vipUsers, totalOrders] = await Promise.all([
      prisma.analyticsEvent.groupBy({
        by: ['event'],
        _count: { _all: true },
        orderBy: { _count: { event: 'desc' } },
        take: 20,
      }),
      prisma.analyticsEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, event: true, page: true, createdAt: true, userId: true },
      }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, vipStatus: true } }),
      prisma.order.count(),
    ]);

    res.json({
      totals: {
        users: totalUsers,
        vip_users: vipUsers,
        orders: totalOrders,
      },
      top_events: totalsByEvent.map((row) => ({ event: row.event, count: row._count._all })),
      latest,
    });
  } catch (err) {
    res.status(500).json({ message: 'No se pudo obtener analytics', details: err?.message });
  }
};
