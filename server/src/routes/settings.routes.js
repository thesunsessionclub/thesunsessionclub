import { Router } from 'express';
import { body } from 'express-validator';
import { getSettings, upsertSettings } from '../controllers/settings.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
const adminOnly = [authenticate, requireRole(['ADMIN'])];

router.get('/', getSettings);
router.put(
  '/',
  ...adminOnly,
  [
    body('primary_color').optional().isString(),
    body('secondary_color').optional().isString(),
    body('background_color').optional().isString(),
    body('gradient_start').optional().isString(),
    body('gradient_end').optional().isString(),
    body('button_style').optional().isString(),
    body('font_family').optional().isString(),
    body('hero_background_image').optional().isString(),
    body('hero_event_json').optional().isString(),
    body('ticket_templates_json').optional().isString(),
    body('order_notification_email').optional().isString(),
    body('card_background').optional().isString(),
    body('global_text_color').optional().isString(),
    body('friends_json').optional().isString(),
    body('bank_name').optional().isString(),
    body('bank_account_holder').optional().isString(),
    body('bank_clabe').optional().isString(),
    body('bank_card').optional().isString(),
  ],
  upsertSettings
);

export default router;
