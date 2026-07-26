// IndexNow submitter — pings Bing/Yandex/others to (re)crawl the site's URLs.
// Copilot is grounded in Bing's index, so this shortens the time from deploy to
// Copilot seeing new/changed pages.
//
// RUN THIS AFTER DEPLOY, not before: the key file must already be live at
// https://tavrensolutions.com/<key>.txt (it is committed at the repo root and
// served by GitHub Pages). Usage, from the repo root:
//     node build/indexnow.mjs
//
// It reads the generated sitemap.xml and submits every URL in one batch.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const HOST = 'tavrensolutions.com';
const KEY = '257e5d25ae3ac962e1c913345d1d53ce';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const sitemap = await readFile(join(ROOT, 'sitemap.xml'), 'utf8');
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

if (urlList.length === 0) {
  console.error('No URLs found in sitemap.xml — run `npm run build` first.');
  process.exit(1);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
});

// IndexNow returns 200 or 202 on success.
console.log(`IndexNow: submitted ${urlList.length} URLs → HTTP ${res.status} ${res.statusText}`);
if (res.status === 403) {
  // 403 = IndexNow could not validate the key. If the key file resolves in your
  // browser, this is almost always CDN propagation: IndexNow's crawler hit a
  // GitHub Pages edge that doesn't have the file yet. It clears on its own —
  // wait ~30-60 min and rerun. Only a genuine key mismatch/absence is fatal.
  console.error(
    `403 — IndexNow could not validate the key.\n` +
    `  First check the key file resolves:  curl -sS ${KEY_LOCATION}\n` +
    `  • If it returns the key: this is CDN propagation on IndexNow's side — wait ~30-60 min and rerun this script.\n` +
    `  • If it 404s or returns something else: the file isn't deployed or the key doesn't match — redeploy, then retry.`
  );
}
