import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const SERVICE_DIR = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(SERVICE_DIR, '..', '..');
const PROJECT_ROOT = path.resolve(SERVER_ROOT, '..');
const GENERATED_PUBLIC_DIR = path.join(PROJECT_ROOT, 'assets', 'generated', 'ticket-ai');
const TEMP_DIR = path.join(PROJECT_ROOT, '.tmp', 'ticket-ai');
const BUN_BIN = process.env.NANO_BANANA_BUN || path.join(PROJECT_ROOT, '.tools', 'bun-runtime', 'node_modules', 'bun', 'bin', 'bun.exe');
const NANO_BANANA_CLI =
  process.env.NANO_BANANA_CLI || path.join(PROJECT_ROOT, '.tools', 'nano-banana-2-skill-main', 'src', 'cli.ts');
const OUTPUT_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function toPosix(value) {
  return String(value || '').replace(/\\/g, '/');
}

function slugify(value, fallback = 'ticket-art') {
  const normalized = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return normalized || fallback;
}

function stripAnsi(value) {
  return String(value || '').replace(/\u001b\[[0-9;]*m/g, '');
}

function mimeToExt(mimeType) {
  const value = String(mimeType || '').toLowerCase();
  if (value.includes('jpeg') || value.includes('jpg')) return '.jpg';
  if (value.includes('webp')) return '.webp';
  return '.png';
}

function inferExtFromValue(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (value.endsWith('.jpg') || value.endsWith('.jpeg')) return '.jpg';
  if (value.endsWith('.webp')) return '.webp';
  return '.png';
}

function sanitizePromptHint(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 420);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function parseDataUrl(raw) {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(String(raw || '').trim());
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function resolveProjectFileFromUrlPath(urlPath) {
  const clean = `/${String(urlPath || '').replace(/^\/+/, '')}`;
  if (clean.startsWith('/assets/')) return path.join(PROJECT_ROOT, clean.replace(/^\/+/, ''));
  if (clean.startsWith('/uploads/')) return path.join(SERVER_ROOT, clean.replace(/^\/+/, ''));
  return null;
}

async function materializeReferenceImage(raw, outputStem) {
  const value = String(raw || '').trim();
  if (!value) return null;

  await ensureDir(TEMP_DIR);

  const dataUrl = parseDataUrl(value);
  if (dataUrl) {
    const outputPath = path.join(TEMP_DIR, `${outputStem}-ref${mimeToExt(dataUrl.mimeType)}`);
    await fs.writeFile(outputPath, dataUrl.buffer);
    return outputPath;
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const remoteUrl = new URL(value);
      const localPath = resolveProjectFileFromUrlPath(remoteUrl.pathname);
      if (localPath && (await fileExists(localPath))) return localPath;
      const response = await fetch(value);
      if (!response.ok) throw new Error(`download failed (${response.status})`);
      const arrayBuffer = await response.arrayBuffer();
      const ext = mimeToExt(response.headers.get('content-type') || inferExtFromValue(remoteUrl.pathname));
      const outputPath = path.join(TEMP_DIR, `${outputStem}-remote${ext}`);
      await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
      return outputPath;
    } catch {
      return null;
    }
  }

  if (path.isAbsolute(value) && (await fileExists(value))) return value;

  const localPath = resolveProjectFileFromUrlPath(value) || path.join(PROJECT_ROOT, value.replace(/^\/+/, ''));
  if (await fileExists(localPath)) return localPath;

  return null;
}

function buildTicketArtPrompt(payload = {}) {
  const event = payload.event || {};
  const design = payload.ticket_design || {};
  const promptHint = sanitizePromptHint(payload.prompt_hint);
  const title = String(event.title || '').trim();
  const artists = String(event.artists || '').trim();
  const venue = String(event.venue || '').trim();
  const location = String(event.location || '').trim();
  const genre = String(event.genre || '').trim();
  const description = String(event.description || '').trim();
  const type = String(event.type || '').trim();
  const primary = String(design.primary_color || '').trim();
  const secondary = String(design.secondary_color || '').trim();

  const parts = [
    'Create original premium background artwork for a vertical electronic music ticket.',
    'Format: 9:16 portrait composition for mobile ticket art.',
    'Brand world: THE SUN SESSION CLUB, underground Mexicali after dark, desert heat meeting warehouse haze.',
    'Visual tone: cinematic, atmospheric, collectible, refined underground club culture, smoke, light beams, depth, subtle crowd energy.',
    'Composition rule: leave clean negative space for later ticket typography at the top and lower third, and room for a QR block at the bottom.',
    'Do not include any readable text, artist names, dates, logos, watermarks, QR codes, ticket borders, UI chrome, or brand marks in the image.',
  ];

  if (title) parts.push(`Event mood anchor: ${title}. Use it as inspiration only, never as visible text.`);
  if (artists) parts.push(`Artist energy reference: ${artists}.`);
  if (genre) parts.push(`Genres and sonic direction: ${genre}.`);
  if (venue || location) parts.push(`Venue context: ${[venue, location].filter(Boolean).join(', ')}.`);
  if (description) parts.push(`Event concept: ${description.slice(0, 220)}.`);
  if (type) parts.push(`Ticket type context: ${type === 'free' ? 'guest-list and community access' : 'premium paid event'}.`);
  if (primary || secondary) {
    parts.push(
      `Color direction: build around ${[primary, secondary].filter(Boolean).join(' and ')} as accent lighting when it fits naturally.`
    );
  }
  if (String(payload.flyer_image || '').trim()) {
    parts.push('Use the reference flyer only for palette, lighting, atmosphere, and scene language. Reimagine it as fresh art, not a collage or copy.');
  }
  if (promptHint) parts.push(`Additional creative direction: ${promptHint}.`);

  return parts.join(' ');
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || PROJECT_ROOT,
      env: { ...process.env, ...(options.env || {}) },
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      reject(error);
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout: stripAnsi(stdout), stderr: stripAnsi(stderr) });
        return;
      }
      const error = new Error(stripAnsi(stderr || stdout || `Process exited with code ${code}`));
      error.code = code;
      reject(error);
    });
  });
}

