/**
 * Branded Order Email Templates
 * Professional HTML emails for merch/vinyl orders and ticket request notifications
 */

function sscEmailShell(title, bodyContent) {
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#060d08;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060d08;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="text-align:center;padding:40px 24px 20px;">
              <p style="margin:0;font-size:14px;letter-spacing:8px;color:#00FFAA;font-weight:600;">THE</p>
              <p style="margin:4px 0 0;font-size:28px;letter-spacing:6px;color:#ffffff;font-weight:800;">SUN SESSION CLUB</p>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:linear-gradient(to right,transparent,rgba(0,255,170,0.3),transparent);"></div>
            </td>
          </tr>
          ${bodyContent}
          <!-- Footer -->
          <tr>
            <td style="text-align:center;padding:32px 32px 40px;">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);letter-spacing:2px;">THE SUN SESSION CLUB</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return String(d || ''); }
}

function formatMoney(n) {
  return '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Admin notification: new merch/vinyl order received
 */
export function buildAdminOrderNotification({ order, items }) {
  const fullName = `${order.name} ${order.last_name}`.trim();
  const date = formatDate(order.date || order.createdAt);
  const totalAmount = items.reduce((s, i) => s + (i.price * i.qty), 0);
  const subject = `Nueva orden de merch \u2013 ${fullName}`;

  const productRows = items.map(item => `
          <tr>
            <td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;">${item.title}</p>
              <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.5);">
                ${item.color ? `Color: ${item.color}` : ''}${item.size ? ` &bull; Talla: ${item.size}` : ''} &bull; Cantidad: ${item.qty}
              </p>
            </td>
            <td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:right;">
              <p style="margin:0;font-size:14px;font-weight:700;color:#00FFAA;">${formatMoney(item.price * item.qty)}</p>
            </td>
          </tr>`).join('');

  const body = `
          <!-- Title -->
          <tr>
            <td style="text-align:center;padding:40px 32px 16px;">
              <p style="margin:0;font-size:12px;letter-spacing:4px;color:#00FFAA;font-weight:600;">NUEVA ORDEN</p>
              <p style="margin:8px 0 0;font-size:28px;font-weight:800;color:#ffffff;">Orden de Merch</p>
            </td>
          </tr>
          <!-- Customer Info -->
          <tr>
            <td style="padding:16px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1b13;border-radius:12px;border:1px solid rgba(0,255,170,0.15);">
                <tr>
                  <td style="padding:20px 20px 8px;">
                    <p style="margin:0;font-size:11px;letter-spacing:3px;color:#00FFAA;font-weight:600;">CLIENTE</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px 6px;">
                    <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">${fullName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px 6px;">
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);">\u2709 ${order.email || 'Sin email'}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px 6px;">
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);">\ud83d\udcf1 ${order.phone || 'Sin tel\u00e9fono'}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px 20px;">
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);">\ud83d\udcc5 ${date}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Products -->
          <tr>
            <td style="padding:8px 32px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#111b14;border-radius:12px;border:1px solid rgba(0,100,0,0.25);">
                <tr>
                  <td colspan="2" style="padding:16px 16px 8px;">
                    <p style="margin:0;font-size:11px;letter-spacing:3px;color:#00FFAA;font-weight:600;">PRODUCTOS</p>
                  </td>
                </tr>
                ${productRows}
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:14px;font-weight:800;color:#ffffff;">TOTAL</p>
                  </td>
                  <td style="padding:14px 16px;text-align:right;">
                    <p style="margin:0;font-size:18px;font-weight:800;color:#00FFAA;">${formatMoney(totalAmount)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${order.notes ? `
          <tr>
            <td style="padding:0 32px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:8px;border:1px solid rgba(255,255,255,0.08);">
                <tr><td style="padding:12px 16px;">
                  <p style="margin:0;font-size:11px;letter-spacing:2px;color:rgba(255,255,255,0.4);font-weight:600;">NOTAS</p>
                  <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.7);">${order.notes}</p>
                </td></tr>
              </table>
            </td>
          </tr>` : ''}
          <!-- Action -->
          <tr>
            <td style="text-align:center;padding:8px 32px 24px;">
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.5);">Contacta al cliente para finalizar la compra.</p>
            </td>
          </tr>`;

  const html = sscEmailShell(subject, body);

  const text = [
    `NUEVA ORDEN DE MERCH`,
    ``,
    `Cliente: ${fullName}`,
    `Email: ${order.email || 'N/A'}`,
    `Tel\u00e9fono: ${order.phone || 'N/A'}`,
    `Fecha: ${date}`,
    ``,
    `Productos:`,
    ...items.map(i => `- ${i.title} | ${i.color || 'N/A'} | ${i.size || 'N/A'} | x${i.qty} | ${formatMoney(i.price * i.qty)}`),
    ``,
    `Total: ${formatMoney(totalAmount)}`,
    order.notes ? `Notas: ${order.notes}` : '',
    ``,
    `Contacta al cliente para finalizar la compra.`,
    `-- The Sun Session Club`,
  ].join('\n');

  return { subject, html, text };
}

