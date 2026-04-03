import { prisma } from '../prisma.js';
import { validationResult } from 'express-validator';
import { sendOrderNotification } from '../services/mailer.js';
import { buildAdminOrderNotification, buildCustomerOrderConfirmation } from '../services/orderMailer.js';
import { config } from '../config/env.js';

const ORDER_STATUSES = new Set([
  'new_order',
  'pending',
  'payment_review',
  'accepted',
  'confirmed',
  'shipped',
  'completed',
]);

function sanitizeProducts(products) {
  if (!Array.isArray(products)) return [];
  return products
    .map((p) => ({
      id: String(p?.id || '').trim(),
      title: String(p?.title || '').trim(),
      color: String(p?.color || '').trim(),
      size: String(p?.size || '').trim(),
      qty: Number(p?.qty || 0),
      price: Number(p?.price || 0),
    }))
    .filter((p) => p.title && p.qty > 0);
}

// buildOrderEmail removed — replaced by branded templates in orderMailer.js

function orderStatusMeta(statusRaw) {
  const status = String(statusRaw || '').trim().toLowerCase();
  if (status === 'accepted' || status === 'confirmed') {
    return {
      label: 'Orden aceptada',
      subject: 'Tu compra fue aceptada - Sun Session Club',
      html: `
        <h2>Tu compra fue aceptada</h2>
        <p>Gracias por tu compra en <strong>Sun Session Club</strong>.</p>
        <p>Ya validamos tu solicitud y nuestro equipo se pondra en contacto contigo para confirmar los siguientes pasos.</p>
        <p><strong>Importante:</strong> este es un sistema seguro de confirmacion manual para proteger tu compra.</p>
        <p>Si necesitas ayuda, puedes responder este correo y te apoyamos.</p>
      `,
      text: [
        'Tu compra fue aceptada.',
        'Gracias por tu compra en Sun Session Club.',
        'Ya validamos tu solicitud y nuestro equipo se pondra en contacto contigo para confirmar los siguientes pasos.',
        'Importante: este es un sistema seguro de confirmacion manual para proteger tu compra.',
        'Si necesitas ayuda, puedes responder este correo y te apoyamos.',
      ].join('\n'),
    };
  }
  if (status === 'shipped' || status === 'completed') {
    return {
      label: status === 'shipped' ? 'Pedido enviado' : 'Pedido finalizado',
      subject: 'Tu pedido va en camino - Sun Session Club',
      html: `
        <h2>Tu pedido fue enviado</h2>
        <p>Tu paquete ya fue procesado y <strong>va en camino</strong>.</p>
        <p>Gracias por tu compra y por confiar en Sun Session Club.</p>
        <p>Si tienes dudas sobre la entrega, responde este correo y te ayudamos de inmediato.</p>
      `,
      text: [
        'Tu pedido fue enviado.',
        'Tu paquete ya fue procesado y va en camino.',
        'Gracias por tu compra y por confiar en Sun Session Club.',
        'Si tienes dudas sobre la entrega, responde este correo y te ayudamos de inmediato.',
      ].join('\n'),
    };
  }
  if (status === 'payment_review') {
    return {
      label: 'Pago en revision',
      subject: 'Estamos revisando tu pago - Sun Session Club',
      html: `
        <h2>Pago en revision</h2>
        <p>Recibimos tu solicitud y estamos revisando el pago.</p>
        <p>Te avisaremos por este medio en cuanto termine la validacion.</p>
      `,
      text: [
        'Pago en revision.',
        'Recibimos tu solicitud y estamos revisando el pago.',
        'Te avisaremos por este medio en cuanto termine la validacion.',
      ].join('\n'),
    };
  }
  return {
    label: `Estado actualizado: ${status || 'new_order'}`,
    subject: 'Actualizacion de tu orden - Sun Session Club',
    html: `<p>El estado de tu orden ahora es: <strong>${status || 'new_order'}</strong>.</p>`,
    text: `El estado de tu orden ahora es: ${status || 'new_order'}.`,
  };
}

