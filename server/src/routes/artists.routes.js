import { Router } from 'express';
import { body } from 'express-validator';
import { list, create, update, remove } from '../controllers/artists.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
const adminOnly = [authenticate, requireRole(['ADMIN'])];

router.get('/', list);
router.post('/', ...adminOnly, [body('name').isString().isLength({ min: 2 })], create);
router.put('/:id', ...adminOnly, [body('name').optional().isString().isLength({ min: 2 })], update);
router.delete('/:id', ...adminOnly, remove);

// PHP-style endpoints for compatibility
router.get('/get.php', list);
router.post('/add.php', ...adminOnly, [body('name').isString().isLength({ min: 2 })], create);
router.put('/update.php', ...adminOnly, [body('id').isString().isLength({ min: 2 })], (req, res, next) => {
  if (req.body && req.body.id) req.params.id = req.body.id;
  next();
}, update);
router.delete('/delete.php', ...adminOnly, (req, res, next) => {
  if (req.body && req.body.id) req.params.id = req.body.id;
  next();
}, remove);

export default router;
