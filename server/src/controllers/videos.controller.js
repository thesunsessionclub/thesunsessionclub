import { prisma } from '../prisma.js';
import { validationResult } from 'express-validator';

export const list = async (req, res) => {
  try {
    const items = await prisma.videoSet.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
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
    const item = await prisma.videoSet.create({ data });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo crear video', details: err?.message });
  }
};

export const update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validación fallida', errors: errors.array() });
  const { id } = req.params;
  try {
    const data = sanitize(req.body);
    const item = await prisma.videoSet.update({ where: { id }, data });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo actualizar video', details: err?.message });
  }
};

export const remove = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.videoSet.update({ where: { id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  } catch {
    res.status(204).send();
  }
};

function sanitize(body) {
  const {
    title,
    artist,
    date,
    location,
    thumbnail,
    youtubeLink,
    soundcloudLink,
    genre,
    featured,
    status,
  } = body || {};
  return {
    title,
    artist,
    date: date ? new Date(date) : null,
    location,
    thumbnail,
    youtubeLink,
    soundcloudLink,
    genre,
    featured: Boolean(featured),
    status: status || 'ACTIVE',
  };
}
