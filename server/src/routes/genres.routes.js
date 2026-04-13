import { Router } from 'express';
import { list, create, remove } from '../controllers/genres.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
const adminOnly = [authenticate, requireRole(['ADMIN'])];

router.get('/', list);
router.post('/', ...adminOnly, create);
router.delete('/:id', ...adminOnly, remove);

export default router;
