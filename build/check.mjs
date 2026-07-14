// Dev-only QA helper: drives system Chrome to measure horizontal overflow and
// capture device-emulated screenshots. Not part of the site. Run: node build/check.mjs
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:4321';
const PAGES = ['/', '/toolkits', '/how-it-works', '/about', '/faq', '/free-kit', '/contact', '/blog', '/legal/terms-of-sale', '/tcodes', '/tcodes/FBL1N', '/tcodes/BD_GEN_GRCP', '/tcodes/COMP'];
mkdirSync('/tmp/shots', { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function audit(viewport, tag) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  console.log(`\n== ${tag} (${viewport.width}x${viewport.height}) ==`);
  for (const path of PAGES) {
    let res;
    try {
      res = await page.goto(BASE + path, { waitUntil: 'networkidle0', timeout: 15000 });
    } catch (e) {
      console.log(`  ${path}  ERROR ${e.message}`);
      continue;
    }
    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
      offenders: Array.from(document.querySelectorAll('*'))
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
        .slice(0, 5)
        .map((el) => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ').slice(0, 2).join('.') : '')),
    }));
    const overflow = m.sw > m.iw + 1 ? `  ⚠ OVERFLOW sw=${m.sw} iw=${m.iw} [${m.offenders.join(', ')}]` : '  ok';
    console.log(`  ${res.status()}  ${path}${overflow}`);
  }
  await page.close();
}

await audit({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'mobile');
await audit({ width: 1280, height: 900, deviceScaleFactor: 1 }, 'desktop');

// Fresh screenshots
const shot = async (path, file, vp) => {
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.goto(BASE + path, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `/tmp/shots/${file}`, fullPage: false });
  await page.close();
};
await shot('/', 'home-mobile.png', { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
await shot('/toolkits', 'toolkits-mobile.png', { width: 390, height: 1400, isMobile: true, deviceScaleFactor: 2 });

await browser.close();
console.log('\n  done');