/**
 * Customer confirmation: merch/vinyl order received
 */
export function buildCustomerOrderConfirmation({ order, items }) {
  const fullName = `${order.name} ${order.last_name}`.trim();
  const totalAmount = items.reduce((s, i) => s + (i.price * i.qty), 0);
  const subject = `Orden recibida \u2013 Sun Session Club`;

  const productRows = items.map(item => `
          <tr>
            <td style="padding:8px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:14px;color:#ffffff;">${item.title}</p>
              <p style="margin:2px 0 0;font-size:12px;color:rgba(255,255,255,0.45);">
                ${item.color ? `${item.color}` : ''}${item.size ? ` / ${item.size}` : ''} &bull; x${item.qty}
              </p>
            </td>
            <td style="padding:8px 16px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:right;">
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);">${formatMoney(item.price * item.qty)}</p>
            </td>
          </tr>`).join('');

  const body = `
          <!-- Title -->
          <tr>
            <td style="text-align:center;padding:40px 32px 16px;">
              <p style="margin:0;font-size:28px;font-weight:800;color:#ffffff;">Recibimos tu orden</p>
              <p style="margin:12px 0 0;font-size:15px;color:rgba(255,255,255,0.6);line-height:1.5;">
                Gracias ${fullName}. Tu pedido est\u00e1 siendo procesado.<br>
                Nuestro equipo se pondr\u00e1 en contacto contigo para confirmar el pago y env\u00edo.
              </p>
            </td>
          </tr>
          <!-- Products -->
          <tr>
            <td style="padding:16px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#111b14;border-radius:12px;border:1px solid rgba(0,100,0,0.25);">
                <tr>
                  <td colspan="2" style="padding:16px 16px 8px;">
                    <p style="margin:0;font-size:11px;letter-spacing:3px;color:#00FFAA;font-weight:600;">TU PEDIDO</p>
                  </td>
                </tr>
                ${productRows}
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:14px;font-weight:700;color:#ffffff;">Total</p>
                  </td>
                  <td style="padding:14px 16px;text-align:right;">
                    <p style="margin:0;font-size:16px;font-weight:800;color:#00FFAA;">${formatMoney(totalAmount)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Info -->
          <tr>
            <td style="text-align:center;padding:8px 32px 24px;">
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.6;">
                Te enviaremos una actualizaci\u00f3n cuando tu orden sea confirmada.<br>
                Si tienes dudas, responde a este correo.
              </p>
            </td>
          </tr>`;

  const html = sscEmailShell(subject, body);

  const text = [
    `Recibimos tu orden - Sun Session Club`,
    ``,
    `Gracias ${fullName}. Tu pedido est\u00e1 siendo procesado.`,
    ``,
    `Productos:`,
    ...items.map(i => `- ${i.title} (${i.color || 'N/A'} / ${i.size || 'N/A'}) x${i.qty} - ${formatMoney(i.price * i.qty)}`),
    `Total: ${formatMoney(totalAmount)}`,
    ``,
    `Nuestro equipo se pondr\u00e1 en contacto para confirmar pago y env\u00edo.`,
    `-- The Sun Session Club`,
  ].join('\n');

  return { subject, html, text };
}

/**
 * Admin notification: new ticket request received
 */
