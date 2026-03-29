import { Router } from 'express';
import { body } from 'express-validator';
import { track, summary } from '../controllers/analytics.controller.js';
import { authenticate, authenticateOptional, requireRole } from '../middleware/auth.js';

const router = Router();

router.post(
  '/track',
  authenticateOptional,
  [body('event').isString().isLength({ min: 1, max: 120 }), body('page').optional().isString(), body('meta').optional()],
  track
);
router.get('/summary', authenticate, requireRole(['ADMIN']), summary);

export default router;
