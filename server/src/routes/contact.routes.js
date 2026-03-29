import { Router } from 'express';
import { body } from 'express-validator';
import { sendContactMessage } from '../controllers/contact.controller.js';

const router = Router();

router.post(
  '/',
  [
    body('name').isString().isLength({ min: 2, max: 120 }),
    body('email').isEmail(),
    body('subject').isString().isLength({ min: 2, max: 180 }),
    body('message').isString().isLength({ min: 5, max: 500 }),
    body('consent').isBoolean(),
  ],
  sendContactMessage
);

export default router;
