/**
 * Newsletter Service
 * Handles bulk email sending to subscribers with tier-based filtering
 */
import { prisma } from '../prisma.js';
import { sendOrderNotification } from './mailer.js';
import {
  buildNewEventEmail,
  buildNewMerchEmail,
  buildNewVinylEmail,
  buildExclusiveDropEmail,
} from './newsletterMailer.js';
import { config } from '../config/env.js';

function buildUnsubscribeUrl(email) {
  const token = Buffer.from(email).toString('base64');
  const origin = config.corsOrigin || 'https://sunsessionclub.com';
  const apiBase = origin.includes('localhost')
    ? `http://localhost:${config.port}`
    : origin;
  return `${apiBase}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

function buildSiteUrl() {
  const origin = config.corsOrigin || 'https://sunsessionclub.com';
  return origin.replace(/\/$/, '');
}

function replacePlaceholders(html, email) {
  return html
    .replace(/\{\{unsubscribe_url\}\}/g, buildUnsubscribeUrl(email))
    .replace(/\{\{site_url\}\}/g, buildSiteUrl());
}

/**
 * Send email to a list of subscribers
 */
async function sendBulk(subscribers, emailData) {
  const results = { sent: 0, failed: 0, skipped: 0 };

  for (const sub of subscribers) {
    try {
      const html = replacePlaceholders(emailData.html, sub.email);
      const result = await sendOrderNotification({
        to: sub.email,
        subject: emailData.subject,
        text: emailData.text,
        html,
      });
      if (result.skipped) {
        results.skipped++;
      } else {
        results.sent++;
      }
    } catch {
      results.failed++;
    }
  }

  return results;
}

/**
 * Get active subscribers filtered by minimum tier
 * Tier hierarchy: FREE < MEMBER < VIP < ELITE < DIAMOND
 */
function tierLevel(tier) {
  const t = String(tier || '').toUpperCase();
  if (t === 'DIAMOND') return 5;
  if (t === 'ELITE') return 4;
  if (t === 'VIP') return 3;
  if (t === 'MEMBER') return 2;
  return 1; // FREE
}

async function getSubscribersByMinTier(minTier) {
  const allActive = await prisma.subscriber.findMany({ where: { active: true } });
  const minLevel = tierLevel(minTier);
  return allActive.filter((s) => tierLevel(s.tier) >= minLevel);
}

/**
 * Notify all subscribers about a new event
 */
export async function notifyNewEvent(event) {
  try {
    const subscribers = await prisma.subscriber.findMany({ where: { active: true } });
    if (!subscribers.length) return { sent: 0, total: 0 };

    const emailData = buildNewEventEmail(event);
    const results = await sendBulk(subscribers, emailData);
    console.log(`[Newsletter] Event "${event.title}" → ${results.sent} sent, ${results.failed} failed`);
    return results;
  } catch (err) {
    console.error('[Newsletter] Error notifying event:', err?.message);
    return { sent: 0, error: err?.message };
  }
}

/**
 * Notify subscribers about new merch
 * If the product is exclusive (visibility = member/elite/diamond),
 * only notify subscribers of that tier or higher
 */
export async function notifyNewMerch(product) {
  try {
    const meta = parseMerchVisibility(product.description);

    // If exclusive, only notify matching tier subscribers
    if (meta.visibility !== 'public' && meta.visibility !== 'hidden') {
      const tierMap = { member: 'MEMBER', elite: 'ELITE', diamond: 'DIAMOND' };
      const tierLabel = tierMap[meta.visibility] || 'VIP';
      const subscribers = await getSubscribersByMinTier(tierLabel);
      if (!subscribers.length) return { sent: 0, total: 0, exclusive: true, tier: tierLabel };

      const emailData = buildExclusiveDropEmail(product, tierLabel);
      const results = await sendBulk(subscribers, emailData);
      console.log(`[Newsletter] Exclusive merch "${product.product_name}" (${tierLabel}) → ${results.sent} sent`);
      return { ...results, exclusive: true, tier: tierLabel };
    }

    // Public merch → notify all
    const subscribers = await prisma.subscriber.findMany({ where: { active: true } });
    if (!subscribers.length) return { sent: 0, total: 0 };

    const emailData = buildNewMerchEmail(product);
    const results = await sendBulk(subscribers, emailData);
    console.log(`[Newsletter] Merch "${product.product_name}" → ${results.sent} sent`);
    return results;
  } catch (err) {
    console.error('[Newsletter] Error notifying merch:', err?.message);
    return { sent: 0, error: err?.message };
  }
}

/**
 * Notify all subscribers about a new vinyl release
 */
export async function notifyNewVinyl(vinyl) {
  try {
    const subscribers = await prisma.subscriber.findMany({ where: { active: true } });
    if (!subscribers.length) return { sent: 0, total: 0 };

    const emailData = buildNewVinylEmail(vinyl);
    const results = await sendBulk(subscribers, emailData);
    console.log(`[Newsletter] Vinyl "${vinyl.title}" → ${results.sent} sent`);
    return results;
  } catch (err) {
    console.error('[Newsletter] Error notifying vinyl:', err?.message);
    return { sent: 0, error: err?.message };
  }
}

/**
 * Parse merch description JSON to determine visibility/exclusivity
 */
function parseMerchVisibility(description) {
  const base = { visibility: 'public', hidden_type: 'none' };
  const raw = String(description || '').trim();
  if (!raw) return base;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      return {
        visibility: String(obj.visibility || 'public').toLowerCase(),
        hidden_type: String(obj.hidden_type || 'none').toLowerCase(),
        required_level: String(obj.required_level || 'member').toLowerCase(),
      };
    }
  } catch {
    // Not JSON → plain description text → public product
  }
  return base;
}
