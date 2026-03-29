import { Router } from 'express';
import { body } from 'express-validator';
import {
  getSummary,
  createRequest,
  listOrders,
  updateOrder,
  approveOrder,
  rejectOrder,
  remindOrder,
  listTickets,
  scanTicket,
} from '../controllers/tickets.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
const adminOnly = [authenticate, requireRole(['ADMIN'])];

router.get('/summary', getSummary);
router.get('/', ...adminOnly, listOrders);
router.post(
  '/request',
  [
    body('event_id').isString(),
    body('full_name').isString(),
    body('email').isEmail(),
    body('phone').isString(),
    body('qty').isInt({ min: 1 }),
    body('payment_proof').optional().isString(),
  ],
  createRequest
);
router.put(
  '/:id',
  [
    body('status').optional().isString(),
    body('notes').optional().isString(),
  ],
  ...adminOnly,
  updateOrder
);
router.post('/:id/approve', ...adminOnly, approveOrder);
router.post('/:id/reject', ...adminOnly, rejectOrder);
router.post('/:id/remind', ...adminOnly, remindOrder);
router.get('/:id/items', ...adminOnly, listTickets);
router.post(
  '/scan',
  [body('code').optional().isString(), body('ticket_id').optional().isString()],
  ...adminOnly,
  scanTicket
);

export default router;
