// Image pipeline: generate the favicon set + social (OG) image from the brand logos.
// Run:  npm run images
//
//  favicon.svg            scalable navy mark (modern browsers)
//  favicon.ico            16/32/48 navy mark on white (legacy tabs)
//  favicon-16/32.png      navy mark on white
//  apple-touch-icon.png   180, white mark on sapphire navy, padded
//  icon-192/512.png       PWA icons, white mark on navy, padded
//  site.webmanifest       references the PWA icons
//  og.png                 1200x630 stacked white lockup on sapphire navy
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const NAVY = '#0F3D73';
const OUT = `${ROOT}assets/favicons`;
mkdirSync(OUT, { recursive: true });

const MARK_NAVY = `${ROOT}assets/Tavern Logos No Text/tavren-logo-navy-transparent.svg`;
const MARK_WHITE = `${ROOT}assets/Tavern Logos No Text/tavren-logo-white-transparent.svg`;
const LOCKUP_STACKED_WHITE = `${ROOT}assets/Tavern Logos with Text/tavren-lockup-stacked-white.svg`;

const DENSITY = 512; // render SVGs at high density for crisp downscaling

// Resize an SVG mark to a transparent square of `inner` px.
async function markBuffer(svg, inner) {
  return sharp(svg, { density: DENSITY })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

// Mark centred on a solid square canvas of `size` px.
async function iconOnBg(svg, size, bg, pad = 0.32) {
  const inner = Math.round(size * (1 - pad));
  const mark = await markBuffer(svg, inner);
  return sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function run() {
  // 1. favicon.svg — straight copy of the scalable navy mark
  copyFileSync(MARK_NAVY, `${OUT}/favicon.svg`);

  // 2. favicon PNGs — navy mark on white (visible on light tab strips), small padding
  const fav = {};
  for (const s of [16, 32, 48]) {
    fav[s] = await iconOnBg(MARK_NAVY, s, '#FFFFFF', 0.14);
  }
  await sharp(fav[16]).toFile(`${OUT}/favicon-16.png`);
  await sharp(fav[32]).toFile(`${OUT}/favicon-32.png`);

  // 3. favicon.ico (16/32/48) — written to assets and repo root for default /favicon.ico requests
  const ico = await pngToIco([fav[16], fav[32], fav[48]]);
  writeFileSync(`${OUT}/favicon.ico`, ico);
  writeFileSync(`${ROOT}favicon.ico`, ico);

  // 4. apple-touch + PWA icons — white mark on sapphire navy, generous padding (maskable-safe)
  writeFileSync(`${OUT}/apple-touch-icon.png`, await iconOnBg(MARK_WHITE, 180, NAVY, 0.2));
  writeFileSync(`${OUT}/icon-192.png`, await iconOnBg(MARK_WHITE, 192, NAVY, 0.28));
  writeFileSync(`${OUT}/icon-512.png`, await iconOnBg(MARK_WHITE, 512, NAVY, 0.28));

  // 5. web manifest
  const manifest = {
    name: 'Tavren Solutions',
    short_name: 'Tavren',
    description: 'AI toolkits for SAP S/4HANA upgrade readiness.',
    start_url: '/',
    display: 'standalone',
    background_color: NAVY,
    theme_color: NAVY,
    icons: [
      { src: '/assets/favicons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/assets/favicons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };
  writeFileSync(`${OUT}/site.webmanifest`, JSON.stringify(manifest, null, 2));

  // 6. OG image — 1200x630, stacked white lockup on sapphire navy
  const W = 1200,
    H = 630;
  const lockupW = 560;
  const lockupBuf = await sharp(LOCKUP_STACKED_WHITE, { density: DENSITY })
    .resize(lockupW, null, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({ create: { width: W, height: H, channels: 4, background: NAVY } })
    .composite([{ input: lockupBuf, gravity: 'center' }])
    .png()
    .toFile(`${ROOT}assets/og.png`);

  console.log('  ✓ favicon set + og.png generated');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
