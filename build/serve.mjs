// Minimal static preview server for local development.
// Serves the built site from the repo root, mirroring GitHub Pages behaviour
// (clean URLs: /toolkits -> toolkits.html, directory -> index.html, 404 -> 404.html).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = process.env.PORT || 4321;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

async function resolve(pathname) {
  // Strip query, decode, prevent path traversal.
  let p = normalize(decodeURIComponent(pathname.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let file = join(ROOT, p);
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, 'index.html');
  } catch {
    // Try extensionless clean URL: /toolkits -> /toolkits.html
    if (!extname(file)) {
      try {
        await stat(file + '.html');
        file = file + '.html';
      } catch {
        /* fall through to 404 */
      }
    }
  }
  return file;
}

createServer(async (req, res) => {
  let file = await resolve(req.url);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    try {
      const body = await readFile(join(ROOT, '404.html'));
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  }
}).listen(PORT, () => {
  console.log(`\n  Tavren preview → http://localhost:${PORT}\n  (Ctrl+C to stop)\n`);
});
