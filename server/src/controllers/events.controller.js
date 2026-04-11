import { prisma } from '../prisma.js';
import { validationResult } from 'express-validator';
import { generateTicketArtWithNanoBanana } from '../services/ticketArtGenerator.js';
import { notifyNewEvent } from '../services/newsletter.service.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const eventUploadsDir = path.resolve(process.cwd(), 'uploads', 'events');
function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
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

    // Notify subscribers (fire & forget)
    notifyNewEvent(item).catch(() => {});

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
export const generateTicketArt = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validación fallida', errors: errors.array() });

  try {
    const result = await generateTicketArtWithNanoBanana(req.body || {});
    res.status(201).json(result);
  } catch (err) {
    const details = String(err?.message || '').trim();
    const lowered = details.toLowerCase();
    if (lowered.includes('api key')) {
      return res.status(503).json({ message: 'Falta configurar la API key de Gemini para Nano Banana.', details });
    }
    if (lowered.includes('not installed') || lowered.includes('no está instalado')) {
      return res.status(503).json({ message: 'Nano Banana no está disponible en este proyecto.', details });
    }
    return res.status(502).json({ message: 'No se pudo generar el arte del ticket.', details });
  }
};
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No se recibió imagen' });
    ensureDir(eventUploadsDir);
    const ext = path.extname(req.file.originalname || '.jpg').toLowerCase() || '.jpg';
    const filename = crypto.randomUUID() + ext;
    const fullPath = path.join(eventUploadsDir, filename);
    fs.writeFileSync(fullPath, req.file.buffer);
    const relPath = '/uploads/events/' + filename;
    res.json({ url: relPath });
  } catch (err) {
    res.status(500).json({ message: 'Error al subir imagen', details: err?.message });
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
    ticket_design_json = null,
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
    ticket_design_json: ticket_design_json == null || ticket_design_json === '' ? null : String(ticket_design_json),
  };
}
