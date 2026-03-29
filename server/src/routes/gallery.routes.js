import { Router } from 'express';
import multer from 'multer';
import { listEvents, getEvent, saveEvent, removeEvent } from '../controllers/gallery.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const adminOnly = [authenticate, requireRole(['ADMIN'])];

router.get('/events', listEvents);
router.get('/events/:id', getEvent);
router.post('/events', ...adminOnly, upload.any(), saveEvent);
router.delete('/events/:id', ...adminOnly, removeEvent);

export default router;
