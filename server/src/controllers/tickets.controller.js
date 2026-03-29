import { prisma } from '../prisma.js';
import { validationResult } from 'express-validator';
import QRCode from 'qrcode';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { sendOrderNotification } from '../services/mailer.js';
import { sendTicketWhatsApp } from '../services/whatsapp.js';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const PAYMENTS_DIR = path.join(UPLOADS_DIR, 'payments');
const TICKETS_DIR = path.join(UPLOADS_DIR, 'tickets');

const ORDER_ACTIVE_STATUSES = ['pending', 'paid', 'confirmed'];
const TICKET_VALID_STATUSES = ['valid', 'used'];

function cleanString(value) {
  return String(value || '').trim();
}

async function safeNotify(label, fn) {
  try {
    await fn();
    return true;
  } catch (err) {
    console.warn(`[tickets] ${label} failed: ${err?.message || err}`);
    return false;
  }
}

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
}

function parseDataUrl(dataUrl) {
  const match = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  return { mime: match[1], data: match[2] };
}

async function savePaymentProof(dataUrl, orderId) {
  if (!dataUrl) return null;
  const raw = cleanString(dataUrl);
  if (!raw) return null;
  if (!raw.startsWith('data:')) return raw;
  const parsed = parseDataUrl(raw);
  if (!parsed) return null;
  const ext = parsed.mime.includes('png') ? 'png' : parsed.mime.includes('jpeg') ? 'jpg' : 'bin';
  await ensureDir(PAYMENTS_DIR);
  const filename = `payment_${orderId}_${Date.now()}.${ext}`;
  const filePath = path.join(PAYMENTS_DIR, filename);
  const buffer = Buffer.from(parsed.data, 'base64');
  await fs.writeFile(filePath, buffer);
  return `/uploads/payments/${filename}`;
}

function pickHost(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

async function getEventAvailability(eventId) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return null;
  const reservedAgg = await prisma.ticketOrder.aggregate({
    _sum: { qty: true },
    where: { eventId, status: { in: ORDER_ACTIVE_STATUSES } },
  });
  const reserved = Number(reservedAgg._sum.qty || 0);
  const sold = await prisma.ticketItem.count({
    where: { eventId, status: { in: TICKET_VALID_STATUSES } },
  });
  const limit = event.ticket_limit;
  const remaining = limit == null ? null : Math.max(0, limit - reserved);
  return {
    event_id: eventId,
    limit,
    reserved,
    sold,
    remaining,
  };
}

async function getAvailabilityForEvents(eventIds) {
  const events = await prisma.event.findMany({
    where: { id: { in: eventIds } },
    select: { id: true, ticket_limit: true },
  });
  const orderAgg = await prisma.ticketOrder.groupBy({
    by: ['eventId'],
    _sum: { qty: true },
    where: { eventId: { in: eventIds }, status: { in: ORDER_ACTIVE_STATUSES } },
  });
  const ticketAgg = await prisma.ticketItem.groupBy({
    by: ['eventId'],
    _count: { _all: true },
    where: { eventId: { in: eventIds }, status: { in: TICKET_VALID_STATUSES } },
  });
  const reservedMap = new Map(orderAgg.map((x) => [x.eventId, Number(x._sum.qty || 0)]));
  const soldMap = new Map(ticketAgg.map((x) => [x.eventId, Number(x._count._all || 0)]));
  return events.map((e) => {
    const reserved = reservedMap.get(e.id) || 0;
    const sold = soldMap.get(e.id) || 0;
    const limit = e.ticket_limit;
    const remaining = limit == null ? null : Math.max(0, limit - reserved);
    return { event_id: e.id, limit, reserved, sold, remaining };
  });
}

