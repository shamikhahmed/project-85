import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public');

function iconSvg(size, { maskable = false } = {}) {
  const pad = maskable ? Math.round(size * 0.12) : Math.round(size * 0.14);
  const inner = size - pad * 2;
  const stroke = Math.max(3, Math.round(size * 0.035));
  const fontSize = Math.round(size * 0.22);
  const cx = size / 2;
  const top = pad + inner * 0.12;
  const baseY = pad + inner * 0.78;
  const left = pad + inner * 0.08;
  const right = pad + inner * 0.92;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="#0A0B0D"/>
  <path d="M${left} ${baseY} L${cx} ${top} L${right} ${baseY} Z" stroke="#FF6A1A" stroke-width="${stroke}" stroke-linejoin="round" fill="none"/>
  <text x="${cx}" y="${baseY + fontSize * 0.15}" text-anchor="middle" fill="#F4F5F7" font-family="Arial Black, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700">85</text>
</svg>`;
}

async function writePng(name, size, opts) {
  const svg = Buffer.from(iconSvg(size, opts));
  const png = await sharp(svg).png().toBuffer();
  await writeFile(path.join(outDir, name), png);
  console.log(`wrote ${name} (${size}x${size})`);
}

await mkdir(outDir, { recursive: true });
await writePng('pwa-192x192.png', 192);
await writePng('pwa-512x512.png', 512);
await writePng('pwa-512x512-maskable.png', 512, { maskable: true });
await writePng('apple-touch-icon.png', 180);
console.log('PWA icons ready');
