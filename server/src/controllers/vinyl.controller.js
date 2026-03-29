import { prisma } from '../prisma.js';
import { validationResult } from 'express-validator';

export const list = async (req, res) => {
  try {
    const items = await prisma.vinylRelease.findMany({ where: { deletedAt: null }, orderBy: { release_date: 'desc' } });
    res.json(items);
  } catch {
    res.json([]);
  }
};
export const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validación fallida', errors: errors.array() });
  try {
    const data = sanitize(req.body);
    const item = await prisma.vinylRelease.create({ data });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo crear vinilo', details: err?.message });
  }
};
export const update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validación fallida', errors: errors.array() });
  const { id } = req.params;
  try {
    const data = sanitize(req.body);
    const item = await prisma.vinylRelease.update({ where: { id }, data });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo actualizar vinilo', details: err?.message });
  }
};
export const remove = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.vinylRelease.update({ where: { id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  } catch {
    res.status(204).send();
  }
};
function sanitize(body) {
  const { title, artist, cover_image, description, price, release_date, stock, status } = body || {};
  return {
    title,
    artist,
    cover_image,
    description,
    price: Number(price || 0),
    release_date: release_date ? new Date(release_date) : null,
    stock: Number(stock || 0),
    status,
  };
}
