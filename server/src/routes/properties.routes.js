import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth.js';
import { list, create, getOne, update, remove } from '../controllers/properties.controller.js';

const router = Router();

router.get('/', authenticate, list);
router.get('/:id', authenticate, getOne);

router.post(
  '/',
  authenticate,
  requireRole(['ADMIN', 'PROPIETARIO']),
  [body('title').isString().isLength({ min: 2 }), body('status').optional().isIn(['DISPONIBLE', 'OCUPADA', 'MANTENIMIENTO'])],
  create
);

router.put(
  '/:id',
  authenticate,
  requireRole(['ADMIN', 'PROPIETARIO']),
  [body('title').optional().isString(), body('status').optional().isIn(['DISPONIBLE', 'OCUPADA', 'MANTENIMIENTO'])],
  update
);

router.delete('/:id', authenticate, requireRole(['ADMIN']), remove);

export default router;
