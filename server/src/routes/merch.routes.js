import { Router } from 'express';
import { body } from 'express-validator';
import { list, getOne, create, update, remove, permanentDelete, restore, generateAccessLink } from '../controllers/merch.controller.js';
import { authenticate, authenticateOptional, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticateOptional, list);
router.get('/get.php', authenticateOptional, list);
router.get('/:id', authenticateOptional, getOne);

router.post(
  '/',
  authenticate,
  requireRole(['ADMIN']),
  [
    body('product_name').isString().isLength({ min: 2 }),
    body('featured').optional().isBoolean(),
    body('new_drop').optional().isBoolean(),
    body('index_featured').optional().isBoolean(),
    body('colors').optional().isArray(),
  ],
  create
);

router.put(
  '/:id',
  authenticate,
  requireRole(['ADMIN']),
  [
    body('product_name').optional().isString().isLength({ min: 2 }),
    body('featured').optional().isBoolean(),
    body('new_drop').optional().isBoolean(),
    body('index_featured').optional().isBoolean(),
    body('colors').optional().isArray(),
  ],
  update
);

router.post('/:id/access-link', authenticate, requireRole(['ADMIN']), generateAccessLink);
router.post('/:id/restore', authenticate, requireRole(['ADMIN']), restore);
router.delete('/:id/permanent', authenticate, requireRole(['ADMIN']), permanentDelete);
router.delete('/:id', authenticate, requireRole(['ADMIN']), remove);

export default router;
