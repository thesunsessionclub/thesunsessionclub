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

export const create = async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Nombre requerido' });
  try {
    const all = await prisma.genre.findMany({ select: { name: true } });
    const existing = all.find(g => g.name.toLowerCase() === name.toLowerCase());
    if (existing) return res.status(409).json({ message: 'El género ya existe' });
    const genre = await prisma.genre.create({ data: { name, status: 'active' } });
    res.json(genre);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const remove = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.genre.delete({ where: { id: Number(id) } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

const DEFAULT_GENRES = [
  // Electronic
  '140 / Deep Dubstep / Grime',
  'Afro House',
  'Amapiano',
  'Ambient / Experimental',
  'Bass / Club',
  'Bass House',
  'Brazilian Funk',
  'Breaks / Breakbeat / UK Bass',
  'Dance / Pop',
  'Deep House',
  'DJ Tools / Acapellas',
  'Downtempo',
  'Drum & Bass',
  'Dubstep',
  'Electro (Classic / Detroit / Modern)',
  'Electronica',
  'Funky House',
  'Hard Dance / Hardcore / Neo Rave',
  'Hard Techno',
  'House',
  'Indie Dance',
  'Jackin House',
  'Latin Electronic',
  'Mainstage',
  'Melodic House & Techno',
  'Minimal / Deep Tech',
  'Nu Disco / Disco',
  'Organic House',
  'Progressive House',
  'Psy-Trance',
  'Tech House',
  'Techno (Peak Time / Driving)',
  'Techno (Raw / Deep / Hypnotic)',
  'Trance (Main Floor)',
  'Trance (Raw / Deep / Hypnotic)',
  'Trap / Future Bass',
  'UK Garage / Bassline',
  // Open Format
  'African',
  'Caribbean',
  'Country',
  'DJ Edits',
  'Hip-Hop',
  'Latin',
  'Pop',
  'R&B',
  'Rock',
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
