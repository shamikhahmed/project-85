import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'public');
const brandDir = path.join(outDir, 'brand');
const sourcePng = path.join(brandDir, 'icon-source.png');
const master4k = path.join(brandDir, 'icon-master-4k.png');

/**
 * Regenerates install icons from the premium 4K brand master.
 * Source of truth: public/brand/icon-source.png (and icon-master-4k.png).
 */
async function ensureMaster() {
  await mkdir(brandDir, { recursive: true });
  try {
    await access(sourcePng);
  } catch {
    throw new Error(
      'Missing public/brand/icon-source.png — place the premium icon source there first.',
    );
  }

  const meta = await sharp(sourcePng).metadata();
  if (!meta.width || meta.width < 512) {
    throw new Error('icon-source.png should be at least 512×512');
  }

  await sharp(sourcePng)
    .resize(4096, 4096, { kernel: sharp.kernel.lanczos3, fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(master4k);

  console.log(`4K master ready (${meta.width}→4096)`);
  return master4k;
}

async function exportIcon(from, name, size, { maskable = false } = {}) {
  const dest = path.join(outDir, name);
  if (!maskable) {
    await sharp(from)
      .resize(size, size, { kernel: sharp.kernel.lanczos3 })
      .png({ compressionLevel: 9 })
      .toFile(dest);
  } else {
    const scale = 0.78;
    const inner = Math.round(size * scale);
    const pad = Math.round((size - inner) / 2);
    const content = await sharp(from)
      .resize(inner, inner, { kernel: sharp.kernel.lanczos3 })
      .png()
      .toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 11, g: 13, b: 16, alpha: 1 },
      },
    })
      .composite([{ input: content, left: pad, top: pad }])
      .png({ compressionLevel: 9 })
      .toFile(dest);
  }
  console.log(`wrote ${name} (${size}x${size})`);
}

const master = await ensureMaster();
await exportIcon(master, 'pwa-192x192.png', 192);
await exportIcon(master, 'pwa-512x512.png', 512);
await exportIcon(master, 'pwa-512x512-maskable.png', 512, { maskable: true });
await exportIcon(master, 'apple-touch-icon.png', 180);
await sharp(master).resize(64, 64).png().toFile(path.join(outDir, 'favicon-64.png'));
await sharp(master).resize(32, 32).png().toFile(path.join(outDir, 'favicon-32.png'));

await writeFile(
  path.join(outDir, 'favicon.svg'),
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" fill="#0B0D10"/>
  <circle cx="32" cy="32" r="22" fill="none" stroke="#1a2210" stroke-width="5"/>
  <circle cx="32" cy="32" r="22" fill="none" stroke="#C4F36B" stroke-width="5" stroke-linecap="round"
    stroke-dasharray="110 140" transform="rotate(-120 32 32)"/>
  <text x="32" y="40" text-anchor="middle" fill="#F5F7FA" font-family="system-ui,-apple-system,Helvetica,sans-serif" font-size="22" font-weight="700" letter-spacing="-1">85</text>
</svg>`,
);

// Capacitor iOS App Icon (single 1024 universal asset)
const iosIconDir = path.join(
  root,
  'ios/App/App/Assets.xcassets/AppIcon.appiconset',
);
try {
  await access(iosIconDir);
  const iosIcon = path.join(iosIconDir, 'AppIcon-512@2x.png');
  await sharp(master)
    .resize(1024, 1024, { kernel: sharp.kernel.lanczos3, fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(iosIcon);
  console.log('wrote iOS AppIcon-512@2x.png (1024×1024)');
} catch {
  console.log('ios/ AppIcon set not present — skipped native icon');
}

console.log('PWA icons ready (from 4K master)');
