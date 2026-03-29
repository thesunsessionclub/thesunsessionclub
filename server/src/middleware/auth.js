import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { prisma } from '../prisma.js';

export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const tokenFromCookie = req.cookies?.access_token || null;
    const token = tokenFromHeader || tokenFromCookie;
    if (!token) return res.status(401).json({ message: 'No autenticado' });
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}

export function authenticateOptional(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const tokenFromCookie = req.cookies?.access_token || null;
    const token = tokenFromHeader || tokenFromCookie;
    if (!token) return next();
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    req.user = null;
    next();
  }
}

export function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Permisos insuficientes' });
    }
    next();
  };
}

export async function logActivity(userId, action, module, ip) {
  try {
    await prisma.activityLog.create({
      data: { userId, action, module, ip },
    });
  } catch {
    // ignore logging errors
  }
}

