import { Router } from 'express';
import { body } from 'express-validator';
import { createOrder, listMyOrders, listOrders, updateOrderStatus } from '../controllers/orders.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, requireRole(['ADMIN', 'EDITOR']), listOrders);
router.get('/mine', authenticate, listMyOrders);
router.post(
  '/',
  [
    body('name').isString().isLength({ min: 2 }),
    body('last_name').isString().isLength({ min: 2 }),
    body('phone').isString().isLength({ min: 5 }),
    body('email').isEmail(),
    body('notes').optional().isString(),
    body('products').isArray({ min: 1 }),
  ],
  createOrder
);
router.put(
  '/:id/status',
  [body('status').isIn(['new_order', 'pending', 'payment_review', 'accepted', 'confirmed', 'shipped', 'completed'])],
  authenticate,
  requireRole(['ADMIN', 'EDITOR']),
  updateOrderStatus
);

export default router;
