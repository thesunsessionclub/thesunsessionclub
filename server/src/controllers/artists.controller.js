import { prisma } from '../prisma.js';
import { validationResult } from 'express-validator';

export const list = async (req, res) => {
  try {
    const items = await prisma.artist.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: { genres: { include: { genre: true } } }
    });
    const mapped = items.map(a => ({
      ...a,
      genres_list: (a.genres || []).map(g => g.genre),
    }));
    res.json(mapped);
  } catch {
    res.json([]);
  }
};
export const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validación fallida', errors: errors.array() });
  try {
    const data = sanitize(req.body);
    const genreIds = (Array.isArray(req.body.genre_ids) ? req.body.genre_ids : []).map(id => String(id || '')).filter(id => !!id);
    console.log('Crear artista payload', { data, genreIds });
    const item = await prisma.artist.create({ data });
    if (genreIds.length) {
      const valid = await prisma.genre.findMany({ where: { id: { in: genreIds } }, select: { id: true } });
      const ids = valid.map(g => g.id);
      if (ids.length) {
        const uniques = Array.from(new Set(ids));
        await prisma.artistGenre.createMany({
          data: uniques.map(genreId => ({ artistId: item.id, genreId })),
        });
      }
    }
    const full = await prisma.artist.findUnique({
      where: { id: item.id },
      include: { genres: { include: { genre: true } } }
    });
    res.status(201).json(full);
  } catch (err) {
    console.log('Error crear artista', err?.message || err);
    res.status(500).json({ message: 'No se pudo crear artista', details: err?.message });
  }
};
export const update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validación fallida', errors: errors.array() });
  const { id } = req.params;
  try {
    const data = sanitize(req.body);
    const genreIds = (Array.isArray(req.body.genre_ids) ? req.body.genre_ids : []).map(id => String(id || '')).filter(id => !!id);
    console.log('Actualizar artista', { id, data, genreIds });
    await prisma.artist.update({ where: { id }, data });
    await prisma.artistGenre.deleteMany({ where: { artistId: id } });
    if (genreIds.length) {
      const valid = await prisma.genre.findMany({ where: { id: { in: genreIds } }, select: { id: true } });
      const ids = valid.map(g => g.id);
      if (ids.length) {
        const uniques = Array.from(new Set(ids));
        await prisma.artistGenre.createMany({
          data: uniques.map(genreId => ({ artistId: id, genreId })),
        });
      }
    }
    const full = await prisma.artist.findUnique({
      where: { id },
      include: { genres: { include: { genre: true } } }
    });
    res.json(full);
  } catch (err) {
    console.log('Error actualizar artista', err?.message || err);
    res.status(500).json({ message: 'No se pudo actualizar artista', details: err?.message });
  }
};
export const remove = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.artist.update({ where: { id }, data: { deletedAt: new Date() } });
    await prisma.artistGenre.deleteMany({ where: { artistId: id } });
    res.status(204).send();
  } catch {
    res.status(204).send();
  }
};
function sanitize(body) {
  const { name, genre, bio, profile_image, social_links, featured, status } = body || {};
  return {
    name: String(name || '').trim(),
    genre: typeof genre === 'string' ? genre : undefined,
    bio: typeof bio === 'string' ? bio : undefined,
    profile_image: typeof profile_image === 'string' ? profile_image : undefined,
    social_links: typeof social_links === 'string' ? social_links : undefined,
    featured: !!featured,
    status: String(status || 'ACTIVE').trim()
  };
}
