import puppeteer from 'puppeteer-core';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:4321';
const b = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });

async function shot(path, file, vp, fn) {
  const p = await b.newPage();
  await p.setViewport(vp);
  await p.goto(BASE + path, { waitUntil: 'networkidle0' });
  if (fn) await fn(p);
  await p.screenshot({ path: '/tmp/shots/' + file });
  await p.close();
}

const desk = { width: 1280, height: 860, deviceScaleFactor: 1 };

// 1. Home hero
await shot('/', 'r-home.png', desk);

// 2. Toolkits — Finance series section with first buy button enabled
await shot('/toolkits', 'r-toolkits.png', { ...desk, height: 900 }, async (p) => {
  await p.click('[data-buy-gate] [data-terms-check]'); // enable first card
  await p.evaluate(() => document.getElementById('finance').scrollIntoView());
  await new Promise((r) => setTimeout(r, 250));
});

// 3. How it works — podcast section
await shot('/how-it-works', 'r-podcast.png', desk, async (p) => {
  await p.evaluate(() => document.getElementById('podcast-h').scrollIntoView({ block: 'start' }));
  await new Promise((r) => setTimeout(r, 200));
});

// 4. Blog post
await shot('/blog/ai-and-sap-consultancy-cost', 'r-blog.png', { ...desk, height: 1000 });

// 5. Contact
await shot('/contact', 'r-contact.png', { ...desk, height: 1000 });

// --- Audio playback test (.m4a / AAC in real Chrome) ---
const p = await b.newPage();
await p.goto(BASE + '/how-it-works', { waitUntil: 'networkidle0' });
const audio = await p.evaluate(async () => {
  const a = document.querySelector('audio');
  if (!a) return { ok: false, reason: 'no <audio> element' };
  try {
    a.muted = true; // allow autoplay in headless
    await a.play();
    await new Promise((r) => setTimeout(r, 900));
    return {
      ok: !a.paused && a.currentTime > 0,
      currentTime: +a.currentTime.toFixed(2),
      duration: isFinite(a.duration) ? +a.duration.toFixed(1) : 'streaming',
      readyState: a.readyState, // 4 = HAVE_ENOUGH_DATA
      canPlayAac: a.canPlayType('audio/mp4; codecs="mp4a.40.2"'),
      error: a.error ? a.error.code : null,
    };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
});
console.log('AUDIO:', JSON.stringify(audio));
await p.close();

await b.close();
console.log('shots done');
