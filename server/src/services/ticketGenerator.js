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
const DEFAULT_TICKET_DESIGN = {
  background_mode: 'flyer',
  background_image: '',
  overlay_style: 'dark-gradient',
  primary_color: '',
  secondary_color: '',
  text_color: '#FFFFFF',
  font_preset: 'montserrat',
  font_style: 'preset',
  title_position: 'top',
  details_position: 'center',
  qr_position: 'bottom',
};

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

function safeJsonParse(raw, fallback = {}) {
  try {
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function colorWithAlpha(color, alpha = 1) {
  const value = String(color || '').trim();
  if (!value) return `rgba(255,255,255,${alpha})`;
  if (value.startsWith('#')) {
    let hex = value.slice(1);
    if (hex.length === 3) hex = hex.split('').map((ch) => ch + ch).join('');
    if (hex.length !== 6) return value;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (/^hsl\(/i.test(value)) return value.replace(/^hsl\(/i, 'hsla(').replace(/\)$/, `,${alpha})`);
  if (/^rgb\(/i.test(value)) return value.replace(/^rgb\(/i, 'rgba(').replace(/\)$/, `,${alpha})`);
  return value;
}

function normalizeHexColor(value, fallback = '') {
  const raw = String(value || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw
      .slice(1)
      .split('')
      .map((ch) => ch + ch)
      .join('')}`.toLowerCase();
  }
  return fallback;
}

function normalizeTicketDesign(event) {
  const raw = event?.ticket_design_json;
  const parsed = raw && typeof raw === 'string' ? safeJsonParse(raw, {}) : (raw && typeof raw === 'object' ? raw : {});
  const next = { ...DEFAULT_TICKET_DESIGN, ...parsed };
  next.primary_color = normalizeHexColor(next.primary_color, '');
  next.secondary_color = normalizeHexColor(next.secondary_color, '');
  next.text_color = normalizeHexColor(next.text_color, DEFAULT_TICKET_DESIGN.text_color);
  next.background_mode = String(next.background_mode || DEFAULT_TICKET_DESIGN.background_mode).trim().toLowerCase();
  next.overlay_style = String(next.overlay_style || DEFAULT_TICKET_DESIGN.overlay_style).trim().toLowerCase();
  next.font_preset = String(next.font_preset || DEFAULT_TICKET_DESIGN.font_preset).trim().toLowerCase();
  next.title_position = String(next.title_position || DEFAULT_TICKET_DESIGN.title_position).trim().toLowerCase();
  next.details_position = String(next.details_position || DEFAULT_TICKET_DESIGN.details_position).trim().toLowerCase();
  next.qr_position = String(next.qr_position || DEFAULT_TICKET_DESIGN.qr_position).trim().toLowerCase();
  next.background_image = String(next.background_image || '').trim();
  return next;
}

function resolveDesignColors(event, design) {
  const derived = deriveColors(event?.title || 'sun');
  return {
    accent: design.primary_color || derived.accent,
    accentDark: design.secondary_color || derived.accentDark,
    glow: derived.glow,
    text: design.text_color || '#FFFFFF',
    hue: derived.hue,
  };
}

function resolveFontFamily(preset = 'montserrat') {
  const key = String(preset || 'montserrat').trim().toLowerCase();
  if (key === 'display' || key === 'bebas') return 'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif';
  if (key === 'condensed' || key === 'oswald') return 'Arial Black, Arial, Helvetica, sans-serif';
  if (key === 'editorial' || key === 'elegant') return 'Georgia, Times New Roman, serif';
  if (key === 'mono') return 'Courier New, monospace';
  if (key === 'flyer-inspired') return 'Impact, Arial Black, Arial, sans-serif';
  return 'Montserrat, Arial, Helvetica, sans-serif';
}

function resolveGroupPosition(position, map, fallbackKey) {
  const key = String(position || fallbackKey).trim().toLowerCase();
  return map[key] || map[fallbackKey];
}

function parseDataUrlBuffer(raw) {
  const match = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/.exec(String(raw || '').trim());
  if (!match) return null;
  return Buffer.from(match[2], 'base64');
}

/* ── background generators ───────────────────────────── */

/**
 * Create a cinematic procedural background (no flyer available)
 * Returns a Sharp instance (1080x1920)
 */
function createProceduralBackground(colors, design = DEFAULT_TICKET_DESIGN) {
  const { hue, accent, accentDark } = colors;
  const h2 = (hue + 40) % 360;
  const h3 = (hue + 180) % 360;
  const overlay = String(design.overlay_style || 'dark-gradient').toLowerCase();
  const glowOpacity = overlay === 'neon-glow' ? '0.50' : '0.28';
  const ringOpacity = overlay === 'minimal-clean' ? '0.03' : '0.08';

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${TICKET_W}" height="${TICKET_H}" viewBox="0 0 ${TICKET_W} ${TICKET_H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="hsl(${hue},40%,6%)"/>
      <stop offset="50%" stop-color="hsl(${h2},30%,4%)"/>
      <stop offset="100%" stop-color="hsl(${hue},35%,3%)"/>
    </linearGradient>
    <radialGradient id="g1" cx="20%" cy="25%" r="50%">
      <stop offset="0%" stop-color="${colorWithAlpha(accent, 0.32)}"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="g2" cx="80%" cy="70%" r="45%">
      <stop offset="0%" stop-color="${colorWithAlpha(accentDark, 0.35)}"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <radialGradient id="g3" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="hsla(${h2},50%,20%,${glowOpacity})"/>
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
  <circle cx="180" cy="350" r="260" fill="none" stroke="hsla(${hue},60%,40%,${ringOpacity})" stroke-width="1.5"/>
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
async function createFlyerBackground(imagePath, colors, design = DEFAULT_TICKET_DESIGN) {
  const { hue, accent, accentDark } = colors;
  const h2 = (hue + 40) % 360;
  const overlay = String(design.overlay_style || 'dark-gradient').toLowerCase();

  try {
    let imgBuffer;

    // Handle both absolute paths and relative /uploads/ paths
    if (String(imagePath || '').startsWith('data:')) {
      imgBuffer = parseDataUrlBuffer(imagePath);
      if (!imgBuffer) throw new Error('invalid data url');
    } else if (imagePath.startsWith('/uploads/') || imagePath.startsWith('uploads/')) {
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
      .blur(7)
      .modulate({ brightness: 0.52, saturation: 0.82 })
      .png()
      .toBuffer();

    // Dark cinematic overlay
    const overlaySvg = overlay === 'minimal-clean'
      ? `
<svg xmlns="http://www.w3.org/2000/svg" width="${TICKET_W}" height="${TICKET_H}">
  <defs>
    <linearGradient id="dark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.12)"/>
      <stop offset="50%" stop-color="rgba(0,0,0,0.14)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.42)"/>
    </linearGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.04"/></feComponentTransfer>
      <feBlend in="SourceGraphic" mode="overlay"/>
    </filter>
  </defs>
  <rect width="${TICKET_W}" height="${TICKET_H}" fill="url(#dark)"/>
  <rect x="46" y="46" width="${TICKET_W - 92}" height="${TICKET_H - 92}" rx="42" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="2"/>
  <rect width="${TICKET_W}" height="${TICKET_H}" filter="url(#grain)" opacity="0.35"/>
</svg>`
      : overlay === 'neon-glow'
      ? `
<svg xmlns="http://www.w3.org/2000/svg" width="${TICKET_W}" height="${TICKET_H}">
  <defs>
    <linearGradient id="dark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0.28)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.56)"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="20%" r="70%">
      <stop offset="0%" stop-color="${colorWithAlpha(accent, 0.28)}"/>
      <stop offset="55%" stop-color="${colorWithAlpha(accentDark, 0.14)}"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.06"/></feComponentTransfer>
      <feBlend in="SourceGraphic" mode="overlay"/>
    </filter>
  </defs>
  <rect width="${TICKET_W}" height="${TICKET_H}" fill="url(#dark)"/>
  <rect width="${TICKET_W}" height="${TICKET_H}" fill="url(#glow)"/>
  <rect x="70" y="92" width="${TICKET_W - 140}" height="${TICKET_H - 184}" rx="36" fill="none" stroke="${colorWithAlpha(accent, 0.28)}" stroke-width="2"/>
  <rect width="${TICKET_W}" height="${TICKET_H}" filter="url(#grain)" opacity="0.4"/>
</svg>`
      : `
<svg xmlns="http://www.w3.org/2000/svg" width="${TICKET_W}" height="${TICKET_H}">
  <defs>
    <linearGradient id="dark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0.34)"/>
      <stop offset="40%" stop-color="rgba(0,0,0,0.18)"/>
      <stop offset="70%" stop-color="rgba(0,0,0,0.24)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.54)"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="30%" r="50%">
      <stop offset="0%" stop-color="hsla(${hue},60%,30%,0.15)"/>
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
      .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
      .png();
  } catch (err) {
    console.warn('[ticketGen] Could not load flyer, using procedural bg:', err.message);
    return createProceduralBackground(colors, design);
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

function buildTextOverlay({ event, order, ticketCode, ticketNumber, totalTickets, colors, design }) {
  const title = escXml(truncate(event.title, 35));
  const artists = escXml(truncate(event.artists, 50));
  const date = escXml(formatDate(event.date));
  const time = escXml(event.time || '');
  const location = escXml(truncate(event.location || event.venue, 45));
  const name = escXml(truncate(order.full_name, 35));
  const code = escXml(ticketCode);
  const { hue, accent, accentDark, text } = colors;
  const ticketLabel = totalTickets > 1 ? `TICKET ${ticketNumber} / ${totalTickets}` : 'TICKET';
  const fontFamily = escXml(resolveFontFamily(design.font_preset));
  const textColor = escXml(text || '#FFFFFF');
  const subtitleColor = overlaySubtitleColor(design.overlay_style, textColor);
  const mutedColor = overlayMutedColor(design.overlay_style, textColor);
  const titlePos = resolveGroupPosition(design.title_position, { top: 290, center: 720, bottom: 1160 }, 'top');
  const detailsPos = resolveGroupPosition(design.details_position, { top: 520, center: 1020, bottom: 1360 }, 'center');
  const qrPos = resolveGroupPosition(design.qr_position, { top: 780, center: 1080, bottom: 1325 }, 'bottom');
  const detailsY1 = detailsPos;
  const detailsY2 = detailsPos + 45;
  const detailsY3 = detailsPos + 95;
  const qrContainerY = qrPos;
  const qrLabelY = qrContainerY + QR_SIZE + 155;
  const qrCodeY = qrContainerY + QR_SIZE + 200;
  const dividerY = Math.max(detailsY3 + 65, qrContainerY - 70);
  const attendeeLabelY = Math.min(qrContainerY - 110, dividerY + 70);
  const attendeeNameY = attendeeLabelY + 46;

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
  <text x="${TICKET_W / 2}" y="140" text-anchor="middle" font-family="${fontFamily}"
        font-size="28" font-weight="600" letter-spacing="12" fill="${accent}"
        filter="url(#textShadow)">SUN SESSION CLUB</text>

  <line x1="${MARGIN}" y1="175" x2="${TICKET_W - MARGIN}" y2="175"
        stroke="hsla(${hue},60%,50%,0.25)" stroke-width="1"/>

  <!-- Event title -->
  <text x="${TICKET_W / 2}" y="${titlePos}" text-anchor="middle" font-family="${fontFamily}"
        font-size="52" font-weight="800" fill="${textColor}" letter-spacing="2"
        filter="url(#glowText)">${title}</text>

  <!-- Artists -->
  ${artists ? `<text x="${TICKET_W / 2}" y="${titlePos + 65}" text-anchor="middle" font-family="${fontFamily}"
        font-size="26" font-weight="400" fill="${subtitleColor}"
        filter="url(#textShadow)">${artists}</text>` : ''}

  <!-- Event details -->
  <text x="${TICKET_W / 2}" y="${detailsY1}" text-anchor="middle" font-family="${fontFamily}"
        font-size="24" font-weight="500" fill="${textColor}"
        filter="url(#textShadow)">${date}</text>

  ${time ? `<text x="${TICKET_W / 2}" y="${detailsY2}" text-anchor="middle" font-family="${fontFamily}"
        font-size="22" font-weight="400" fill="${subtitleColor}"
        filter="url(#textShadow)">${time}</text>` : ''}

  ${location ? `<text x="${TICKET_W / 2}" y="${detailsY3}" text-anchor="middle" font-family="${fontFamily}"
        font-size="20" font-weight="400" fill="${mutedColor}"
        filter="url(#textShadow)">${location}</text>` : ''}

  <!-- Divider -->
  <line x1="${MARGIN + 100}" y1="${dividerY}" x2="${TICKET_W - MARGIN - 100}" y2="${dividerY}"
        stroke="hsla(0,0%,100%,0.15)" stroke-width="1" stroke-dasharray="8,6"/>

  <!-- Attendee -->
  <text x="${TICKET_W / 2}" y="${attendeeLabelY}" text-anchor="middle" font-family="${fontFamily}"
        font-size="16" font-weight="600" letter-spacing="6" fill="${accent}">ATTENDEE</text>
  <text x="${TICKET_W / 2}" y="${attendeeNameY}" text-anchor="middle" font-family="${fontFamily}"
        font-size="32" font-weight="700" fill="${textColor}"
        filter="url(#textShadow)">${name}</text>

  <!-- QR container background -->
  <rect x="${(TICKET_W - QR_SIZE - 60) / 2}" y="${qrContainerY - 30}" width="${QR_SIZE + 60}" height="${QR_SIZE + 60}"
        rx="24" fill="rgba(255,255,255,0.95)"/>
  <rect x="${(TICKET_W - QR_SIZE - 60) / 2}" y="${qrContainerY - 30}" width="${QR_SIZE + 60}" height="${QR_SIZE + 60}"
        rx="24" fill="none" stroke="${colorWithAlpha(accentDark, 0.45)}" stroke-width="2"/>

  <!-- Ticket code -->
  <text x="${TICKET_W / 2}" y="${qrLabelY}" text-anchor="middle" font-family="${fontFamily}"
        font-size="16" font-weight="600" letter-spacing="6" fill="${accent}">${escXml(ticketLabel)}</text>
  <text x="${TICKET_W / 2}" y="${qrCodeY}" text-anchor="middle" font-family="'Courier New',monospace"
        font-size="28" font-weight="700" fill="${textColor}" letter-spacing="4"
        filter="url(#textShadow)">${code}</text>

  <!-- Divider -->
  <line x1="${MARGIN + 100}" y1="${qrCodeY + 60}" x2="${TICKET_W - MARGIN - 100}" y2="${qrCodeY + 60}"
        stroke="hsla(0,0%,100%,0.15)" stroke-width="1" stroke-dasharray="8,6"/>

  <!-- Bottom instruction -->
  <text x="${TICKET_W / 2}" y="${qrCodeY + 130}" text-anchor="middle" font-family="${fontFamily}"
        font-size="18" font-weight="400" fill="${mutedColor}">Presenta este ticket en la entrada</text>
  <text x="${TICKET_W / 2}" y="${qrCodeY + 165}" text-anchor="middle" font-family="${fontFamily}"
        font-size="18" font-weight="400" fill="${mutedColor}">Present this ticket at entry</text>

  <!-- Bottom branding -->
  <text x="${TICKET_W / 2}" y="1830" text-anchor="middle" font-family="${fontFamily}"
        font-size="14" font-weight="400" letter-spacing="4" fill="${mutedColor}">THE SUN SESSION CLUB</text>
  <text x="${TICKET_W / 2}" y="1860" text-anchor="middle" font-family="${fontFamily}"
        font-size="11" font-weight="300" fill="${mutedColor}">sunsessionclub.com</text>
</svg>`;
}

function overlaySubtitleColor(style, textColor) {
  if (String(style || '').toLowerCase() === 'minimal-clean') return textColor === '#111111' ? 'rgba(17,17,17,0.78)' : 'rgba(255,255,255,0.78)';
  return textColor === '#111111' ? 'rgba(17,17,17,0.72)' : 'rgba(255,255,255,0.72)';
}

function overlayMutedColor(style, textColor) {
  if (String(style || '').toLowerCase() === 'minimal-clean') return textColor === '#111111' ? 'rgba(17,17,17,0.58)' : 'rgba(255,255,255,0.58)';
  return textColor === '#111111' ? 'rgba(17,17,17,0.52)' : 'rgba(255,255,255,0.52)';
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
  const design = normalizeTicketDesign(event);
  const colors = resolveDesignColors(event, design);

  // 1. Create background (flyer-based or procedural)
  let bgSharp;
  const mode = String(design.background_mode || 'flyer').toLowerCase();
  const customBackground = String(design.background_image || '').trim();
  const backgroundImage =
    mode === 'custom' && customBackground
      ? customBackground
      : mode === 'flyer' && event.image
      ? event.image
      : mode === 'ai' && (customBackground || event.image)
      ? (customBackground || event.image)
      : '';
  if (backgroundImage) {
    bgSharp = await createFlyerBackground(backgroundImage, colors, design);
  } else {
    bgSharp = createProceduralBackground(colors, design);
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
    design,
  });

  // 4. Composite everything
  const qrX = Math.round((TICKET_W - QR_SIZE) / 2);
  const qrYMap = { top: 750, center: 1050, bottom: 1295 };
  const qrY = resolveGroupPosition(design.qr_position, qrYMap, 'bottom');

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
