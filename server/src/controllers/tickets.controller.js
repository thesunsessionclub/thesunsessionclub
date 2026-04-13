import { prisma } from '../prisma.js';
import { validationResult } from 'express-validator';
import { broadcast } from '../socket.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { sendOrderNotification } from '../services/mailer.js';
import { sendTicketWhatsApp } from '../services/whatsapp.js';
import { generateAndSaveTicket } from '../services/ticketGenerator.js';
import {
  buildTicketConfirmationEmail,
  buildRequestReceivedEmail,
  buildPaymentReminderEmail,
} from '../services/ticketMailer.js';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const PAYMENTS_DIR = path.join(UPLOADS_DIR, 'payments');

const ORDER_ACTIVE_STATUSES = ['pending', 'paid', 'confirmed'];
const TICKET_VALID_STATUSES = ['valid', 'used'];

/* ── helpers ──────────────────────────────────────────── */

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

/* ── availability ─────────────────────────────────────── */

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
  return { event_id: eventId, limit, reserved, sold, remaining };
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

/* ── controllers ──────────────────────────────────────── */

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
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validación fallida', errors: errors.array() });
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

    // Professional branded email
    const emailContent = buildRequestReceivedEmail({ event, order });
    const mailSent = await safeNotify('request-email', () =>
      sendOrderNotification({
        to: order.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      })
    );
    const whatsappSent = await safeNotify('request-whatsapp', () => sendTicketWhatsApp({ type: 'request', order, event }));
    res.status(201).json({ ...order, payment_proof: proofUrl || order.payment_proof, mail_sent: mailSent, whatsapp_sent: whatsappSent });
    broadcast('tickets:update', null);
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
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Validación fallida', errors: errors.array() });
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
    broadcast('tickets:update', null);
  } catch (err) {
    res.status(500).json({ message: 'No se pudo actualizar solicitud', details: err?.message });
  }
};

/**
 * Approve order: generate premium PNG tickets, send branded email
 */
