import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) return null;

  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    tls: {
      rejectUnauthorized: config.smtpTlsRejectUnauthorized,
    },
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });

  return transporter;
}

export async function sendOrderNotification({ to, subject, text, html, replyTo }) {
  const tx = getTransporter();
  if (!tx || !to) return { skipped: true };

  await tx.sendMail({
    from: config.smtpFrom,
    to,
    subject,
    text,
    html,
    replyTo: replyTo || undefined,
  });

  return { skipped: false };
}
