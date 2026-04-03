import { Router } from 'express';
import { body } from 'express-validator';
import { list, create, update, remove, generateTicketArt } from '../controllers/events.controller.js';
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
    body('ticket_design_json').optional().isString(),
  ],
  create
);
router.post(
  '/generate-ticket-art',
  ...adminOnly,
  [
    body('flyer_image').optional().isString(),
    body('prompt_hint').optional().isString().isLength({ max: 500 }),
    body('event').optional().isObject(),
    body('ticket_design').optional().isObject(),
  ],
  generateTicketArt
);
router.put(
  '/:id',
  ...adminOnly,
  [
    body('title').optional().isString().isLength({ min: 2 }),
    body('status').optional().isIn(['ACTIVE', 'DRAFT', 'CANCELLED']),
    body('price').optional().isFloat({ min: 0 }),
    body('ticket_limit').optional().isInt({ min: 0 }),
    body('ticket_design_json').optional().isString(),
  ],
  update
);
router.delete('/:id', ...adminOnly, remove);

export default router;
