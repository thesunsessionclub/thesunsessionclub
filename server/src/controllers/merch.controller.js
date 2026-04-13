import { prisma } from '../prisma.js';
import { validationResult } from 'express-validator';
import { broadcast } from '../socket.js';
import QRCode from 'qrcode';
import { randomBytes } from 'node:crypto';

function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
}

function normalizeLayer(raw, fallback = 'public') {
  const v = String(raw || fallback).trim().toLowerCase();
  if (v === 'public' || v === 'member' || v === 'elite' || v === 'hidden' || v === 'diamond') return v;
  return fallback;
}

function normalizeHiddenType(raw) {
  const v = String(raw || 'none').trim().toLowerCase();
  if (v === 'none' || v === 'qr' || v === 'invite' || v === 'level' || v === 'time') return v;
  return 'none';
}

function parseMerchMeta(description) {
  const base = {
    visibility: 'public',
    hidden_type: 'none',
    required_level: 'member',
    secret_token: '',
    invite_code: '',
    hidden_from: '',
    hidden_until: '',
  };
  const raw = String(description || '').trim();
  if (!raw) return base;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      return {
        ...obj,
        visibility: normalizeLayer(obj.visibility, 'public'),
        hidden_type: normalizeHiddenType(obj.hidden_type),
        required_level: normalizeLayer(obj.required_level, 'member'),
        secret_token: String(obj.secret_token || '').trim(),
        invite_code: String(obj.invite_code || '').trim(),
        hidden_from: String(obj.hidden_from || '').trim(),
        hidden_until: String(obj.hidden_until || '').trim(),
      };
    }
  } catch {
    return base;
  }
  return base;
}

function roleLevel(role) {
  const r = String(role || '').toUpperCase();
  if (r === 'ADMIN') return 5;
  if (r === 'DIAMOND') return 4;
  if (r === 'ELITE') return 3;
  if (r === 'MEMBER') return 2;
  return 1;
}

function requiredLevelToInt(level) {
  const l = String(level || '').toLowerCase();
  if (l === 'diamond') return 4;
  if (l === 'elite') return 3;
  if (l === 'member') return 2;
  if (l === 'public') return 1;
  return 2;
}

function isInTimeWindow(meta, nowMs = Date.now()) {
  const from = meta.hidden_from ? new Date(meta.hidden_from).getTime() : null;
  const until = meta.hidden_until ? new Date(meta.hidden_until).getTime() : null;
  if (from && !Number.isNaN(from) && nowMs < from) return false;
  if (until && !Number.isNaN(until) && nowMs > until) return false;
  return true;
}

function buildAccessContext(req) {
  const token = String(req.query?.access_token || req.query?.access || req.headers['x-access-token'] || '').trim();
  const invite = String(req.query?.invite_code || req.query?.invite || req.headers['x-invite-code'] || '').trim();
  const role = String(req.user?.role || '').toUpperCase();
  return {
    role,
    level: roleLevel(role),
    isAdmin: role === 'ADMIN',
    accessToken: token,
    inviteCode: invite,
  };
}

function canAccessProduct(item, ctx) {
  const meta = parseMerchMeta(item.description);
  if (ctx.isAdmin) return true;

  const unlockedByToken = !!meta.secret_token && !!ctx.accessToken && ctx.accessToken === meta.secret_token;
  const unlockedByInvite = !!meta.invite_code && !!ctx.inviteCode && ctx.inviteCode.toLowerCase() === meta.invite_code.toLowerCase();
  const unlockedByLevel = ctx.level >= requiredLevelToInt(meta.required_level || meta.visibility);

  if (meta.hidden_type === 'qr') return unlockedByToken;
  if (meta.hidden_type === 'invite') return unlockedByInvite;
  if (meta.hidden_type === 'level') return unlockedByLevel;
  if (meta.hidden_type === 'time' && !isInTimeWindow(meta)) return false;

  if (meta.visibility === 'public') return true;
  if (meta.visibility === 'member') return unlockedByToken || unlockedByInvite || ctx.level >= 2;
  if (meta.visibility === 'elite') return unlockedByToken || unlockedByInvite || ctx.level >= 3;
  if (meta.visibility === 'diamond') return unlockedByToken || unlockedByInvite || ctx.level >= 4;
  if (meta.visibility === 'hidden') return unlockedByToken || unlockedByInvite || unlockedByLevel;

  return true;
}

export const list = async (req, res) => {
  try {
    const ctx = buildAccessContext(req);
    const includeDeleted = ctx.isAdmin && String(req.query?.include_deleted || '').trim() === '1';
    const where = ctx.isAdmin
      ? (includeDeleted ? {} : { deletedAt: null })
      : { deletedAt: null, status: 'ACTIVE' };
    const items = await prisma.merchProduct.findMany({
      where,
      include: { color_variants: true },
      orderBy: { createdAt: 'desc' },
    });

    const filtered = items.filter((item) => canAccessProduct(item, ctx));
    res.json(filtered);
  } catch {
    res.json([]);
  }
};