function buildTicketSvg({ event, order, ticketCode, qrDataUrl }) {
  const title = cleanString(event.title);
  const date = event.date ? new Date(event.date).toLocaleDateString('es-MX') : '';
  const time = cleanString(event.time);
  const location = cleanString(event.location || event.venue);
  const name = cleanString(order.full_name);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#050607"/>
      <stop offset="100%" stop-color="#0f271a"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="600" rx="28" fill="url(#bg)"/>
  <rect x="40" y="40" width="1120" height="520" rx="22" fill="#0d1b13" stroke="#00FFAA" stroke-opacity="0.35" stroke-width="2"/>
  <text x="90" y="130" font-family="Montserrat, Arial" font-size="36" fill="#00FFAA" font-weight="700">SUN SESSION CLUB</text>
  <text x="90" y="190" font-family="Montserrat, Arial" font-size="28" fill="#ffffff" font-weight="700">${title}</text>
  <text x="90" y="240" font-family="Montserrat, Arial" font-size="18" fill="#cbd5e1">Fecha: ${date}</text>
  <text x="90" y="270" font-family="Montserrat, Arial" font-size="18" fill="#cbd5e1">Hora: ${time}</text>
  <text x="90" y="300" font-family="Montserrat, Arial" font-size="18" fill="#cbd5e1">Lugar: ${location}</text>
  <text x="90" y="360" font-family="Montserrat, Arial" font-size="20" fill="#ffffff">Titular: ${name}</text>
  <text x="90" y="400" font-family="Montserrat, Arial" font-size="16" fill="#94a3b8">CÃ³digo: ${ticketCode}</text>
  <rect x="830" y="150" width="280" height="280" rx="18" fill="#0b0b0f" stroke="#00FFAA" stroke-opacity="0.4" stroke-width="2"/>
  <image href="${qrDataUrl}" x="855" y="175" width="230" height="230" />
  <text x="830" y="470" font-family="Montserrat, Arial" font-size="14" fill="#94a3b8">Escanea en la entrada</text>
</svg>`;
  return svg.trim();
}

async function generateTicketAssets({ event, order, ticket }) {
  const qrPayload = {
    ticketId: ticket.id,
    eventId: event.id,
    orderId: order.id,
    code: ticket.ticket_code,
    name: order.full_name,
    email: order.email,
  };
  const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), { width: 360, margin: 1 });
  await ensureDir(TICKETS_DIR);
  const filename = `ticket_${ticket.ticket_code}.svg`;
  const filePath = path.join(TICKETS_DIR, filename);
  const svg = buildTicketSvg({ event, order, ticketCode: ticket.ticket_code, qrDataUrl });
  await fs.writeFile(filePath, svg, 'utf8');
  return { qrPayload: JSON.stringify(qrPayload), ticketImage: `/uploads/tickets/${filename}` };
}

export const getSummary = async (req, res) => {
  try {
    const eventId = cleanString(req.query.event_id);
    const eventIdsParam = cleanString(req.query.event_ids);
    if (eventId) {
      const summary = await getEventAvailability(eventId);
      if (!summary) return res.status(404).json({ message: 'Evento no encontrado' });
      return res.json(summary);
    }
    if (eventIdsParam) {
      const eventIds = eventIdsParam.split(',').map((x) => x.trim()).filter(Boolean);
      if (!eventIds.length) return res.json([]);
      const summaries = await getAvailabilityForEvents(eventIds);
      return res.json(summaries);
    }
    return res.json([]);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener summary', details: err?.message });
  }
};

export const createRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'ValidaciÃ³n fallida', errors: errors.array() });
  const { event_id, full_name, email, phone, qty, payment_proof } = req.body || {};
  const eventId = cleanString(event_id);
  const qtyNum = Number(qty || 0);
  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ message: 'Evento no encontrado' });
    const availability = await getEventAvailability(eventId);
    if (availability && availability.limit != null && qtyNum > availability.remaining) {
      return res.status(409).json({ message: 'No hay suficientes boletos disponibles', remaining: availability.remaining });
    }
    const order = await prisma.ticketOrder.create({
      data: {
        eventId,
        full_name: cleanString(full_name),
        email: cleanString(email),
        phone: cleanString(phone),
        qty: qtyNum,
        status: 'pending',
      },
    });
    const proofUrl = await savePaymentProof(payment_proof, order.id);
    if (proofUrl) {
      await prisma.ticketOrder.update({ where: { id: order.id }, data: { payment_proof: proofUrl } });
    }
    const mailSent = await safeNotify('request-email', () =>
      sendOrderNotification({
        to: order.email,
        subject: `Solicitud de boletos recibida - ${event.title}`,
        text: `Gracias. Tu solicitud estÃ¡ pendiente de verificaciÃ³n. Evento: ${event.title}. Cantidad: ${order.qty}.`,
        html: `<p>Gracias. Tu solicitud estÃ¡ pendiente de verificaciÃ³n.</p><p><strong>Evento:</strong> ${event.title}</p><p><strong>Boletos:</strong> ${order.qty}</p>`,
      })
    );
    const whatsappSent = await safeNotify('request-whatsapp', () => sendTicketWhatsApp({ type: 'request', order, event }));
    res.status(201).json({ ...order, payment_proof: proofUrl || order.payment_proof, mail_sent: mailSent, whatsapp_sent: whatsappSent });
  } catch (err) {
    res.status(500).json({ message: 'No se pudo crear solicitud', details: err?.message });
  }
};

export const listOrders = async (req, res) => {
  try {
    const eventId = cleanString(req.query.event_id);
    const status = cleanString(req.query.status);
    const where = {};
    if (eventId) where.eventId = eventId;
    if (status) where.status = status;
    const orders = await prisma.ticketOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { event: true, tickets: true },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo listar tickets', details: err?.message });
  }
};

export const updateOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'ValidaciÃ³n fallida', errors: errors.array() });
  const { id } = req.params;
  const { status, notes } = req.body || {};
  try {
    const item = await prisma.ticketOrder.update({
      where: { id },
      data: {
        status: cleanString(status) || undefined,
        notes: notes != null ? String(notes) : undefined,
      },
    });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo actualizar solicitud', details: err?.message });
  }
};

export const approveOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.ticketOrder.findUnique({ where: { id }, include: { event: true } });
    if (!order) return res.status(404).json({ message: 'Solicitud no encontrada' });
    const event = order.event;
    const otherReservedAgg = await prisma.ticketOrder.aggregate({
      _sum: { qty: true },
      where: { eventId: order.eventId, status: { in: ORDER_ACTIVE_STATUSES }, NOT: { id: order.id } },
    });
    const reservedExcluding = Number(otherReservedAgg._sum.qty || 0);
    if (event.ticket_limit != null && reservedExcluding + order.qty > event.ticket_limit) {
      return res.status(409).json({ message: 'No hay suficientes boletos disponibles', remaining: Math.max(0, event.ticket_limit - reservedExcluding) });
    }
    const createdTickets = [];
    for (let i = 0; i < order.qty; i++) {
      const ticketCode = crypto.randomBytes(5).toString('hex').toUpperCase();
      const ticket = await prisma.ticketItem.create({
        data: {
          orderId: order.id,
          eventId: order.eventId,
          ticket_code: ticketCode,
          qr_payload: '',
          status: 'valid',
        },
      });
      const assets = await generateTicketAssets({ event, order, ticket });
      const updated = await prisma.ticketItem.update({
        where: { id: ticket.id },
        data: { qr_payload: assets.qrPayload, ticket_image: assets.ticketImage },
      });
      createdTickets.push(updated);
    }
    const updatedOrder = await prisma.ticketOrder.update({
      where: { id },
      data: { status: 'confirmed' },
    });
    const userEmail = String(order.email || '').trim().toLowerCase();
    if (userEmail) {
      const buyer = await prisma.user.findFirst({ where: { email: userEmail, deletedAt: null } });
      if (buyer) {
        await prisma.user.update({
          where: { id: buyer.id },
          data: { eventParticipation: { increment: Number(order.qty || 0) } },
        });
      }
    }
    const host = pickHost(req);
    const ticketLinks = createdTickets
      .map((t) => `${host}${t.ticket_image}`)
      .join('<br/>');
    const mailSent = await safeNotify('approve-email', () =>
      sendOrderNotification({
        to: order.email,
        subject: `Boletos confirmados - ${event.title}`,
        text: `Tus boletos estÃ¡n confirmados. Descarga aquÃ­: ${ticketLinks}`,
        html: `<p>Â¡Pago confirmado!</p><p>Evento: <strong>${event.title}</strong></p><p>Descarga tus boletos:</p><p>${ticketLinks}</p>`,
      })
    );
    const whatsappSent = await safeNotify('approve-whatsapp', () =>
      sendTicketWhatsApp({
        type: 'confirm',
        order,
        event,
        tickets: createdTickets,
        links: createdTickets.map((t) => `${host}${t.ticket_image}`).join(' '),
      })
    );
    res.json({ order: updatedOrder, tickets: createdTickets, mail_sent: mailSent, whatsapp_sent: whatsappSent });
  } catch (err) {
    res.status(500).json({ message: 'No se pudo aprobar solicitud', details: err?.message });
  }
};

export const rejectOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.ticketOrder.update({
      where: { id },
      data: { status: 'rejected' },
    });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo rechazar solicitud', details: err?.message });
  }
};

export const remindOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.ticketOrder.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!order) return res.status(404).json({ message: 'Solicitud no encontrada' });
    const event = order.event;
    const mailSent = await safeNotify('remind-email', () =>
      sendOrderNotification({
        to: order.email,
        subject: `Recordatorio de pago - ${event.title}`,
        text: `Hola ${order.full_name}. Aun esperamos la verificacion de tu pago para el evento ${event.title}. Cantidad: ${order.qty}.`,
        html: `<p>Hola ${order.full_name},</p><p>Aun esperamos la verificacion de tu pago para el evento <strong>${event.title}</strong>.</p><p><strong>Boletos:</strong> ${order.qty}</p>`,
      })
    );
    const whatsappSent = await safeNotify('remind-whatsapp', () => sendTicketWhatsApp({ type: 'remind', order, event }));
    res.json({ ok: true, mail_sent: mailSent, whatsapp_sent: whatsappSent });
  } catch (err) {
    res.status(500).json({ message: 'No se pudo enviar recordatorio', details: err?.message });
  }
};

export const listTickets = async (req, res) => {
  const { id } = req.params;
  try {
    const tickets = await prisma.ticketItem.findMany({ where: { orderId: id } });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo listar tickets', details: err?.message });
  }
};

export const scanTicket = async (req, res) => {
  const { code, ticket_id } = req.body || {};
  let ticketCode = cleanString(code);
  let ticketId = cleanString(ticket_id);
  if (!ticketId && ticketCode && ticketCode.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(ticketCode);
      if (parsed && parsed.ticketId) ticketId = cleanString(parsed.ticketId);
      if (!ticketId && parsed && parsed.code) ticketCode = cleanString(parsed.code);
    } catch {}
  }
  try {
    const ticket = await prisma.ticketItem.findFirst({
      where: {
        OR: [{ ticket_code: ticketCode }, { id: ticketId }],
      },
      include: { order: true, event: true },
    });
    if (!ticket) return res.status(404).json({ message: 'Ticket no encontrado' });
    if (ticket.status === 'used') {
      return res.status(409).json({ message: 'Ticket ya utilizado', ticket });
    }
    const updated = await prisma.ticketItem.update({
      where: { id: ticket.id },
      data: { status: 'used', usedAt: new Date() },
    });
    res.json({ message: 'Ticket vÃ¡lido', ticket: { ...updated, order: ticket.order, event: ticket.event } });
  } catch (err) {
    res.status(500).json({ message: 'No se pudo validar ticket', details: err?.message });
  }
};

