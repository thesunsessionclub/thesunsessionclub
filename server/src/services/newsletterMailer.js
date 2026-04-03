/**
 * Newsletter Email Templates
 * Branded notifications for new events, merch, vinyl, and exclusive drops
 */

function sscShell(title, body) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#060d08;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#ffffff;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#060d08;">
<tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="text-align:center;padding:40px 24px 20px;">
    <p style="margin:0;font-size:14px;letter-spacing:8px;color:#00FFAA;font-weight:600;">THE</p>
    <p style="margin:4px 0 0;font-size:28px;letter-spacing:6px;color:#ffffff;font-weight:800;">SUN SESSION CLUB</p>
  </td></tr>
  <tr><td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(to right,transparent,rgba(0,255,170,0.3),transparent);"></div></td></tr>
  ${body}
  <tr><td style="text-align:center;padding:24px 32px 12px;">
    <a href="{{unsubscribe_url}}" style="font-size:11px;color:rgba(255,255,255,0.3);text-decoration:underline;">Cancelar suscripci\u00f3n</a>
  </td></tr>
  <tr><td style="text-align:center;padding:0 32px 40px;">
    <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);letter-spacing:2px;">THE SUN SESSION CLUB</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
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
 * New event notification
 */
export function buildNewEventEmail(event) {
  const date = event.date ? formatDate(event.date) : '';
  const subject = `Nuevo evento \u2013 ${event.title}`;

  const body = `
  <tr><td style="text-align:center;padding:40px 32px 16px;">
    <p style="margin:0;font-size:12px;letter-spacing:4px;color:#00FFAA;font-weight:600;">NUEVO EVENTO</p>
    <p style="margin:12px 0 0;font-size:32px;font-weight:800;color:#ffffff;line-height:1.1;">${event.title}</p>
    ${event.artists ? `<p style="margin:10px 0 0;font-size:14px;color:rgba(255,255,255,0.5);">${event.artists}</p>` : ''}
  </td></tr>
  ${event.image ? `<tr><td style="padding:16px 32px;"><img src="${event.image}" alt="${event.title}" style="width:100%;border-radius:12px;display:block;"></td></tr>` : ''}
  <tr><td style="padding:16px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1b13;border-radius:12px;border:1px solid rgba(0,255,170,0.15);">
      <tr><td style="padding:20px;text-align:center;">
        ${date ? `<p style="margin:0 0 8px;font-size:14px;color:rgba(255,255,255,0.7);">\ud83d\udcc5 ${date}</p>` : ''}
        ${event.time ? `<p style="margin:0 0 8px;font-size:14px;color:rgba(255,255,255,0.7);">\ud83d\udd54 ${event.time}</p>` : ''}
        ${event.location || event.venue ? `<p style="margin:0 0 8px;font-size:14px;color:rgba(255,255,255,0.7);">\ud83d\udccd ${event.location || event.venue}</p>` : ''}
        ${event.price ? `<p style="margin:8px 0 0;font-size:18px;font-weight:800;color:#00FFAA;">${event.isFree ? 'ENTRADA LIBRE' : formatMoney(event.price)}</p>` : ''}
      </td></tr>
    </table>
  </td></tr>
  ${event.description ? `<tr><td style="padding:8px 32px 16px;"><p style="margin:0;font-size:14px;color:rgba(255,255,255,0.6);line-height:1.6;text-align:center;">${event.description}</p></td></tr>` : ''}
  <tr><td style="text-align:center;padding:16px 32px 24px;">
    <a href="{{site_url}}/events.html" style="display:inline-block;background:#00FFAA;color:#07110c;font-weight:700;font-size:14px;padding:14px 36px;border-radius:12px;text-decoration:none;letter-spacing:1px;">VER EVENTO</a>
  </td></tr>`;

  const html = sscShell(subject, body);
  const text = `NUEVO EVENTO: ${event.title}\n${event.artists || ''}\n${date} ${event.time || ''}\n${event.location || event.venue || ''}\n${event.price ? formatMoney(event.price) : ''}\n\n-- The Sun Session Club`;

  return { subject, html, text };
}

/**
 * New merch notification
 */
export function buildNewMerchEmail(product) {
  const subject = `Nuevo drop \u2013 ${product.product_name}`;

  const body = `
  <tr><td style="text-align:center;padding:40px 32px 16px;">
    <p style="margin:0;font-size:12px;letter-spacing:4px;color:#00FFAA;font-weight:600;">NUEVO DROP</p>
    <p style="margin:12px 0 0;font-size:28px;font-weight:800;color:#ffffff;">${product.product_name}</p>
  </td></tr>
  ${product.images ? `<tr><td style="padding:16px 32px;"><img src="${(() => { try { const imgs = JSON.parse(product.images); return Array.isArray(imgs) ? imgs[0] : product.images; } catch { return product.images; } })()}" alt="${product.product_name}" style="width:100%;border-radius:12px;display:block;max-height:400px;object-fit:cover;"></td></tr>` : ''}
  <tr><td style="text-align:center;padding:16px 32px;">
    ${product.description ? `<p style="margin:0 0 12px;font-size:14px;color:rgba(255,255,255,0.6);line-height:1.6;">${product.description}</p>` : ''}
    <p style="margin:0;font-size:24px;font-weight:800;color:#00FFAA;">${formatMoney(product.price)}</p>
  </td></tr>
  <tr><td style="text-align:center;padding:16px 32px 24px;">
    <a href="{{site_url}}/merch.html" style="display:inline-block;background:#00FFAA;color:#07110c;font-weight:700;font-size:14px;padding:14px 36px;border-radius:12px;text-decoration:none;letter-spacing:1px;">VER MERCH</a>
  </td></tr>`;

  const html = sscShell(subject, body);
  const text = `NUEVO DROP: ${product.product_name}\n${product.description || ''}\n${formatMoney(product.price)}\n\n-- The Sun Session Club`;

  return { subject, html, text };
}

