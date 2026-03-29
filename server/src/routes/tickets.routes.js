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
  validateTicket,
  invalidateTicket,
} from '../controllers/tickets.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
const adminOnly = [authenticate, requireRole(['ADMIN'])];

/* ── Public endpoints ─────────────────────────────────── */

// Ticket availability summary
router.get('/summary', getSummary);

// Public ticket validation (QR scan from any phone)
router.get('/validate/:code', validateTicket);

// Submit ticket request (rate-limited in app.js)
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

/* ── Admin endpoints ──────────────────────────────────── */

// List all orders
router.get('/', ...adminOnly, listOrders);

// Update order
router.put(
  '/:id',
  [
    body('status').optional().isString(),
    body('notes').optional().isString(),
  ],
  ...adminOnly,
  updateOrder
);

// Approve order (generates premium tickets)
router.post('/:id/approve', ...adminOnly, approveOrder);

// Reject order
router.post('/:id/reject', ...adminOnly, rejectOrder);

// Resend payment reminder
router.post('/:id/remind', ...adminOnly, remindOrder);

// List tickets in an order
router.get('/:id/items', ...adminOnly, listTickets);

// Invalidate a specific ticket (revoke access)
router.post('/:ticketId/invalidate', ...adminOnly, invalidateTicket);

// Scan / check-in ticket at event
router.post(
  '/scan',
  [body('code').optional().isString(), body('ticket_id').optional().isString()],
  ...adminOnly,
  scanTicket
);

export default router;
