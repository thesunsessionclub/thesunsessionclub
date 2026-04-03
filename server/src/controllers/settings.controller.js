import { prisma } from '../prisma.js';
import { validationResult } from 'express-validator';

export const getSettings = async (req, res) => {
  try {
    const row = await prisma.settings.findUnique({ where: { id: 'site' } });
    res.json(row || {});
  } catch (err) {
    console.log('Settings get fallback:', err?.message);
    res.json({});
  }
};

export const upsertSettings = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validación fallida', errors: errors.array() });
  const data = sanitize(req.body);
  try {
    const item = await prisma.settings.upsert({
      where: { id: 'site' },
      update: data,
      create: { id: 'site', ...data },
    });
    console.log('Settings actualizados:', item);
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo guardar settings', details: err?.message });
  }
};

function sanitize(body) {
  const {
    primary_color,
    secondary_color,
    background_color,
    gradient_start,
    gradient_end,
    button_style,
    font_family,
    site_logo,
    hero_section_background_image,
    about_background_image,
    gallery_background_image,
    story_break_image,
    story_banner_image,
    about_gallery_images,
    hero_event_json,
    ticket_templates_json,
    order_notification_email,
    card_background,
    global_text_color,
    friends_json,
    bank_name,
    bank_account_holder,
    bank_clabe,
    bank_card,
  } = body || {};
  return {
    primary_color,
    secondary_color,
    background_color,
    gradient_start,
    gradient_end,
    button_style,
    font_family,
    site_logo,
    hero_section_background_image,
    about_background_image,
    gallery_background_image,
    story_break_image,
    story_banner_image,
    about_gallery_images,
    hero_event_json,
    ticket_templates_json,
    order_notification_email,
    card_background,
    global_text_color,
    friends_json,
    bank_name,
    bank_account_holder,
    bank_clabe,
    bank_card,
  };
}