/**
 * New vinyl notification
 */
export function buildNewVinylEmail(vinyl) {
  const subject = `Nuevo vinilo \u2013 ${vinyl.title}`;

  const body = `
  <tr><td style="text-align:center;padding:40px 32px 16px;">
    <p style="margin:0;font-size:12px;letter-spacing:4px;color:#00FFAA;font-weight:600;">NUEVO VINILO</p>
    <p style="margin:12px 0 0;font-size:28px;font-weight:800;color:#ffffff;">${vinyl.title}</p>
    ${vinyl.artist ? `<p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.5);">${vinyl.artist}</p>` : ''}
  </td></tr>
  ${vinyl.cover_image ? `<tr><td style="padding:16px 32px;text-align:center;"><img src="${vinyl.cover_image}" alt="${vinyl.title}" style="width:280px;border-radius:12px;display:inline-block;box-shadow:0 16px 40px rgba(0,0,0,0.5);"></td></tr>` : ''}
  <tr><td style="text-align:center;padding:16px 32px;">
    ${vinyl.description ? `<p style="margin:0 0 12px;font-size:14px;color:rgba(255,255,255,0.6);line-height:1.6;">${vinyl.description}</p>` : ''}
    <p style="margin:0;font-size:24px;font-weight:800;color:#00FFAA;">${formatMoney(vinyl.price)}</p>
  </td></tr>
  <tr><td style="text-align:center;padding:16px 32px 24px;">
    <a href="{{site_url}}/vinyl.html" style="display:inline-block;background:#00FFAA;color:#07110c;font-weight:700;font-size:14px;padding:14px 36px;border-radius:12px;text-decoration:none;letter-spacing:1px;">VER VINILO</a>
  </td></tr>`;

  const html = sscShell(subject, body);
  const text = `NUEVO VINILO: ${vinyl.title}\n${vinyl.artist || ''}\n${vinyl.description || ''}\n${formatMoney(vinyl.price)}\n\n-- The Sun Session Club`;

  return { subject, html, text };
}

/**
 * Exclusive merch drop (VIP/Elite only)
 */
export function buildExclusiveDropEmail(product, tierLabel) {
  const subject = `Drop exclusivo ${tierLabel} \u2013 ${product.product_name}`;

  const body = `
  <tr><td style="text-align:center;padding:40px 32px 16px;">
    <p style="margin:0;font-size:12px;letter-spacing:4px;color:#ffc842;font-weight:600;">ACCESO EXCLUSIVO ${tierLabel.toUpperCase()}</p>
    <p style="margin:12px 0 0;font-size:28px;font-weight:800;color:#ffffff;">${product.product_name}</p>
    <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.5);">Este drop es exclusivo para miembros ${tierLabel}.</p>
  </td></tr>
  ${product.images ? `<tr><td style="padding:16px 32px;"><img src="${(() => { try { const imgs = JSON.parse(product.images); return Array.isArray(imgs) ? imgs[0] : product.images; } catch { return product.images; } })()}" alt="${product.product_name}" style="width:100%;border-radius:12px;display:block;max-height:400px;object-fit:cover;border:1px solid rgba(255,200,66,0.3);"></td></tr>` : ''}
  <tr><td style="text-align:center;padding:16px 32px;">
    ${product.description ? `<p style="margin:0 0 12px;font-size:14px;color:rgba(255,255,255,0.6);line-height:1.6;">${product.description}</p>` : ''}
    <p style="margin:0;font-size:24px;font-weight:800;color:#ffc842;">${formatMoney(product.price)}</p>
  </td></tr>
  <tr><td style="text-align:center;padding:16px 32px 24px;">
    <a href="{{site_url}}/merch.html" style="display:inline-block;background:linear-gradient(135deg,#ffc842,#e0a800);color:#000;font-weight:700;font-size:14px;padding:14px 36px;border-radius:12px;text-decoration:none;letter-spacing:1px;">ACCEDER AL DROP</a>
  </td></tr>`;

  const html = sscShell(subject, body);
  const text = `DROP EXCLUSIVO ${tierLabel.toUpperCase()}: ${product.product_name}\nEste producto es exclusivo para miembros ${tierLabel}.\n${formatMoney(product.price)}\n\n-- The Sun Session Club`;

  return { subject, html, text };
}
