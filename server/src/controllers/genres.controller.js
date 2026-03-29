import { prisma } from '../prisma.js';

export const list = async (req, res) => {
  try {
    await ensureGenres();
    const items = await prisma.genre.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(items);
  } catch {
    res.json([]);
  }
};

const DEFAULT_GENRES = [
  'Techno',
  'House',
  'Deep Tech',
  'Minimal',
  'Progressive',
  'Tech House',
  'Melodic',
  'Tribal',
  'Reggeton',
  'Generico',
];

async function ensureGenres() {
  const existing = await prisma.genre.findMany({ select: { name: true } });
  const existingSet = new Set(existing.map((g) => String(g.name || '').toLowerCase()));
  const missing = DEFAULT_GENRES.filter((name) => !existingSet.has(name.toLowerCase()));
  if (missing.length) {
    await prisma.genre.createMany({
      data: missing.map((name) => ({ name, status: 'active' })),
    });
    console.log('Géneros asegurados:', missing.join(', '));
  }
}

export async function seedIfEmpty() {
  try {
    await ensureGenres();
  } catch (e) {
    console.log('Seed géneros omitido:', e?.message || e);
  }
}
