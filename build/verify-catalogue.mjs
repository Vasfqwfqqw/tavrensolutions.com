// Catalogue integrity: cross-check every rendered buy button on /toolkits and
// /free-kit against products.json — name → checkout URL → price — exactly.
import puppeteer from 'puppeteer-core';
import { readFile } from 'node:fs/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:4321';
const data = JSON.parse(await readFile(new URL('../products.json', import.meta.url), 'utf8'));

// Build the expected set: every product → {name, url, price}
const expected = new Map(); // url -> {name, price}
for (const s of data.series) {
  for (const p of s.packs) expected.set(p.url, { name: p.name, price: data.packPrice });
  expected.set(s.bundle.url, { name: s.bundle.name, price: data.bundlePrice });
}
expected.set(data.freeKit.url, { name: data.freeKit.name, price: 0 });

const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage();

// --- Toolkits page: read each card's heading, data-buy-url, price text ---
await page.goto(BASE + '/toolkits', { waitUntil: 'networkidle0' });
const cards = await page.$$eval('[data-product]', (els) =>
  els.map((el) => {
    const heading = el.querySelector('h2, h3')?.textContent.trim() || '';
    const btn = el.querySelector('.buy-btn');
    const url = btn?.getAttribute('data-buy-url') || '';
    const hrefAttr = btn?.getAttribute('href') || '';
    // price: the big price line
    const priceEl = el.querySelector('.font-display.text-2xl');
    const price = priceEl ? priceEl.textContent.replace(/\s+/g, ' ').trim() : '';
    const label = btn?.textContent.trim() || '';
    return { heading, url, hrefAttr, price, label };
  })
);

const freeUrl = await page.evaluate(() => null); // placeholder
// Free kit card on /free-kit
await page.goto(BASE + '/free-kit', { waitUntil: 'networkidle0' });
const free = await page.$eval('a.lemonsqueezy-button', (a) => ({ url: a.getAttribute('href'), label: a.textContent.trim() }));

await browser.close();

// --- Compare ---
let problems = 0;
const seenUrls = new Set();
console.log(`\nToolkits page: ${cards.length} buy buttons (expected 24)\n`);
if (cards.length !== 24) {
  console.log(`  ✗ expected 24 buttons, found ${cards.length}`);
  problems++;
}

for (const c of cards) {
  const exp = expected.get(c.url);
  const isBundle = /bundle|All Packs/i.test(c.heading);
  const wantPrice = isBundle ? '$3,099' : '$779';
  const issues = [];
  if (!exp) {
    issues.push(`URL not in products.json: ${c.url}`);
  } else {
    if (exp.name !== c.heading) issues.push(`name mismatch: card="${c.heading}" vs json="${exp.name}"`);
    const expPrice = exp.price === 3099 ? '$3,099' : '$779';
    if (!c.price.startsWith(expPrice)) issues.push(`price mismatch: card price="${c.price}" expected ${expPrice}`);
  }
  if (c.hrefAttr !== c.url) issues.push(`href != data-buy-url (fallback would open wrong product)`);
  if (!c.label.includes(wantPrice)) issues.push(`button label "${c.label}" missing ${wantPrice}`);
  if (seenUrls.has(c.url)) issues.push(`DUPLICATE checkout URL on page`);
  seenUrls.add(c.url);

  if (issues.length) {
    problems += issues.length;
    console.log(`  ✗ ${c.heading}`);
    issues.forEach((i) => console.log(`      - ${i}`));
  } else {
    console.log(`  ✓ ${c.heading.padEnd(58)} ${wantPrice}  ${c.url.split('/').pop()}`);
  }
}

// Free kit
console.log('');
if (free.url === data.freeKit.url) console.log(`  ✓ Free kit URL matches  ${free.url.split('/').pop()}`);
else {
  console.log(`  ✗ Free kit URL mismatch: page=${free.url} json=${data.freeKit.url}`);
  problems++;
}

// Coverage: every products.json URL appears exactly once across toolkits (23) + free (1)
const paidUrls = [...expected.keys()].filter((u) => u !== data.freeKit.url);
const missing = paidUrls.filter((u) => !seenUrls.has(u));
if (missing.length) {
  console.log(`\n  ✗ ${missing.length} products.json URLs NOT rendered on the page:`);
  missing.forEach((u) => console.log('      - ' + u));
  problems += missing.length;
}

console.log(`\n${problems === 0 ? '  ✅ ALL 24 BUTTONS MATCH products.json EXACTLY' : '  ❌ ' + problems + ' problem(s) found'}`);
process.exit(problems ? 1 : 0);