export const createOrder = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validacion fallida', errors: errors.array() });
  }

  const { name, last_name, phone, email, notes } = req.body || {};
  const items = sanitizeProducts(req.body?.products);
  if (!items.length) {
    return res.status(400).json({ message: 'El carrito esta vacio' });
  }

  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);

  try {
    const order = await prisma.order.create({
      data: {
        name: String(name || '').trim(),
        last_name: String(last_name || '').trim(),
        phone: String(phone || '').trim(),
        email: String(email || '').trim(),
        notes: String(notes || '').trim() || null,
        products: JSON.stringify(items),
        total_items: totalItems,
        status: 'new_order',
      },
    });

    const buyerEmail = String(order.email || '').trim().toLowerCase();
    let vipUpgraded = false;
    if (buyerEmail) {
      const existingUser = await prisma.user.findFirst({ where: { email: buyerEmail, deletedAt: null } });
      if (existingUser) {
        const nextPurchaseCount = Number(existingUser.purchaseCount || 0) + totalItems;
        const shouldBeVip = existingUser.vipStatus || nextPurchaseCount >= 10;
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            purchaseCount: { increment: totalItems },
            vipStatus: shouldBeVip,
          },
        });
        vipUpgraded = !existingUser.vipStatus && shouldBeVip;
      }
    }

    let mail = { skipped: true };
    let customerMail = { skipped: true };
    try {
      const settings = await prisma.settings.findUnique({ where: { id: 'site' } });
      const adminEmail = settings?.order_notification_email || config.notificationEmail || '';

      // Admin notification
      const adminContent = buildAdminOrderNotification({ order, items });
      mail = await sendOrderNotification({ to: adminEmail, ...adminContent });

      // Customer confirmation
      if (order.email) {
        const customerContent = buildCustomerOrderConfirmation({ order, items });
        customerMail = await sendOrderNotification({ to: order.email, ...customerContent });
      }

      if (vipUpgraded) {
        await sendOrderNotification({
          to: order.email,
          subject: 'VIP Upgrade - Sun Session Club',
          text: 'Tu cuenta ahora es VIP por tu actividad de compra. Disfruta acceso prioritario y drops exclusivos.',
          html: '<p>Tu cuenta ahora es <strong>VIP</strong> por tu actividad de compra.</p><p>Disfruta acceso prioritario y drops exclusivos.</p>',
        });
      }
    } catch {
      mail = { skipped: true };
    }

    res.status(201).json({ order, mail_sent: !mail.skipped, customer_mail_sent: !customerMail.skipped, vip_upgraded: vipUpgraded });
  } catch (err) {
    res.status(500).json({ message: 'No se pudo crear la orden', details: err?.message });
  }
};

export const listOrders = async (req, res) => {
  try {
    const rows = await prisma.order.findMany({ orderBy: { createdAt: 'desc' } });
    const items = rows.map((row) => ({
      ...row,
      products: (() => {
        try {
          return JSON.parse(row.products || '[]');
        } catch {
          return [];
        }
      })(),
    }));
    res.json(items);
  } catch {
    res.json([]);
  }
};

export const listMyOrders = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.email) {
      return res.json([]);
    }

    const targetEmail = String(user.email || '').trim().toLowerCase();
    const rows = await prisma.order.findMany({ orderBy: { createdAt: 'desc' } });
    const mine = rows
      .filter((row) => String(row.email || '').trim().toLowerCase() === targetEmail)
      .map((row) => ({
        ...row,
        products: (() => {
          try {
            return JSON.parse(row.products || '[]');
          } catch {
            return [];
          }
        })(),
      }));

    res.json(mine);
  } catch {
    res.json([]);
  }
};

export const updateOrderStatus = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validacion fallida', errors: errors.array() });
  }
  const { id } = req.params;
  const nextStatus = String(req.body?.status || '').trim().toLowerCase();
  if (!ORDER_STATUSES.has(nextStatus)) {
    return res.status(400).json({ message: 'Status no valido' });
  }
  try {
    const updated = await prisma.order.update({
      where: { id },
      data: { status: nextStatus },
    });
    let mail = { skipped: true };
    if (updated.email) {
      const statusInfo = orderStatusMeta(nextStatus);
      try {
        mail = await sendOrderNotification({
          to: updated.email,
          subject: statusInfo.subject,
          text: statusInfo.text,
          html: statusInfo.html,
        });
      } catch (mailErr) {
        mail = { skipped: true, error: mailErr?.message || 'mail_error' };
      }
    }
    res.json({
      ...updated,
      status_label: orderStatusMeta(nextStatus).label,
      mail_sent: !mail.skipped,
      mail_error: mail.error || null,
    });
  } catch (err) {
    res.status(500).json({ message: 'No se pudo actualizar status de orden', details: err?.message });
  }
};
