// Verifies the Terms-of-Sale gating on the Toolkits page:
//   - buy button starts disabled (no lemonsqueezy-button class, aria-disabled, no overlay)
//   - clicking while disabled does NOT navigate or open an overlay
//   - ticking the checkbox enables it (adds class, sets focusable, keeps href)
//   - the free-kit button is ungated (has lemonsqueezy-button from the start)
import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:4321';
const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage();
let pass = 0,
  fail = 0;
const check = (name, cond) => {
  console.log((cond ? '  ✓ ' : '  ✗ ') + name);
  cond ? pass++ : fail++;
};

await page.goto(BASE + '/toolkits', { waitUntil: 'networkidle0' });

// First gate on the page
const before = await page.$eval('[data-buy-gate] .buy-btn', (b) => ({
  hasLemon: b.classList.contains('lemonsqueezy-button'),
  ariaDisabled: b.getAttribute('aria-disabled'),
  tabindex: b.getAttribute('tabindex'),
  href: b.getAttribute('href'),
}));
check('buy button starts WITHOUT lemonsqueezy-button class', before.hasLemon === false);
check('buy button starts aria-disabled="true"', before.ariaDisabled === 'true');
check('buy button starts tabindex="-1"', before.tabindex === '-1');
check('buy button keeps fallback href (hosted checkout)', !!before.href && before.href.includes('lemonsqueezy.com'));

// Click while disabled — should not navigate
const urlBefore = page.url();
await page.click('[data-buy-gate] .buy-btn');
await new Promise((r) => setTimeout(r, 200));
check('clicking disabled button does not navigate', page.url() === urlBefore);

// Tick the checkbox → enable
await page.click('[data-buy-gate] [data-terms-check]');
const after = await page.$eval('[data-buy-gate] .buy-btn', (b) => ({
  hasLemon: b.classList.contains('lemonsqueezy-button'),
  ariaDisabled: b.getAttribute('aria-disabled'),
  tabindex: b.getAttribute('tabindex'),
}));
check('ticking adds lemonsqueezy-button class', after.hasLemon === true);
check('ticking sets aria-disabled="false"', after.ariaDisabled === 'false');
check('ticking makes button focusable (tabindex 0)', after.tabindex === '0');

// Untick → disable again
await page.click('[data-buy-gate] [data-terms-check]');
const reDisabled = await page.$eval('[data-buy-gate] .buy-btn', (b) => b.classList.contains('lemonsqueezy-button'));
check('unticking removes lemonsqueezy-button class again', reDisabled === false);

// Count: 24 gates total
const gates = await page.$$eval('[data-buy-gate]', (els) => els.length);
check('24 gated buy buttons present', gates === 24);

// Free kit ungated
await page.goto(BASE + '/free-kit', { waitUntil: 'networkidle0' });
const freeBtn = await page.$eval('a.lemonsqueezy-button', (b) => b.getAttribute('href'));
check('free-kit button has lemonsqueezy-button from the start', !!freeBtn);

await browser.close();
console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
