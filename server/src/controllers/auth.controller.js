import { prisma } from '../prisma.js';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import { signAccessToken, signRefreshToken } from '../utils/tokens.js';
import { config } from '../config/env.js';
import { logActivity } from '../middleware/auth.js';

const ALLOWED_ROLES = new Set(['ADMIN', 'USER', 'PROPIETARIO', 'INQUILINO', 'MEMBER', 'ELITE', 'DIAMOND']);

function setAuthCookies(res, accessToken, refreshToken) {
  const common = {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.secureCookies,
    domain: config.cookieDomain,
    path: '/',
  };
  res.cookie('access_token', accessToken, { ...common });
  res.cookie('refresh_token', refreshToken, { ...common });
}

function sanitizeRole(raw) {
  const role = String(raw || 'USER').toUpperCase();
  return ALLOWED_ROLES.has(role) ? role : 'USER';
}

function roleToLevel(role) {
  const r = String(role || '').toUpperCase();
  if (r === 'ADMIN') return 'admin';
  if (r === 'DIAMOND') return 'diamond';
  if (r === 'ELITE') return 'elite';
  if (r === 'MEMBER') return 'member';
  if (r === 'USER') return 'public';
  return 'public';
}

function canInvite(role) {
  const r = String(role || '').toUpperCase();
  return r === 'ADMIN' || r === 'DIAMOND' || r === 'ELITE';
}

export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validacion fallida', errors: errors.array() });
  }

  const { name, email, password, phone } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(name || '').trim();
  // Public signup must never escalate privileges.
  const cleanRole = 'USER';

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: cleanEmail },
        { name: cleanName },
      ],
    },
  });
  if (existing) return res.status(409).json({ message: 'Usuario ya registrado' });

  const passwordHash = await bcrypt.hash(String(password || ''), 10);
  const user = await prisma.user.create({
    data: {
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      phone,
      role: cleanRole,
      vipStatus: false,
      purchaseCount: 0,
      eventParticipation: 0,
    },
  });

  await logActivity(user.id, 'register', 'auth', req.ip);
  const access = signAccessToken(user);
  const refresh = signRefreshToken(user);
  setAuthCookies(res, access, refresh);

  res.status(201).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      vip_status: !!user.vipStatus,
      purchase_count: Number(user.purchaseCount || 0),
      event_participation: Number(user.eventParticipation || 0),
      last_login: user.lastLogin,
      membership_level: roleToLevel(user.role),
      can_invite: canInvite(user.role),
    },
  });
};

export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validacion fallida', errors: errors.array() });
  }

  const identifier = String(req.body?.identifier || req.body?.email || req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (!identifier || !password) {
    return res.status(400).json({ message: 'Credenciales incompletas' });
  }

  const normalized = identifier.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: normalized },
        { name: identifier },
      ],
    },
  });

  if (!user) return res.status(401).json({ message: 'Credenciales invalidas' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Credenciales invalidas' });

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });
  await logActivity(updatedUser.id, 'login', 'auth', req.ip);
  const access = signAccessToken(updatedUser);
  const refresh = signRefreshToken(updatedUser);
  setAuthCookies(res, access, refresh);

  res.json({
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      vip_status: !!updatedUser.vipStatus,
      purchase_count: Number(updatedUser.purchaseCount || 0),
      event_participation: Number(updatedUser.eventParticipation || 0),
      last_login: updatedUser.lastLogin,
      membership_level: roleToLevel(updatedUser.role),
      can_invite: canInvite(updatedUser.role),
    },
  });
};

export const me = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ message: 'No encontrado' });

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      vip_status: !!user.vipStatus,
      purchase_count: Number(user.purchaseCount || 0),
      event_participation: Number(user.eventParticipation || 0),
      last_login: user.lastLogin,
      membership_level: roleToLevel(user.role),
      can_invite: canInvite(user.role),
    },
  });
};

export const refresh = async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ message: 'Sin refresh token' });

  try {
    const payload = (await import('jsonwebtoken')).then(({ default: jwt }) => jwt.verify(token, config.jwtRefreshSecret));
    const decoded = await payload;
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return res.status(401).json({ message: 'Usuario no valido' });
    const access = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    setAuthCookies(res, access, refreshToken);
    res.json({ ok: true });
  } catch {
    res.status(401).json({ message: 'Refresh invalido' });
  }
};

