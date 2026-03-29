import { prisma } from '../prisma.js';
import { validationResult } from 'express-validator';

export const list = async (req, res) => {
  try {
    const items = await prisma.music.findMany({ where: { deletedAt: null }, orderBy: { release_date: 'desc' } });
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
    const item = await prisma.music.create({ data });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo crear track', details: err?.message });
  }
};
export const update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validación fallida', errors: errors.array() });
  const { id } = req.params;
  try {
    const data = sanitize(req.body);
    const item = await prisma.music.update({ where: { id }, data });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo actualizar track', details: err?.message });
  }
};
export const remove = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.music.update({ where: { id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  } catch {
    res.status(204).send();
  }
};
function sanitize(body) {
  const { title, artist_id, cover_image, audio_file_url, platform_links, price, release_date, status } = body || {};
  return {
    title,
    artist_id,
    cover_image,
    audio_file_url,
    platform_links,
    price: Number(price || 0),
    release_date: release_date ? new Date(release_date) : null,
    status,
  };
}