export const approveOrder = async (req, res) => {
  const { id } = req.params;
  try {
    const order = await prisma.ticketOrder.findUnique({ where: { id }, include: { event: true } });
    if (!order) return res.status(404).json({ message: 'Solicitud no encontrada' });
    const event = order.event;

    // Check availability (excluding this order)
    const otherReservedAgg = await prisma.ticketOrder.aggregate({
      _sum: { qty: true },
      where: { eventId: order.eventId, status: { in: ORDER_ACTIVE_STATUSES }, NOT: { id: order.id } },
    });
    const reservedExcluding = Number(otherReservedAgg._sum.qty || 0);
    if (event.ticket_limit != null && reservedExcluding + order.qty > event.ticket_limit) {
      return res.status(409).json({
        message: 'No hay suficientes boletos disponibles',
        remaining: Math.max(0, event.ticket_limit - reservedExcluding),
      });
    }

    const host = pickHost(req);
    const createdTickets = [];

    // Generate each ticket with premium PNG image
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

      // Generate premium 1080x1920 PNG ticket
      const assets = await generateAndSaveTicket({
        event,
        order,
        ticket,
        ticketNumber: i + 1,
        totalTickets: order.qty,
        baseUrl: host,
      });

      const updated = await prisma.ticketItem.update({
        where: { id: ticket.id },
        data: { qr_payload: assets.qrPayload, ticket_image: assets.ticketImage },
      });
      createdTickets.push(updated);
    }

    // Update order status
    const updatedOrder = await prisma.ticketOrder.update({
      where: { id },
      data: { status: 'confirmed' },
    });

    // Update user participation counter
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

    // Send professional branded email with ticket links
    const emailContent = buildTicketConfirmationEmail({
      event,
      order,
      tickets: createdTickets,
      baseUrl: host,
    });
    const mailSent = await safeNotify('approve-email', () =>
      sendOrderNotification({
        to: order.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
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
    console.error('[tickets] approveOrder error:', err);
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

    const emailContent = buildPaymentReminderEmail({ event, order });
    const mailSent = await safeNotify('remind-email', () =>
      sendOrderNotification({
        to: order.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
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

/**
 * Scan / check-in a ticket (admin tool at events)
 * Accepts: { code } or { ticket_id } or raw QR JSON payload
 */
export const scanTicket = async (req, res) => {
  const { code, ticket_id } = req.body || {};
  let ticketCode = cleanString(code);
  let ticketId = cleanString(ticket_id);

  // Parse QR payload (JSON or validation URL)
  if (!ticketId && ticketCode) {
    const trimmed = ticketCode.trim();

    // JSON payload from QR
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && parsed.ticketId) ticketId = cleanString(parsed.ticketId);
        if (!ticketId && parsed && parsed.code) ticketCode = cleanString(parsed.code);
      } catch {}
    }

    // URL payload from QR (e.g. https://domain/validate-ticket/A3B7C9D1E2)
    if (!ticketId && trimmed.includes('/validate-ticket/')) {
      const match = trimmed.match(/\/validate-ticket\/([A-Fa-f0-9]+)/);
      if (match) ticketCode = match[1].toUpperCase();
    }
  }

  try {
    const ticket = await prisma.ticketItem.findFirst({
      where: {
        OR: [
          ...(ticketCode ? [{ ticket_code: ticketCode }] : []),
          ...(ticketId ? [{ id: ticketId }] : []),
        ],
      },
      include: { order: true, event: true },
    });

    if (!ticket) {
      return res.status(404).json({ status: 'invalid', message: 'Ticket no encontrado' });
    }

    if (ticket.status === 'invalid') {
      return res.status(410).json({ status: 'invalid', message: 'Ticket invalidado', ticket });
    }

    if (ticket.status === 'used') {
      return res.status(409).json({
        status: 'used',
        message: 'Ticket ya utilizado',
        usedAt: ticket.usedAt,
        ticket,
      });
    }

    // Mark as used
    const updated = await prisma.ticketItem.update({
      where: { id: ticket.id },
      data: { status: 'used', usedAt: new Date() },
    });

    res.json({
      status: 'valid',
      message: 'Ticket válido - Acceso permitido',
      ticket: { ...updated, order: ticket.order, event: ticket.event },
    });
  } catch (err) {
    res.status(500).json({ message: 'No se pudo validar ticket', details: err?.message });
  }
};

/**
 * Public validation endpoint - check ticket status without consuming it
 * Used by QR code scan from any phone camera
 * GET /api/tickets/validate/:code
 */
export const validateTicket = async (req, res) => {
  const code = cleanString(req.params.code).toUpperCase();
  if (!code) return res.status(400).json({ status: 'invalid', message: 'Código requerido' });

  try {
    const ticket = await prisma.ticketItem.findFirst({
      where: { ticket_code: code },
      include: {
        order: { select: { full_name: true, email: true, qty: true } },
        event: { select: { id: true, title: true, date: true, time: true, location: true, venue: true, image: true, artists: true } },
      },
    });

    if (!ticket) {
      return res.status(404).json({ status: 'invalid', message: 'Ticket no encontrado' });
    }

    const response = {
      status: ticket.status,
      ticket_code: ticket.ticket_code,
      event: ticket.event,
      attendee: ticket.order?.full_name || '',
      ticket_image: ticket.ticket_image,
    };

    if (ticket.status === 'used') {
      response.usedAt = ticket.usedAt;
      response.message = 'Este ticket ya fue utilizado';
    } else if (ticket.status === 'invalid') {
      response.message = 'Este ticket ha sido invalidado';
    } else {
      response.message = 'Ticket válido';
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ message: 'Error al validar ticket', details: err?.message });
  }
};

/**
 * Admin: Invalidate a ticket (revoke access)
 * POST /api/tickets/:ticketId/invalidate
 */
export const invalidateTicket = async (req, res) => {
  const { ticketId } = req.params;
  try {
    const ticket = await prisma.ticketItem.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ message: 'Ticket no encontrado' });

    const updated = await prisma.ticketItem.update({
      where: { id: ticketId },
      data: { status: 'invalid' },
    });
    res.json({ message: 'Ticket invalidado', ticket: updated });
  } catch (err) {
    res.status(500).json({ message: 'No se pudo invalidar ticket', details: err?.message });
  }
};