export const logout = async (req, res) => {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
  res.json({ ok: true });
};

export const changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validacion fallida', errors: errors.array() });
  }

  const current_password = String(req.body?.current_password || '');
  const new_password = String(req.body?.new_password || '');

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

  const ok = await bcrypt.compare(current_password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Contrasena actual incorrecta' });

  if (current_password === new_password) {
    return res.status(400).json({ message: 'La nueva contrasena debe ser distinta' });
  }

  const passwordHash = await bcrypt.hash(new_password, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await logActivity(user.id, 'change_password', 'auth', req.ip);

  res.json({ ok: true, message: 'Contrasena actualizada' });
};

export const listUsers = async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      vipStatus: true,
      eliteStatus: true,
      purchaseCount: true,
      eventParticipation: true,
      lastLogin: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json(
    users.map((u) => ({
      ...u,
      vip_status: !!u.vipStatus,
      elite_status: !!u.eliteStatus,
      purchase_count: Number(u.purchaseCount || 0),
      event_participation: Number(u.eventParticipation || 0),
      last_login: u.lastLogin,
      membership_level: roleToLevel(u.role),
      can_invite: canInvite(u.role),
    }))
  );
};

export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const role = sanitizeRole(req.body?.role || 'USER');

  const exists = await prisma.user.findUnique({ where: { id } });
  if (!exists) return res.status(404).json({ message: 'Usuario no encontrado' });

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      vipStatus: true,
      purchaseCount: true,
      eventParticipation: true,
      lastLogin: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({
    ...updated,
    vip_status: !!updated.vipStatus,
    purchase_count: Number(updated.purchaseCount || 0),
    event_participation: Number(updated.eventParticipation || 0),
    last_login: updated.lastLogin,
    membership_level: roleToLevel(updated.role),
    can_invite: canInvite(updated.role),
  });
};

export const updateUserVipStatus = async (req, res) => {
  const { id } = req.params;
  const vipStatus = req.body?.vip_status === true || String(req.body?.vip_status || '').toLowerCase() === 'true';

  const exists = await prisma.user.findUnique({ where: { id } });
  if (!exists) return res.status(404).json({ message: 'Usuario no encontrado' });

  const updated = await prisma.user.update({
    where: { id },
    data: { vipStatus },
    select: {
      id: true, name: true, email: true, role: true,
      vipStatus: true, eliteStatus: true,
      purchaseCount: true, eventParticipation: true,
      lastLogin: true, status: true, createdAt: true, updatedAt: true,
    },
  });

  res.json({
    ...updated,
    vip_status: !!updated.vipStatus,
    elite_status: !!updated.eliteStatus,
    purchase_count: Number(updated.purchaseCount || 0),
    event_participation: Number(updated.eventParticipation || 0),
    last_login: updated.lastLogin,
    membership_level: roleToLevel(updated.role),
    can_invite: canInvite(updated.role),
  });
};

export const updateUserEliteStatus = async (req, res) => {
  const { id } = req.params;
  const eliteStatus = req.body?.elite_status === true || String(req.body?.elite_status || '').toLowerCase() === 'true';

  const exists = await prisma.user.findUnique({ where: { id } });
  if (!exists) return res.status(404).json({ message: 'Usuario no encontrado' });

  const updated = await prisma.user.update({
    where: { id },
    data: { eliteStatus },
    select: {
      id: true, name: true, email: true, role: true,
      vipStatus: true, eliteStatus: true,
      purchaseCount: true, eventParticipation: true,
      lastLogin: true, status: true, createdAt: true, updatedAt: true,
    },
  });

  res.json({
    ...updated,
    vip_status: !!updated.vipStatus,
    elite_status: !!updated.eliteStatus,
    purchase_count: Number(updated.purchaseCount || 0),
    event_participation: Number(updated.eventParticipation || 0),
    last_login: updated.lastLogin,
    membership_level: roleToLevel(updated.role),
    can_invite: canInvite(updated.role),
  });
};
