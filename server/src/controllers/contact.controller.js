import { validationResult } from 'express-validator';
import { prisma } from '../prisma.js';
import { sendOrderNotification } from '../services/mailer.js';
import fs from 'fs/promises';
import path from 'path';

const FALLBACK_CONTACT_EMAIL = 'thesunsessionclub@gmail.com';
const CONTACT_FALLBACK_DIR = path.resolve(process.cwd(), 'uploads', 'contact');
const CONTACT_FALLBACK_FILE = path.join(CONTACT_FALLBACK_DIR, 'messages.jsonl');

function clean(value) {
  return String(value || '').trim();
}

async function saveFallbackMessage(payload) {
  try {
    await fs.mkdir(CONTACT_FALLBACK_DIR, { recursive: true });
    await fs.appendFile(CONTACT_FALLBACK_FILE, JSON.stringify(payload) + '\n', 'utf8');
    return true;
  } catch {
    return false;
  }
}

export const sendContactMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validacion fallida', errors: errors.array() });
  }

  const name = clean(req.body?.name);
  const email = clean(req.body?.email).toLowerCase();
  const subject = clean(req.body?.subject);
  const message = clean(req.body?.message);
  const consent = req.body?.consent === true || String(req.body?.consent || '').toLowerCase() === 'true';

  if (!consent) return res.status(400).json({ message: 'Debes aceptar el consentimiento de contacto' });

  try {
    const settings = await prisma.settings.findUnique({ where: { id: 'site' } });
    const destination = clean(settings?.order_notification_email) || FALLBACK_CONTACT_EMAIL;
    const finalSubject = `Contacto web: ${subject || 'Sin asunto'}`;
    const text = [
      `Nombre: ${name}`,
      `Email: ${email}`,
      `Asunto: ${subject}`,
      '',
      message,
    ].join('\n');
    const html = `
      <h2>Nuevo mensaje de contacto</h2>
      <p><strong>Nombre:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Asunto:</strong> ${subject}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${message.replace(/\n/g, '<br/>')}</p>
    `;
    let mail = { skipped: true, error: null };
    try {
      mail = await sendOrderNotification({
        to: destination,
        subject: finalSubject,
        text,
        html,
        replyTo: email || undefined,
      });
    } catch (err) {
      mail = { skipped: true, error: err?.message || 'mail_error' };
    }

    if (mail.skipped) {
      const stored = await saveFallbackMessage({
        created_at: new Date().toISOString(),
        destination,
        name,
        email,
        subject,
        message,
        consent,
        mail_error: mail.error || 'mail_skipped',
      });
      return res.status(202).json({
        ok: true,
        mail_sent: false,
        stored,
        message: 'Mensaje recibido. Notificacion en cola local por fallo de correo.',
      });
    }

    return res.status(201).json({ ok: true, mail_sent: true });
  } catch (err) {
    return res.status(500).json({ message: 'No se pudo enviar el correo de contacto', details: err?.message });
  }
};
