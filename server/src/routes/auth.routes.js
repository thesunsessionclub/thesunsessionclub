import { Router } from 'express';
import { body } from 'express-validator';
import {
  login,
  me,
  refresh,
  register,
  logout,
  changePassword,
  listUsers,
  updateUserRole,
  updateUserVipStatus,
  updateUserEliteStatus,
} from '../controllers/auth.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.post(
  '/register',
  [
    body('name').isString().isLength({ min: 2 }),
    body('email').isString().isLength({ min: 3 }),
    body('password').isLength({ min: 6 }),
    body('role').optional().isIn(['USER']),
  ],
  register
);

router.post(
  '/login',
  [
    body('identifier').optional().isString().isLength({ min: 1 }),
    body('email').optional().isString().isLength({ min: 1 }),
    body('username').optional().isString().isLength({ min: 1 }),
    body('password').isLength({ min: 1 }),
  ],
  login
);

router.get('/me', authenticate, me);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);

router.post(
  '/change-password',
  [body('current_password').isLength({ min: 1 }), body('new_password').isLength({ min: 6 })],
  authenticate,
  changePassword
);

router.get('/users', authenticate, requireRole(['ADMIN']), listUsers);
router.put(
  '/users/:id/role',
  [body('role').isIn(['ADMIN', 'USER', 'PROPIETARIO', 'INQUILINO', 'MEMBER', 'ELITE', 'DIAMOND'])],
  authenticate,
  requireRole(['ADMIN']),
  updateUserRole
);
router.put(
  '/users/:id/vip',
  [body('vip_status').isBoolean()],
  authenticate,
  requireRole(['ADMIN']),
  updateUserVipStatus
);
router.put(
  '/users/:id/elite',
  [body('elite_status').isBoolean()],
  authenticate,
  requireRole(['ADMIN']),
  updateUserEliteStatus
);

export default router;