export function buildAdminTicketNotification({ event, order }) {
  const eventDate = formatDate(event.date);
  const subject = `Nueva solicitud de boletos \u2013 ${event.title}`;
  const totalAmount = (event.price || 0) * order.qty;

  const body = `
          <!-- Title -->
          <tr>
            <td style="text-align:center;padding:40px 32px 16px;">
              <p style="margin:0;font-size:12px;letter-spacing:4px;color:#00FFAA;font-weight:600;">NUEVA SOLICITUD</p>
              <p style="margin:8px 0 0;font-size:28px;font-weight:800;color:#ffffff;">Boletos Solicitados</p>
            </td>
          </tr>
          <!-- Event Info -->
          <tr>
            <td style="padding:16px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1b13;border-radius:12px;border:1px solid rgba(0,255,170,0.15);">
                <tr>
                  <td style="padding:20px 20px 8px;">
                    <p style="margin:0;font-size:11px;letter-spacing:3px;color:#00FFAA;font-weight:600;">EVENTO</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px 6px;">
                    <p style="margin:0;font-size:18px;font-weight:800;color:#ffffff;">${event.title}</p>
                  </td>
                </tr>
                ${event.artists ? `<tr><td style="padding:0 20px 6px;"><p style="margin:0;font-size:13px;color:rgba(255,255,255,0.5);">${event.artists}</p></td></tr>` : ''}
                <tr>
                  <td style="padding:0 20px 6px;">
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);">\ud83d\udcc5 ${eventDate}${event.time ? ` &bull; \ud83d\udd54 ${event.time}` : ''}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px 20px;">
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);">\ud83d\udccd ${event.location || event.venue || 'Por confirmar'}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Customer + Ticket Info -->
          <tr>
            <td style="padding:8px 32px 16px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#111b14;border-radius:12px;border:1px solid rgba(0,100,0,0.25);">
                <tr>
                  <td style="padding:20px 20px 8px;">
                    <p style="margin:0;font-size:11px;letter-spacing:3px;color:#00FFAA;font-weight:600;">SOLICITANTE</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px 6px;">
                    <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">${order.full_name}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px 6px;">
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);">\u2709 ${order.email}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px 12px;">
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);">\ud83d\udcf1 ${order.phone || 'Sin tel\u00e9fono'}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px;">
                    <div style="height:1px;background:rgba(255,255,255,0.06);"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 20px 6px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td><p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);">Boletos</p></td>
                        <td style="text-align:right;"><p style="margin:0;font-size:16px;font-weight:800;color:#ffffff;">${order.qty}</p></td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${event.price ? `
                <tr>
                  <td style="padding:6px 20px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td><p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);">Total estimado</p></td>
                        <td style="text-align:right;"><p style="margin:0;font-size:16px;font-weight:800;color:#00FFAA;">${formatMoney(totalAmount)}</p></td>
                      </tr>
                    </table>
                  </td>
                </tr>` : `
                <tr><td style="padding:0 20px 20px;"></td></tr>`}
              </table>
            </td>
          </tr>
          ${order.payment_proof ? `
          <tr>
            <td style="text-align:center;padding:0 32px 16px;">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.4);">\u2705 Comprobante de pago adjunto en el sistema</p>
            </td>
          </tr>` : ''}
          <!-- Action -->
          <tr>
            <td style="text-align:center;padding:8px 32px 24px;">
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.5);">Revisa y aprueba esta solicitud desde el panel de administraci\u00f3n.</p>
            </td>
          </tr>`;

  const html = sscEmailShell(subject, body);

  const text = [
    `NUEVA SOLICITUD DE BOLETOS`,
    ``,
    `Evento: ${event.title}`,
    `Fecha: ${eventDate}${event.time ? ` | ${event.time}` : ''}`,
    `Lugar: ${event.location || event.venue || 'Por confirmar'}`,
    ``,
    `Solicitante: ${order.full_name}`,
    `Email: ${order.email}`,
    `Tel\u00e9fono: ${order.phone || 'N/A'}`,
    `Boletos: ${order.qty}`,
    event.price ? `Total estimado: ${formatMoney(totalAmount)}` : '',
    order.payment_proof ? `Comprobante: adjunto en el sistema` : '',
    ``,
    `Revisa y aprueba desde el panel de administraci\u00f3n.`,
    `-- The Sun Session Club`,
  ].join('\n');

  return { subject, html, text };
}
