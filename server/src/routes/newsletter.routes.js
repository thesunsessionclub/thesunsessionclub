import { Router } from 'express';
import { body } from 'express-validator';
import { subscribe, unsubscribe, listSubscribers, updateTier } from '../controllers/newsletter.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Public endpoints
router.post(
  '/subscribe',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('name').optional().isString().isLength({ max: 100 }),
  ],
  subscribe
);

router.get('/unsubscribe', unsubscribe);

// Admin endpoints
router.get('/subscribers', authenticate, requireRole(['ADMIN']), listSubscribers);
router.put('/subscribers/:id/tier', authenticate, requireRole(['ADMIN']), [
  body('tier').isString().isIn(['FREE', 'MEMBER', 'VIP', 'ELITE', 'DIAMOND']),
], updateTier);

export default router;
