import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function signAccessToken(user) {
  return jwt.sign({ role: user.role }, config.jwtSecret, {
    subject: user.id,
    expiresIn: config.jwtExpiresIn,
  });
}

export function signRefreshToken(user) {
  return jwt.sign({ role: user.role }, config.jwtRefreshSecret, {
    subject: user.id,
    expiresIn: config.jwtRefreshExpiresIn,
  });
}
