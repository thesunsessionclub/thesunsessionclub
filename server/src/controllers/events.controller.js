import { prisma } from '../prisma.js';
import { validationResult } from 'express-validator';
/**
 * Eventos CRUD
 */
export const list = async (req, res) => {
  try {
    const items = await prisma.event.findMany({
      where: { deletedAt: null },
      orderBy: [{ sort_order: 'asc' }, { date: 'asc' }],
    });
    res.json(items);
  } catch (err) {
    res.json([]);
  }
};
export const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validación fallida', errors: errors.array() });
  try {
    const data = normalizeEvent(req.body);
    const item = await prisma.event.create({ data });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo crear evento', details: err?.message });
  }
};
export const update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validación fallida', errors: errors.array() });
  const { id } = req.params;
  try {
    const data = normalizeEvent(req.body);
    const item = await prisma.event.update({ where: { id }, data });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo actualizar evento', details: err?.message });
  }
};
export const remove = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  } catch {
    res.status(204).send();
  }
};
function normalizeEvent(body) {
  const {
    title = '',
    artists = '',
    location = '',
    venue = '',
    date = null,
    time = '',
    image = '',
    price = 0,
    genre = '',
    description = '',
    ticketLink = '',
    socialLink = '',
    isFree = false,
    ticket_limit = null,
    status = 'ACTIVE',
    featured = false,
    sort_order = 0,
  } = body || {};
  return {
    title,
    artists,
    location,
    venue,
    date: date ? new Date(date) : null,
    time,
    image,
    price: Number(price || 0),
    genre,
    description,
    ticketLink,
    socialLink,
    isFree: !!isFree,
    ticket_limit: ticket_limit == null || ticket_limit === '' ? null : Number(ticket_limit),
    status,
    featured: !!featured,
    sort_order: Number(sort_order || 0),
  };
}
