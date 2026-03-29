import { Router } from 'express';
import { body } from 'express-validator';
import { list, create, update, remove } from '../controllers/events.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
const adminOnly = [authenticate, requireRole(['ADMIN'])];

router.get('/', list);
router.post(
  '/',
  ...adminOnly,
  [
    body('title').isString().isLength({ min: 2 }),
    body('status').optional().isIn(['ACTIVE', 'DRAFT', 'CANCELLED']),
    body('price').optional().isFloat({ min: 0 }),
    body('ticket_limit').optional().isInt({ min: 0 }),
  ],
  create
);
router.put(
  '/:id',
  ...adminOnly,
  [
    body('title').optional().isString().isLength({ min: 2 }),
    body('status').optional().isIn(['ACTIVE', 'DRAFT', 'CANCELLED']),
    body('price').optional().isFloat({ min: 0 }),
    body('ticket_limit').optional().isInt({ min: 0 }),
  ],
  update
);
router.delete('/:id', ...adminOnly, remove);

export default router;
