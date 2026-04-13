import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { list, create, update, remove, generateTicketArt, uploadImage } from '../controllers/events.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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
    body('ticket_limit').optional({ values: 'null' }).isInt({ min: 0 }),
    body('ticket_design_json').optional({ values: 'null' }).isString(),
  ],
  create
);
router.post(
  '/generate-ticket-art',
  ...adminOnly,
  [
    body('flyer_image').optional({ values: 'null' }).isString(),
    body('prompt_hint').optional({ values: 'null' }).isString().isLength({ max: 500 }),
    body('event').optional({ values: 'null' }).isObject(),
    body('ticket_design').optional({ values: 'null' }).isObject(),
  ],
  generateTicketArt
);
router.put(
  '/:id',
  ...adminOnly,
  [
    body('title').optional({ values: 'null' }).isString().isLength({ min: 2 }),
    body('status').optional({ values: 'null' }).isIn(['ACTIVE', 'DRAFT', 'CANCELLED']),
    body('price').optional({ values: 'null' }).isFloat({ min: 0 }),
    body('ticket_limit').optional({ values: 'null' }).isInt({ min: 0 }),
    body('ticket_design_json').optional({ values: 'null' }).isString(),
  ],
  update
);
// Upload route: accepts both field names for compatibility
router.post('/upload', ...adminOnly, upload.single('file'), uploadImage);
router.post('/upload-image', ...adminOnly, upload.single('image'), uploadImage);
router.delete('/:id', ...adminOnly, remove);

export default router;
