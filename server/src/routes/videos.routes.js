import { Router } from 'express';
import { body } from 'express-validator';
import { list, create, update, remove } from '../controllers/videos.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
const adminOnly = [authenticate, requireRole(['ADMIN'])];

router.get('/', list);
router.post(
  '/',
  ...adminOnly,
  [
    body('title').isString(),
    body('artist').optional().isString(),
    body('date').optional().isString(),
    body('location').optional().isString(),
    body('thumbnail').optional().isString(),
    body('youtubeLink').optional().isString(),
    body('soundcloudLink').optional().isString(),
    body('genre').optional().isString(),
    body('featured').optional(),
    body('status').optional().isString(),
  ],
  create
);
router.put(
  '/:id',
  ...adminOnly,
  [
    body('title').optional().isString(),
    body('artist').optional().isString(),
    body('date').optional().isString(),
    body('location').optional().isString(),
    body('thumbnail').optional().isString(),
    body('youtubeLink').optional().isString(),
    body('soundcloudLink').optional().isString(),
    body('genre').optional().isString(),
    body('featured').optional(),
    body('status').optional().isString(),
  ],
  update
);
router.delete('/:id', ...adminOnly, remove);

export default router;
