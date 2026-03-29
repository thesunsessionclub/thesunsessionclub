import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma.js';

const uploadRoot = path.resolve(process.cwd(), 'uploads', 'gallery');
const thumbRoot = path.resolve(process.cwd(), 'uploads', 'gallery', 'thumbs');

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function safeExt(name = '') {
  const ext = path.extname(name).toLowerCase().replace('.', '');
  return ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : null;
}

async function writeImage(file, filename, sharpLib) {
  ensureDir(uploadRoot);
  ensureDir(thumbRoot);
  const fullPath = path.join(uploadRoot, filename);
  const thumbPath = path.join(thumbRoot, filename);
  const ext = safeExt(file.originalname) || 'jpg';
  if (sharpLib) {
    await sharpLib(file.buffer)
      .resize(1920, 1920, { fit: 'inside' })
      .toFormat(ext === 'jpg' ? 'jpeg' : ext, { quality: 82 })
      .toFile(fullPath);
    await sharpLib(file.buffer)
      .resize(600, 600, { fit: 'inside' })
      .toFormat(ext === 'jpg' ? 'jpeg' : ext, { quality: 80 })
      .toFile(thumbPath);
  } else {
    fs.writeFileSync(fullPath, file.buffer);
    fs.writeFileSync(thumbPath, file.buffer);
  }
  return `uploads/gallery/${filename}`;
}

function parseJson(val, fallback) {
  try {
    const parsed = JSON.parse(val || '');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export const listEvents = async (req, res) => {
  try {
    const events = await prisma.galleryEvent.findMany({
      orderBy: [{ event_date: 'desc' }, { createdAt: 'desc' }],
      include: { images: true },
    });
    const rows = events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      location: e.location,
      event_date: e.event_date,
      category: e.category,
      cover_image: e.cover_image,
      cover_thumb: e.cover_image
        ? e.cover_image.replace('uploads/gallery/', 'uploads/gallery/thumbs/')
        : '',
      photographer: e.photographer,
      tags: e.tags,
      photo_count: (e.images || []).length,
      created_at: e.createdAt,
    }));
    res.json(rows);
  } catch {
    res.json([]);
  }
};

export const getEvent = async (req, res) => {
  const { id } = req.params;
  try {
    const event = await prisma.galleryEvent.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sort_order: 'asc' } },
        videos: true,
      },
    });
    if (!event) return res.status(404).json({ error: 'Not found' });
    res.json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        event_date: event.event_date,
        category: event.category,
        cover_image: event.cover_image,
        photographer: event.photographer,
        tags: event.tags,
        created_at: event.createdAt,
      },
      images: (event.images || []).map((i) => ({
        id: i.id,
        image_path: i.image_path,
        thumb_path: i.image_path.replace('uploads/gallery/', 'uploads/gallery/thumbs/'),
        is_cover: i.is_cover,
        sort_order: i.sort_order,
      })),
      videos: (event.videos || []).map((v) => ({ id: v.id, video_url: v.video_url })),
    });
  } catch {
    res.status(500).json({ error: 'Error' });
  }
};

export const saveEvent = async (req, res) => {
  try {
    const sharpLib = (await import('sharp')).default;
    const {
      event_id,
      title = '',
      description = '',
      location = '',
      event_date,
      category = '',
      photographer = '',
      tags = '',
      order_keys,
      existing_images,
      cover_key,
      videos,
      image_keys,
    } = req.body || {};

    if (!title.trim()) return res.status(400).json({ error: 'Title required' });

    const existingMap = parseJson(existing_images, {});
    const orderKeys = parseJson(order_keys, []);
    const videoList = parseJson(videos, []);
    const keys = Array.isArray(image_keys) ? image_keys : image_keys ? [image_keys] : [];

    const files = Array.isArray(req.files) ? req.files : [];
    const keyToPath = { ...existingMap };

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const key = keys[i] || `upload_${i}`;
      const ext = safeExt(file.originalname);
      if (!ext) continue;
      const filename = `gallery_${Date.now()}_${i}.${ext === 'jpeg' ? 'jpg' : ext}`;
      const relPath = await writeImage(file, filename, sharpLib);
      keyToPath[key] = relPath;
    }

    const ordered = [];
    if (Array.isArray(orderKeys) && orderKeys.length) {
      orderKeys.forEach((k) => {
        if (keyToPath[k]) ordered.push(keyToPath[k]);
      });
    } else {
      Object.values(keyToPath).forEach((p) => ordered.push(p));
    }

    if (!ordered.length) return res.status(400).json({ error: 'Images required' });

    const coverPath = cover_key && keyToPath[cover_key] ? keyToPath[cover_key] : ordered[0];

    let eventId = event_id || null;
    if (eventId) {
      await prisma.galleryEvent.update({
        where: { id: eventId },
        data: {
          title,
          description,
          location,
          event_date: event_date ? new Date(event_date) : null,
          category,
          cover_image: coverPath,
          photographer,
          tags,
        },
      });
    } else {
      const created = await prisma.galleryEvent.create({
        data: {
          title,
          description,
          location,
          event_date: event_date ? new Date(event_date) : null,
          category,
          cover_image: coverPath,
          photographer,
          tags,
        },
      });
      eventId = created.id;
    }

    const existingDb = await prisma.galleryImage.findMany({ where: { event_id: eventId } });
    const existingPaths = existingDb.map((i) => i.image_path);

    await prisma.galleryImage.deleteMany({ where: { event_id: eventId } });
    await prisma.galleryVideo.deleteMany({ where: { event_id: eventId } });

    for (let i = 0; i < ordered.length; i += 1) {
      const p = ordered[i];
      await prisma.galleryImage.create({
        data: {
          event_id: eventId,
          image_path: p,
          is_cover: p === coverPath,
          sort_order: i + 1,
        },
      });
    }

    if (Array.isArray(videoList)) {
      for (const v of videoList) {
        const url = String(v || '').trim();
        if (!url) continue;
        await prisma.galleryVideo.create({ data: { event_id: eventId, video_url: url } });
      }
    }

    const toKeep = new Set(ordered);
    existingPaths.forEach((old) => {
      if (!toKeep.has(old)) {
        const full = path.resolve(process.cwd(), old);
        const thumb = path.resolve(process.cwd(), old.replace('uploads/gallery/', 'uploads/gallery/thumbs/'));
        if (fs.existsSync(full)) fs.unlinkSync(full);
        if (fs.existsSync(thumb)) fs.unlinkSync(thumb);
      }
    });

    res.json({ ok: true, event_id: eventId });
  } catch (err) {
    res.status(500).json({ error: 'Save failed', details: err?.message });
  }
};

export const removeEvent = async (req, res) => {
  const { id } = req.params;
  try {
    const images = await prisma.galleryImage.findMany({ where: { event_id: id } });
    images.forEach((i) => {
      const full = path.resolve(process.cwd(), i.image_path);
      const thumb = path.resolve(process.cwd(), i.image_path.replace('uploads/gallery/', 'uploads/gallery/thumbs/'));
      if (fs.existsSync(full)) fs.unlinkSync(full);
      if (fs.existsSync(thumb)) fs.unlinkSync(thumb);
    });
    await prisma.galleryEvent.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(204).send();
  }
};