export const getOne = async (req, res) => {
  const { id } = req.params;
  try {
    const ctx = buildAccessContext(req);
    const where = ctx.isAdmin
      ? { id, deletedAt: null }
      : { id, deletedAt: null, status: 'ACTIVE' };
    const item = await prisma.merchProduct.findFirst({
      where,
      include: { color_variants: true },
    });
    if (!item) return res.status(404).json({ message: 'Producto no encontrado' });

    if (!canAccessProduct(item, ctx)) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo obtener producto', details: err?.message });
  }
};

export const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validacion fallida', errors: errors.array() });
  try {
    const data = sanitize(req.body);
    const item = await prisma.merchProduct.create({
      data: {
        ...data.base,
        color_variants: {
          create: data.colors,
        },
      },
      include: { color_variants: true },
    });
    res.status(201).json(item);
    broadcast('merch:update', null);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo crear producto', details: err?.message });
  }
};

export const update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validacion fallida', errors: errors.array() });
  const { id } = req.params;
  try {
    const data = sanitize(req.body);
    const item = await prisma.$transaction(async (tx) => {
      await tx.productColor.deleteMany({ where: { product_id: id } });
      return tx.merchProduct.update({
        where: { id },
        data: {
          ...data.base,
          color_variants: {
            create: data.colors,
          },
        },
        include: { color_variants: true },
      });
    });
    res.json(item);
    broadcast('merch:update', null);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo actualizar producto', details: err?.message });
  }
};

export const remove = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.merchProduct.update({ where: { id }, data: { deletedAt: new Date() } });
    res.status(204).send();
    broadcast('merch:update', null);
  } catch {
    res.status(204).send();
  }
};

export const permanentDelete = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.productColor.deleteMany({ where: { product_id: id } });
    await prisma.merchProduct.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(204).send();
  }
};

export const restore = async (req, res) => {
  const { id } = req.params;
  try {
    const item = await prisma.merchProduct.update({
      where: { id },
      data: { deletedAt: null },
      include: { color_variants: true },
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo restaurar producto', details: err?.message });
  }
};

export const generateAccessLink = async (req, res) => {
  const { id } = req.params;
  const mode = normalizeHiddenType(req.body?.mode || 'qr');
  const expiresInHours = Number(req.body?.expires_in_hours || 0);

  try {
    const current = await prisma.merchProduct.findUnique({ where: { id } });
    if (!current || current.deletedAt) return res.status(404).json({ message: 'Producto no encontrado' });

    const meta = parseMerchMeta(current.description);
    const now = Date.now();
    if (expiresInHours > 0) {
      meta.hidden_from = new Date(now).toISOString();
      meta.hidden_until = new Date(now + expiresInHours * 3600000).toISOString();
    }

    meta.visibility = mode === 'level' ? normalizeLayer(req.body?.visibility || 'member', 'member') : 'hidden';
    meta.hidden_type = mode === 'none' ? 'qr' : mode;

    let token = '';
    if (mode === 'invite') {
      token = String(req.body?.invite_code || '').trim() || ('INV-' + randomBytes(3).toString('hex').toUpperCase());
      meta.invite_code = token;
    } else {
      token = String(req.body?.access_token || '').trim() || randomBytes(9).toString('hex');
      meta.secret_token = token;
    }

    meta.required_level = normalizeLayer(req.body?.required_level || meta.required_level || 'member', 'member');

    const updated = await prisma.merchProduct.update({
      where: { id },
      data: { description: JSON.stringify(meta) },
      include: { color_variants: true },
    });

    const origin = String(req.body?.origin || req.headers.origin || '').replace(/\/$/, '') || 'https://sunsessionclub.com';
    const param = mode === 'invite' ? ('invite=' + encodeURIComponent(token)) : ('access=' + encodeURIComponent(token));
    const productUrl = origin + '/product.html?id=' + encodeURIComponent(id) + '&' + param;
    const merchUrl = origin + '/merch.html?' + param;

    let qrDataUrl = '';
    if (mode === 'qr' || mode === 'invite') {
      qrDataUrl = await QRCode.toDataURL(productUrl, { margin: 1, width: 320 });
    }

    res.json({
      ok: true,
      mode,
      token,
      product_url: productUrl,
      merch_url: merchUrl,
      qr_data_url: qrDataUrl,
      product: updated,
    });
  } catch (err) {
    res.status(500).json({ message: 'No se pudo generar link secreto', details: err?.message });
  }
};

function sanitize(body) {
  const {
    product_name,
    description,
    images,
    price,
    sizes,
    stock,
    category,
    featured,
    new_drop,
    index_featured,
    status,
    colors,
  } =
    body || {};
  const parsedColors = Array.isArray(colors) ? colors : [];
  return {
    base: {
      product_name,
      description,
      images,
      price: Number(price || 0),
      sizes,
      stock: Number(stock || 0),
      category,
      featured: toBool(featured),
      new_drop: toBool(new_drop),
      index_featured: toBool(index_featured),
      status,
    },
    colors: parsedColors
      .map((c) => ({
        color_name: String(c?.color_name || '').trim(),
        color_hex: String(c?.color_hex || '').trim(),
        image: String(c?.image || '').trim(),
      }))
      .filter((c) => c.color_name && c.color_hex),
  };
}