async function findGeneratedFile(outputStem) {
  const files = await fs.readdir(GENERATED_PUBLIC_DIR);
  const matches = await Promise.all(
    files
      .filter((name) => name.startsWith(outputStem) && OUTPUT_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .map(async (name) => {
        const fullPath = path.join(GENERATED_PUBLIC_DIR, name);
        const stat = await fs.stat(fullPath);
        return { fullPath, mtimeMs: stat.mtimeMs };
      })
  );

  matches.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return matches[0]?.fullPath || '';
}

export async function generateTicketArtWithNanoBanana(payload = {}) {
  if (!existsSync(BUN_BIN) || !existsSync(NANO_BANANA_CLI)) {
    throw new Error('Nano Banana no está instalado en este proyecto.');
  }

  await ensureDir(GENERATED_PUBLIC_DIR);

  const outputStem = `${slugify(payload?.event?.title, 'ticket-art')}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const referenceImagePath = await materializeReferenceImage(payload.flyer_image, outputStem);
  const prompt = buildTicketArtPrompt(payload);

  const args = [
    'run',
    NANO_BANANA_CLI,
    prompt,
    '--output',
    outputStem,
    '--dir',
    GENERATED_PUBLIC_DIR,
    '--aspect',
    process.env.NANO_BANANA_ASPECT || '9:16',
    '--size',
    process.env.NANO_BANANA_SIZE || '1K',
    '--model',
    process.env.NANO_BANANA_MODEL || 'flash',
  ];

  if (referenceImagePath) {
    args.push('--ref', referenceImagePath);
  }

  const result = await runProcess(BUN_BIN, args, {
    cwd: PROJECT_ROOT,
    env: process.env.NANO_BANANA_API_KEY && !process.env.GEMINI_API_KEY
      ? { GEMINI_API_KEY: process.env.NANO_BANANA_API_KEY }
      : {},
  });

  const generatedFile = await findGeneratedFile(outputStem);
  if (!generatedFile) {
    throw new Error('Nano Banana terminó sin devolver un archivo de imagen.');
  }

  return {
    imageUrl: `/${toPosix(path.relative(PROJECT_ROOT, generatedFile))}`,
    prompt,
    provider: 'nano-banana',
    referenceUsed: !!referenceImagePath,
    logs: [result.stdout, result.stderr].filter(Boolean).join('\n').trim(),
  };
}
