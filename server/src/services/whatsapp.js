import https from 'https';
import { config } from '../config/env.js';

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D+/g, '');
  if (!digits) return '';
  if (config.whatsappDefaultCountryCode && digits.length <= 10) {
    const prefix = String(config.whatsappDefaultCountryCode).replace(/\D+/g, '');
    if (prefix && !digits.startsWith(prefix)) return prefix + digits;
  }
  return digits;
}

function postJson(url, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const target = new URL(url);
    const req = https.request(
      {
        method: 'POST',
        hostname: target.hostname,
        path: target.pathname + target.search,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          let parsed = null;
          try { parsed = JSON.parse(raw); } catch {}
          resolve({ status: res.statusCode || 0, data: parsed || raw });
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

export async function sendWhatsAppMessage({ to, text, templateName, templateParams }) {
  const token = config.whatsappAccessToken;
  const phoneId = config.whatsappPhoneNumberId;
  const apiVersion = config.whatsappApiVersion || 'v20.0';
  const recipient = normalizePhone(to);
  if (!token || !phoneId || !recipient) return { skipped: true };

  const payload = {
    messaging_product: 'whatsapp',
    to: recipient,
  };

  if (templateName) {
    payload.type = 'template';
    payload.template = {
      name: templateName,
      language: { code: config.whatsappTemplateLang || 'es_MX' },
      components: [],
    };
    if (Array.isArray(templateParams) && templateParams.length) {
      payload.template.components.push({
        type: 'body',
        parameters: templateParams.map((value) => ({ type: 'text', text: String(value ?? '') })),
      });
    }
  } else {
    payload.type = 'text';
    payload.text = { body: String(text || '') };
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`;
  const res = await postJson(url, payload, token);
  return { ok: res.status >= 200 && res.status < 300, status: res.status, data: res.data };
}

export async function sendTicketWhatsApp({ type, order, event, tickets, links }) {
  const phone = order?.phone || '';
  const name = order?.full_name || '';
  const title = event?.title || '';
  const qty = order?.qty || 0;

  if (type === 'request') {
    const template = config.whatsappTemplateRequest;
    if (template) {
      return sendWhatsAppMessage({
        to: phone,
        templateName: template,
        templateParams: [name, title, qty],
      });
    }
    return sendWhatsAppMessage({
      to: phone,
      text: `Hola ${name}. Recibimos tu solicitud de ${qty} boleto(s) para ${title}. Tu solicitud esta pendiente de verificacion de pago.`,
    });
  }

  if (type === 'confirm') {
    const template = config.whatsappTemplateConfirm;
    if (template) {
      return sendWhatsAppMessage({
        to: phone,
        templateName: template,
        templateParams: [name, title, qty, links || ''],
      });
    }
    const firstLink = Array.isArray(tickets) && tickets.length ? tickets[0].ticket_image : '';
    const linkText = links || (firstLink ? `Descarga: ${firstLink}` : '');
    return sendWhatsAppMessage({
      to: phone,
      text: `Pago confirmado. Tus boletos para ${title} estan listos. ${linkText}`.trim(),
    });
  }

  if (type === 'remind') {
    const template = config.whatsappTemplateRemind;
    if (template) {
      return sendWhatsAppMessage({
        to: phone,
        templateName: template,
        templateParams: [name, title, qty],
      });
    }
    return sendWhatsAppMessage({
      to: phone,
      text: `Hola ${name}. Te recordamos completar el pago para ${title}. Tu solicitud sigue pendiente.`,
    });
  }

  return { skipped: true };
}
