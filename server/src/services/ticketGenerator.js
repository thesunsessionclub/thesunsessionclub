/**
 * Premium Ticket Image Generator
 * Generates cinematic 1080x1920 PNG tickets using Sharp
 * Uses event flyer as background with dark cinematic overlay
 */
import sharp from 'sharp';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';

const TICKET_W = 1080;
const TICKET_H = 1920;
const QR_SIZE = 380;
const MARGIN = 80;

/* ── helpers ──────────────────────────────────────────── */

function escXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(str, max = 40) {
  const s = String(str || '').trim();
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Generate deterministic "theme" colors from event title */
function deriveColors(title) {
  let hash = 0;
  for (const ch of String(title || 'sun')) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  const hue = Math.abs(hash) % 360;
  return {
    accent: `hsl(${hue}, 80%, 60%)`,
    accentDark: `hsl(${hue}, 60%, 25%)`,
    glow: `hsla(${hue}, 90%, 55%, 0.35)`,
    hue,
  };
}

/* ── background generators ───────────────────────────── */

/**
 * Create a cinematic procedural background (no flyer available)
 * Returns a Sharp instance (1080x1920)
 */
function createProceduralBackground(colors) {
  const { hue } = colors;
  const h2 = (hue + 40) % 360;
  const h3 = (hue + 180) % 360;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${TICKET_W}" height="${TICKET_H}" viewBox="0 0 ${TICKET_W} ${TICKET_H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="hsl(${hue},40%,6%)"/>
      <stop offset="50%" stop-color="hsl(${h2},30%,4%)"/>
      <stop offset="100%" stop-color="hsl(${hue},35%,3%)"/>
    </linearGradient>
    <radialGradient id="g1" cx="20%" cy="25%" r="50%">
      <stop offset="0%" stop-color="hsla(${hue},70%,30%,0.4)"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="g2" cx="80%" cy="70%" r="45%">
      <stop offset="0%" stop-color="hsla(${h3},60%,25%,0.3)"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="g3" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="hsla(${h2},50%,20%,0.2)"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.08"/>
      </feComponentTransfer>
      <feBlend in="SourceGraphic" mode="overlay"/>
    </filter>
  </defs>
  <rect width="${TICKET_W}" height="${TICKET_H}" fill="url(#bg)"/>
  <rect width="${TICKET_W}" height="${TICKET_H}" fill="url(#g1)"/>
  <rect width="${TICKET_W}" height="${TICKET_H}" fill="url(#g2)"/>
  <rect width="${TICKET_W}" height="${TICKET_H}" fill="url(#g3)"/>
  <circle cx="180" cy="350" r="260" fill="none" stroke="hsla(${hue},60%,40%,0.08)" stroke-width="1.5"/>
  <circle cx="900" cy="1500" r="340" fill="none" stroke="hsla(${h3},50%,35%,0.06)" stroke-width="1"/>
  <line x1="0" y1="680" x2="${TICKET_W}" y2="680" stroke="hsla(${hue},50%,40%,0.06)" stroke-width="0.5"/>
  <line x1="0" y1="1300" x2="${TICKET_W}" y2="1300" stroke="hsla(${hue},50%,40%,0.06)" stroke-width="0.5"/>
  <rect width="${TICKET_W}" height="${TICKET_H}" filter="url(#grain)" opacity="0.5"/>
</svg>`;

  return sharp(Buffer.from(svg)).png();
}

/**
 * Load event flyer and transform into cinematic ticket background
 * - Resize/crop to 1080x1920
 * - Apply blur + dark overlay + color grade
 */
async function createFlyerBackground(imagePath, colors) {
  const { hue } = colors;
  const h2 = (hue + 40) % 360;

  try {
    let imgBuffer;

    // Handle both absolute paths and relative /uploads/ paths
    if (imagePath.startsWith('/uploads/') || imagePath.startsWith('uploads/')) {
      const absPath = path.resolve(process.cwd(), imagePath.replace(/^\//, ''));
      imgBuffer = await fs.readFile(absPath);
    } else if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      const resp = await fetch(imagePath);
      if (!resp.ok) throw new Error('fetch failed');
      imgBuffer = Buffer.from(await resp.arrayBuffer());
    } else {
      imgBuffer = await fs.readFile(imagePath);
    }

    // Resize flyer to fill ticket dimensions, blur for cinematic look
    const blurred = await sharp(imgBuffer)
      .resize(TICKET_W, TICKET_H, { fit: 'cover', position: 'centre' })
      .blur(12)
      .modulate({ brightness: 0.35, saturation: 0.6 })
      .png()
      .toBuffer();

    // Dark cinematic overlay
    const overlay = `
<svg xmlns="http://www.w3.org/2000/svg" width="${TICKET_W}" height="${TICKET_H}">
  <defs>
    <linearGradient id="dark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0.65)"/>
      <stop offset="40%" stop-color="rgba(0,0,0,0.40)"/>
      <stop offset="70%" stop-color="rgba(0,0,0,0.50)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.80)"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="30%" r="50%">
      <stop offset="0%" stop-color="hsla(${hue},60%,30%,0.2)"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.06"/>
      </feComponentTransfer>
      <feBlend in="SourceGraphic" mode="overlay"/>
    </filter>
  </defs>
  <rect width="${TICKET_W}" height="${TICKET_H}" fill="url(#dark)"/>
  <rect width="${TICKET_W}" height="${TICKET_H}" fill="url(#glow)"/>
  <rect width="${TICKET_W}" height="${TICKET_H}" filter="url(#grain)" opacity="0.4"/>
</svg>`;

    return sharp(blurred)
      .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
      .png();
  } catch (err) {
    console.warn('[ticketGen] Could not load flyer, using procedural bg:', err.message);
    return createProceduralBackground(colors);
  }
}

/* ── QR code generation ──────────────────────────────── */

async function generateQRBuffer(data, size = QR_SIZE) {
  const qrPng = await QRCode.toBuffer(data, {
    type: 'png',
    width: size,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'H', // highest error correction for reliable scanning
  });
  return qrPng;
}

/* ── text overlay SVG ────────────────────────────────── */

function buildTextOverlay({ event, order, ticketCode, ticketNumber, totalTickets, colors }) {
  const title = escXml(truncate(event.title, 35));
  const artists = escXml(truncate(event.artists, 50));
  const date = escXml(formatDate(event.date));
  const time = escXml(event.time || '');
  const location = escXml(truncate(event.location || event.venue, 45));
  const name = escXml(truncate(order.full_name, 35));
  const code = escXml(ticketCode);
  const { hue } = colors;
  const ticketLabel = totalTickets > 1 ? `TICKET ${ticketNumber} / ${totalTickets}` : 'TICKET';

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${TICKET_W}" height="${TICKET_H}" viewBox="0 0 ${TICKET_W} ${TICKET_H}">
  <defs>
    <filter id="textShadow">
      <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="rgba(0,0,0,0.7)"/>
    </filter>
    <filter id="glowText">
      <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="hsla(${hue},80%,55%,0.4)"/>
    </filter>
  </defs>

  <!-- Brand header -->
  <text x="${TICKET_W / 2}" y="140" text-anchor="middle" font-family="Montserrat,Arial,Helvetica,sans-serif"
        font-size="28" font-weight="600" letter-spacing="12" fill="hsla(${hue},70%,65%,0.9)"
        filter="url(#textShadow)">SUN SESSION CLUB</text>

  <line x1="${MARGIN}" y1="175" x2="${TICKET_W - MARGIN}" y2="175"
        stroke="hsla(${hue},60%,50%,0.25)" stroke-width="1"/>

  <!-- Event title -->
  <text x="${TICKET_W / 2}" y="290" text-anchor="middle" font-family="Montserrat,Arial,Helvetica,sans-serif"
        font-size="52" font-weight="800" fill="#ffffff" letter-spacing="2"
        filter="url(#glowText)">${title}</text>

  <!-- Artists -->
  ${artists ? `<text x="${TICKET_W / 2}" y="355" text-anchor="middle" font-family="Montserrat,Arial,Helvetica,sans-serif"
        font-size="26" font-weight="400" fill="hsla(0,0%,100%,0.7)"
        filter="url(#textShadow)">${artists}</text>` : ''}

  <!-- Event details -->
  <text x="${TICKET_W / 2}" y="460" text-anchor="middle" font-family="Montserrat,Arial,Helvetica,sans-serif"
        font-size="24" font-weight="500" fill="hsla(0,0%,100%,0.85)"
        filter="url(#textShadow)">${date}</text>

  ${time ? `<text x="${TICKET_W / 2}" y="505" text-anchor="middle" font-family="Montserrat,Arial,Helvetica,sans-serif"
        font-size="22" font-weight="400" fill="hsla(0,0%,100%,0.7)"
        filter="url(#textShadow)">${time}</text>` : ''}

  ${location ? `<text x="${TICKET_W / 2}" y="555" text-anchor="middle" font-family="Montserrat,Arial,Helvetica,sans-serif"
        font-size="20" font-weight="400" fill="hsla(0,0%,100%,0.6)"
        filter="url(#textShadow)">${location}</text>` : ''}

  <!-- Divider -->
  <line x1="${MARGIN + 100}" y1="620" x2="${TICKET_W - MARGIN - 100}" y2="620"
        stroke="hsla(0,0%,100%,0.15)" stroke-width="1" stroke-dasharray="8,6"/>

  <!-- Attendee -->
  <text x="${TICKET_W / 2}" y="690" text-anchor="middle" font-family="Montserrat,Arial,Helvetica,sans-serif"
        font-size="16" font-weight="600" letter-spacing="6" fill="hsla(${hue},60%,65%,0.8)">ATTENDEE</text>
  <text x="${TICKET_W / 2}" y="740" text-anchor="middle" font-family="Montserrat,Arial,Helvetica,sans-serif"
        font-size="32" font-weight="700" fill="#ffffff"
        filter="url(#textShadow)">${name}</text>

  <!-- QR container background -->
  <rect x="${(TICKET_W - QR_SIZE - 60) / 2}" y="820" width="${QR_SIZE + 60}" height="${QR_SIZE + 60}"
        rx="24" fill="rgba(255,255,255,0.95)"/>
  <rect x="${(TICKET_W - QR_SIZE - 60) / 2}" y="820" width="${QR_SIZE + 60}" height="${QR_SIZE + 60}"
        rx="24" fill="none" stroke="hsla(${hue},50%,50%,0.3)" stroke-width="2"/>

  <!-- Ticket code -->
  <text x="${TICKET_W / 2}" y="1365" text-anchor="middle" font-family="Montserrat,Arial,Helvetica,sans-serif"
        font-size="16" font-weight="600" letter-spacing="6" fill="hsla(${hue},60%,65%,0.8)">${escXml(ticketLabel)}</text>
  <text x="${TICKET_W / 2}" y="1410" text-anchor="middle" font-family="'Courier New',monospace"
        font-size="28" font-weight="700" fill="hsla(0,0%,100%,0.9)" letter-spacing="4"
        filter="url(#textShadow)">${code}</text>

  <!-- Divider -->
  <line x1="${MARGIN + 100}" y1="1470" x2="${TICKET_W - MARGIN - 100}" y2="1470"
        stroke="hsla(0,0%,100%,0.15)" stroke-width="1" stroke-dasharray="8,6"/>

  <!-- Bottom instruction -->
  <text x="${TICKET_W / 2}" y="1540" text-anchor="middle" font-family="Montserrat,Arial,Helvetica,sans-serif"
        font-size="18" font-weight="400" fill="hsla(0,0%,100%,0.5)">Presenta este ticket en la entrada</text>
  <text x="${TICKET_W / 2}" y="1575" text-anchor="middle" font-family="Montserrat,Arial,Helvetica,sans-serif"
        font-size="18" font-weight="400" fill="hsla(0,0%,100%,0.5)">Present this ticket at entry</text>

  <!-- Bottom branding -->
  <text x="${TICKET_W / 2}" y="1830" text-anchor="middle" font-family="Montserrat,Arial,Helvetica,sans-serif"
        font-size="14" font-weight="400" letter-spacing="4" fill="hsla(0,0%,100%,0.25)">THE SUN SESSION CLUB</text>
  <text x="${TICKET_W / 2}" y="1860" text-anchor="middle" font-family="Montserrat,Arial,Helvetica,sans-serif"
        font-size="11" font-weight="300" fill="hsla(0,0%,100%,0.2)">sunsessionclub.com</text>
</svg>`;
}

/* ── main generator ──────────────────────────────────── */

/**
 * Generate a premium 1080x1920 PNG ticket image
 * @param {Object} params
 * @param {Object} params.event     - Event record from DB
 * @param {Object} params.order     - TicketOrder record
 * @param {string} params.ticketCode - Unique hex ticket code
 * @param {string} params.validationUrl - URL that QR code links to
 * @param {number} params.ticketNumber - Ticket number (for multi-ticket orders)
 * @param {number} params.totalTickets - Total tickets in order
 * @returns {Promise<Buffer>} PNG image buffer
 */
export async function generateTicketImage({
  event,
  order,
  ticketCode,
  validationUrl,
  ticketNumber = 1,
  totalTickets = 1,
}) {
  const colors = deriveColors(event.title);

  // 1. Create background (flyer-based or procedural)
  let bgSharp;
  if (event.image) {
    bgSharp = await createFlyerBackground(event.image, colors);
  } else {
    bgSharp = createProceduralBackground(colors);
  }
  const bgBuffer = await bgSharp.resize(TICKET_W, TICKET_H).toBuffer();

  // 2. Generate QR code
  const qrBuffer = await generateQRBuffer(validationUrl, QR_SIZE);

  // 3. Generate text overlay
  const textSvg = buildTextOverlay({
    event,
    order,
    ticketCode,
    ticketNumber,
    totalTickets,
    colors,
  });

  // 4. Composite everything
  const qrX = Math.round((TICKET_W - QR_SIZE) / 2);
  const qrY = 850; // centered in QR container

  const finalImage = await sharp(bgBuffer)
    .composite([
      // Text overlay
      { input: Buffer.from(textSvg), top: 0, left: 0 },
      // QR code (centered in the white container)
      { input: qrBuffer, top: qrY, left: qrX },
    ])
    .png({ quality: 95, compressionLevel: 6 })
    .toBuffer();

  return finalImage;
}

/**
 * Generate ticket and save to disk
 * Returns the public URL path to the ticket image
 */
export async function generateAndSaveTicket({
  event,
  order,
  ticket,
  ticketNumber = 1,
  totalTickets = 1,
  baseUrl = '',
}) {
  const validationUrl = `${baseUrl}/validate-ticket/${ticket.ticket_code}`;

  const pngBuffer = await generateTicketImage({
    event,
    order,
    ticketCode: ticket.ticket_code,
    validationUrl,
    ticketNumber,
    totalTickets,
  });

  const ticketsDir = path.resolve(process.cwd(), 'uploads', 'tickets');
  await fs.mkdir(ticketsDir, { recursive: true });

  const filename = `ticket_${ticket.ticket_code}.png`;
  const filePath = path.join(ticketsDir, filename);
  await fs.writeFile(filePath, pngBuffer);

  const qrPayload = JSON.stringify({
    ticketId: ticket.id,
    eventId: event.id,
    orderId: order.id,
    code: ticket.ticket_code,
    name: order.full_name,
    email: order.email,
    url: validationUrl,
  });

  return {
    ticketImage: `/uploads/tickets/${filename}`,
    qrPayload,
    pngBuffer,
  };
}
