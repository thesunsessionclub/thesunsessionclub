/**
 * Premium Ticket Email Templates
 * Professional HTML emails with event branding for ticket delivery
 */

/**
 * Build a premium HTML email for confirmed tickets
 * @param {Object} params
 * @param {Object} params.event - Event record
 * @param {Object} params.order - TicketOrder record
 * @param {Array}  params.tickets - Array of TicketItem records
 * @param {string} params.baseUrl - Server base URL (e.g. https://sunsessionclub.com)
 * @returns {{ subject: string, html: string, text: string }}
 */
export function buildTicketConfirmationEmail({ event, order, tickets, baseUrl }) {
  const eventDate = event.date
    ? new Date(event.date).toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';
  const eventTime = event.time || '';
  const location = event.location || event.venue || '';
  const ticketCount = tickets.length;

  const ticketCards = tickets
    .map((t, i) => {
      const num = ticketCount > 1 ? ` #${i + 1}` : '';
      const imgUrl = `${baseUrl}${t.ticket_image}`;
      const viewUrl = `${baseUrl}/ticket.html?code=${t.ticket_code}`;
      return `
        <tr>
          <td style="padding:16px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#111b14;border-radius:16px;overflow:hidden;border:1px solid rgba(0,255,170,0.15);">
              <tr>
                <td style="padding:24px;text-align:center;">
                  <p style="margin:0 0 8px;font-size:12px;letter-spacing:4px;color:#00FFAA;font-weight:600;">TICKET${num}</p>
                  <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#ffffff;font-family:'Courier New',monospace;letter-spacing:3px;">${t.ticket_code}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 24px;text-align:center;">
                  <a href="${viewUrl}" style="display:inline-block;background:#00FFAA;color:#000000;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:1px;">
                    VER TICKET COMPLETO
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 20px;text-align:center;">
                  <a href="${imgUrl}" download="ticket_${t.ticket_code}.png" style="font-size:12px;color:#00FFAA;text-decoration:underline;">
                    Descargar imagen del ticket
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join('');

  const subject = `Tu acceso est\u00e1 confirmado \u2013 ${event.title}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${subject}</title>
</head>
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

          <!-- Confirmation Message -->
          <tr>
            <td style="text-align:center;padding:40px 32px 16px;">
              <p style="margin:0;font-size:32px;font-weight:800;color:#ffffff;line-height:1.2;">
                Tu acceso est\u00e1 confirmado.
              </p>
              <p style="margin:12px 0 0;font-size:16px;color:rgba(255,255,255,0.6);line-height:1.5;">
                Presenta este ticket en la entrada del evento.
              </p>
            </td>
          </tr>

          <!-- Event Info Card -->
          <tr>
            <td style="padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1b13;border-radius:16px;border:1px solid rgba(0,100,0,0.25);">
                <tr>
                  <td style="padding:28px 24px;text-align:center;">
                    <p style="margin:0 0 12px;font-size:24px;font-weight:800;color:#ffffff;">${event.title}</p>
                    ${event.artists ? `<p style="margin:0 0 16px;font-size:14px;color:rgba(255,255,255,0.5);">${event.artists}</p>` : ''}
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align:center;padding:6px 0;">
                          <span style="font-size:13px;color:#00FFAA;font-weight:600;">\ud83d\udcc5</span>
                          <span style="font-size:14px;color:rgba(255,255,255,0.8);margin-left:8px;">${eventDate}</span>
                        </td>
                      </tr>
                      ${eventTime ? `
                      <tr>
                        <td style="text-align:center;padding:6px 0;">
                          <span style="font-size:13px;color:#00FFAA;font-weight:600;">\ud83d\udd54</span>
                          <span style="font-size:14px;color:rgba(255,255,255,0.8);margin-left:8px;">${eventTime}</span>
                        </td>
                      </tr>` : ''}
                      ${location ? `
                      <tr>
                        <td style="text-align:center;padding:6px 0;">
                          <span style="font-size:13px;color:#00FFAA;font-weight:600;">\ud83d\udccd</span>
                          <span style="font-size:14px;color:rgba(255,255,255,0.8);margin-left:8px;">${location}</span>
                        </td>
                      </tr>` : ''}
                      <tr>
                        <td style="text-align:center;padding:6px 0;">
                          <span style="font-size:13px;color:#00FFAA;font-weight:600;">\ud83c\udfab</span>
                          <span style="font-size:14px;color:rgba(255,255,255,0.8);margin-left:8px;">${ticketCount} ticket${ticketCount > 1 ? 's' : ''}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Attendee -->
          <tr>
            <td style="text-align:center;padding:8px 32px;">
              <p style="margin:0;font-size:12px;letter-spacing:4px;color:rgba(255,255,255,0.4);font-weight:600;">TITULAR</p>
              <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#ffffff;">${order.full_name}</p>
            </td>
          </tr>

          <!-- Tickets -->
          <tr>
            <td style="padding:16px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${ticketCards}
              </table>
            </td>
          </tr>

          <!-- Instructions -->
          <tr>
            <td style="padding:16px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,255,170,0.05);border-radius:12px;border:1px solid rgba(0,255,170,0.1);">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#00FFAA;">Instrucciones</p>
                    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);line-height:1.6;">
                      \u2022 Guarda tu ticket en tu tel\u00e9fono<br>
                      \u2022 Presenta el QR en la entrada para escaneo<br>
                      \u2022 Cada ticket es de uso \u00fanico e intransferible<br>
                      \u2022 Llega con tiempo para evitar filas
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:24px 40px;">
              <div style="height:1px;background:linear-gradient(to right,transparent,rgba(0,255,170,0.2),transparent);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align:center;padding:16px 32px 40px;">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);letter-spacing:2px;">THE SUN SESSION CLUB</p>
              <p style="margin:8px 0 0;font-size:11px;color:rgba(255,255,255,0.15);">
                Este email fue enviado a ${order.email}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Tu acceso est\u00e1 confirmado - ${event.title}

Hola ${order.full_name},

Tu pago ha sido verificado y tus tickets est\u00e1n listos.

Evento: ${event.title}
Fecha: ${eventDate}
${eventTime ? `Hora: ${eventTime}` : ''}
${location ? `Lugar: ${location}` : ''}
Tickets: ${ticketCount}

${tickets.map((t, i) => `Ticket${ticketCount > 1 ? ` #${i + 1}` : ''}: ${t.ticket_code}\nVer: ${baseUrl}/ticket.html?code=${t.ticket_code}\nDescargar: ${baseUrl}${t.ticket_image}`).join('\n\n')}

Presenta tu ticket en la entrada del evento.
Cada ticket es de uso unico e intransferible.

-- The Sun Session Club`;

  return { subject, html, text };
}

/**
 * Build email for ticket request received
 */
export function buildRequestReceivedEmail({ event, order }) {
  const subject = `Solicitud recibida \u2013 ${event.title}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#060d08;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060d08;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="text-align:center;padding:40px 24px 20px;">
              <p style="margin:0;font-size:14px;letter-spacing:8px;color:#00FFAA;font-weight:600;">THE</p>
              <p style="margin:4px 0 0;font-size:28px;letter-spacing:6px;color:#ffffff;font-weight:800;">SUN SESSION CLUB</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:linear-gradient(to right,transparent,rgba(0,255,170,0.3),transparent);"></div>
            </td>
          </tr>
          <tr>
            <td style="text-align:center;padding:40px 32px 16px;">
              <p style="margin:0;font-size:28px;font-weight:800;color:#ffffff;">Solicitud recibida</p>
              <p style="margin:12px 0 0;font-size:15px;color:rgba(255,255,255,0.6);line-height:1.5;">
                Gracias ${order.full_name}. Tu solicitud de ${order.qty} ticket${order.qty > 1 ? 's' : ''}
                para <strong style="color:#ffffff;">${event.title}</strong> est\u00e1 siendo procesada.
              </p>
              <p style="margin:16px 0 0;font-size:14px;color:rgba(255,255,255,0.4);">
                Te notificaremos cuando tu pago sea verificado.
              </p>
            </td>
          </tr>
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

  const text = `Solicitud recibida - ${event.title}\n\nGracias ${order.full_name}. Tu solicitud de ${order.qty} tickets para ${event.title} esta siendo procesada. Te notificaremos cuando tu pago sea verificado.\n\n-- The Sun Session Club`;

  return { subject, html, text };
}

/**
 * Build payment reminder email
 */
export function buildPaymentReminderEmail({ event, order }) {
  const subject = `Recordatorio de pago \u2013 ${event.title}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#060d08;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060d08;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="text-align:center;padding:40px 24px 20px;">
              <p style="margin:0;font-size:14px;letter-spacing:8px;color:#00FFAA;font-weight:600;">THE</p>
              <p style="margin:4px 0 0;font-size:28px;letter-spacing:6px;color:#ffffff;font-weight:800;">SUN SESSION CLUB</p>
            </td>
          </tr>
          <tr><td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(to right,transparent,rgba(0,255,170,0.3),transparent);"></div></td></tr>
          <tr>
            <td style="text-align:center;padding:40px 32px 16px;">
              <p style="margin:0;font-size:28px;font-weight:800;color:#ffffff;">Recordatorio de pago</p>
              <p style="margin:12px 0 0;font-size:15px;color:rgba(255,255,255,0.6);line-height:1.5;">
                Hola ${order.full_name}, a\u00fan esperamos la verificaci\u00f3n de tu pago
                para <strong style="color:#ffffff;">${event.title}</strong>.
              </p>
              <p style="margin:16px 0 0;font-size:14px;color:rgba(255,255,255,0.4);">
                Tickets: ${order.qty} &bull; Total pendiente
              </p>
            </td>
          </tr>
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

  const text = `Recordatorio de pago - ${event.title}\n\nHola ${order.full_name}, aun esperamos la verificacion de tu pago para ${event.title}. Tickets: ${order.qty}.\n\n-- The Sun Session Club`;

  return { subject, html, text };
}
