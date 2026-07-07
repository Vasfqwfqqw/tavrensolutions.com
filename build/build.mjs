// Tavren static site build.
//   - Wraps each src/pages + src/legal file in the shared layout (head/header/footer).
//   - Renders blog markdown (src/blog/posts/*.md) to HTML with Article JSON-LD.
//   - Server-renders the catalogue from products.json (crawlable, no-JS friendly).
//   - Emits sitemap.xml.
// Output is written to the repo root (what GitHub Pages serves). Run: npm run build:site
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';
import {
  renderSeriesNav,
  renderToolkitSections,
  renderSeriesOverview,
  renderFreeKitCard,
  renderProductJsonLd,
} from './render-products.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const BASE = 'https://tavrensolutions.com';
const YEAR = new Date().getFullYear();

const r = (p) => join(ROOT, p);
const s = (p) => join(SRC, p);

// --- tiny template engine -------------------------------------------------
const PARTIALS = {};
async function loadPartials() {
  for (const name of ['layout', 'header', 'footer', 'trust-strip']) {
    PARTIALS[name] = await readFile(s(`partials/${name}.html`), 'utf8');
  }
}
const escHtml = (v) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Replace {{> name }} partial includes.
function includePartials(tpl) {
  return tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => PARTIALS[name] ?? '');
}
// Replace {{{ raw }}} then {{ escaped }} tokens.
function fill(tpl, vars) {
  return tpl
    .replace(/\{\{\{\s*([\w-]+)\s*\}\}\}/g, (_, k) => (k in vars ? String(vars[k] ?? '') : ''))
    .replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_, k) => (k in vars ? escHtml(vars[k]) : ''));
}

// --- catalogue tokens (shared across pages) -------------------------------
let CATALOGUE;
function catalogueTokens() {
  return {
    seriesNav: renderSeriesNav(CATALOGUE),
    toolkitSections: renderToolkitSections(CATALOGUE),
    seriesOverview: renderSeriesOverview(CATALOGUE),
    freeKitCard: renderFreeKitCard(CATALOGUE),
  };
}

// --- JSON-LD helpers ------------------------------------------------------
function breadcrumbLd(crumbs) {
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: BASE + c.path,
    })),
  })}</script>`;
}
function collectionPageLd(d, url) {
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: d.title,
    description: d.description,
    url,
  })}</script>`;
}
function articleLd(d, url) {
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: d.title,
    description: d.description,
    datePublished: d.date,
    dateModified: d.updated || d.date,
    author: { '@type': 'Organization', name: 'Tavren' },
    publisher: { '@type': 'Organization', name: 'Tavren', logo: { '@type': 'ImageObject', url: `${BASE}/assets/favicons/icon-512.png` } },
    mainEntityOfPage: url,
    image: `${BASE}/assets/og.png`,
  })}</script>`;
}

// --- FAQ (src/data/faq.json drives both the visible page and FAQPage JSON-LD) ---
const stripTags = (html) => String(html).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function renderFaqList(faqs) {
  return faqs
    .map(
      (f) => `
      <details class="card group reveal">
        <summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-navy [&::-webkit-details-marker]:hidden">
          <span>${escHtml(f.q)}</span>
          <svg class="h-5 w-5 shrink-0 text-azure transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </summary>
        <div class="mt-4 leading-relaxed text-navy/80">${f.a}</div>
      </details>`
    )
    .join('\n');
}

function faqPageLd(faqs) {
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: stripTags(f.a) },
    })),
  })}</script>`;
}

// --- page renderer --------------------------------------------------------
function renderDocument({ content, data, canonicalPath, extraHead = '', ogType = 'website', bodyClass = '' }) {
  const tokens = catalogueTokens();
  // page body: include partials + fill catalogue/meta tokens
  let body = includePartials(content);
  body = fill(body, { ...tokens, year: YEAR });

  const canonical = BASE + canonicalPath;
  const layoutVars = {
    title: data.title,
    description: data.description,
    canonical,
    ogType: data.ogType || ogType,
    ogImage: data.ogImage ? BASE + data.ogImage : `${BASE}/assets/og.png`,
    extraHead,
    extraScripts: data.extraScripts || '',
    bodyClass: data.bodyClass || bodyClass,
    year: YEAR,
    body,
  };
  let doc = includePartials(PARTIALS.layout); // injects header + footer
  doc = fill(doc, layoutVars);
  return doc;
}

async function writeOut(relPath, html) {
  const out = r(relPath);
  await mkdir(join(out, '..'), { recursive: true });
  await writeFile(out, html, 'utf8');
  return relPath;
}

// --- builders -------------------------------------------------------------
const urls = []; // for sitemap
let BLOG_POSTS = []; // populated by buildBlog, consumed by buildLlms

async function buildPages() {
  const dir = s('pages');
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.html')) continue;
    const name = basename(file, '.html'); // index, toolkits, ...
    const raw = await readFile(join(dir, file), 'utf8');
    const { data, content } = matter(raw);
    const canonicalPath = data.canonical || (name === 'index' ? '/' : `/${name}`);

    // Per-page JSON-LD
    let extraHead = '';
    if (name !== '404') {
      const crumbs = [{ name: 'Home', path: '/' }];
      if (name !== 'index') crumbs.push({ name: data.title.split('—')[0].split('|')[0].trim(), path: canonicalPath });
      extraHead += breadcrumbLd(crumbs);
    }
    if (name === 'toolkits') extraHead += renderProductJsonLd(CATALOGUE);
    if (name === 'readiness') extraHead += collectionPageLd(data, BASE + canonicalPath);

    let pageContent = content;
    if (name === 'faq') {
      const faqs = JSON.parse(await readFile(s('data/faq.json'), 'utf8'));
      pageContent = content.replace('{{{faqList}}}', renderFaqList(faqs));
      extraHead += faqPageLd(faqs);
    }

    const html = renderDocument({ content: pageContent, data, canonicalPath, extraHead });
    const outPath = name === 'index' ? 'index.html' : `${name}.html`;
    await writeOut(outPath, html);
    if (name !== '404') urls.push({ loc: canonicalPath, priority: name === 'index' ? '1.0' : '0.8' });
  }
}

async function buildLegal() {
  const dir = s('legal');
  if (!existsSync(dir)) return;
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.html')) continue;
    const name = basename(file, '.html');
    const raw = await readFile(join(dir, file), 'utf8');
    const { data, content } = matter(raw);
    const canonicalPath = `/legal/${name}`;
    const extraHead = breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: data.title.split('—')[0].split('|')[0].trim(), path: canonicalPath },
    ]);
    const html = renderDocument({ content, data, canonicalPath });
    await writeOut(`legal/${name}.html`, html);
    urls.push({ loc: canonicalPath, priority: '0.3' });
  }
}

async function buildBlog() {
  const postsDir = s('blog/posts');
  const posts = [];
  if (existsSync(postsDir)) {
    for (const file of await readdir(postsDir)) {
      if (!file.endsWith('.md')) continue;
      const slug = basename(file, '.md');
      const raw = await readFile(join(postsDir, file), 'utf8');
      const { data, content } = matter(raw);
      const canonicalPath = `/blog/${slug}`;
      const bodyHtml = marked.parse(content);
      const sources = (data.sources || [])
        .map((src) => `<li><a href="${src.url}" rel="noopener" target="_blank">${escHtml(src.title)}</a></li>`)
        .join('\n');
      const article = `
        <article class="container-tavren py-14 sm:py-20">
          <nav class="mb-6 text-sm text-slate" aria-label="Breadcrumb"><a href="/blog" class="hover:text-azure">Blog</a> <span aria-hidden="true">/</span> <span>${escHtml(data.category || 'Article')}</span></nav>
          <header class="max-w-prose">
            <p class="eyebrow">${escHtml(data.category || 'Insight')}</p>
            <h1 class="mt-3 text-3xl font-bold leading-tight sm:text-4xl">${escHtml(data.title)}</h1>
            <p class="mt-4 text-lg text-navy/80">${escHtml(data.description)}</p>
            <p class="mt-4 text-sm text-slate"><time datetime="${data.date}">${formatDate(data.date)}</time> · ${escHtml(data.readingTime || '')}</p>
          </header>
          <div class="prose-tavren mt-10">
            ${bodyHtml}
          </div>
          ${sources ? `<section class="mt-12 max-w-prose border-t border-navy/10 pt-6"><h2 class="text-lg font-bold">Sources &amp; further reading</h2><ul class="mt-3 space-y-2 text-sm text-azure">${sources}</ul></section>` : ''}
          <div class="mt-12 max-w-prose rounded-2xl bg-navy p-8 text-white">
            <h2 class="text-xl font-bold text-white">Start with the free toolkit</h2>
            <p class="mt-2 text-white/85">See the format for yourself before you buy — the S/4HANA Readiness Starter Kit is free.</p>
            <a class="btn btn-onnavy mt-5" href="/free-kit">Get the free starter toolkit</a>
          </div>
        </article>`;
      const html = renderDocument({
        content: article,
        data,
        canonicalPath,
        ogType: 'article',
        extraHead: articleLd(data, BASE + canonicalPath),
      });
      await writeOut(`blog/${slug}.html`, html);
      urls.push({ loc: canonicalPath, priority: '0.6' });
      posts.push({ ...data, slug, canonicalPath });
    }
  }

  // Blog index from template
  posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  BLOG_POSTS = posts;
  const list = posts
    .map(
      (p) => `
      <article class="card card-hover flex flex-col reveal">
        <p class="eyebrow">${escHtml(p.category || 'Insight')}</p>
        <h2 class="mt-2 text-xl font-bold leading-snug"><a href="${p.canonicalPath}" class="hover:text-azure">${escHtml(p.title)}</a></h2>
        <p class="mt-2 flex-grow text-sm leading-relaxed text-navy/80">${escHtml(p.description)}</p>
        <p class="mt-4 text-xs text-slate"><time datetime="${p.date}">${formatDate(p.date)}</time> · ${escHtml(p.readingTime || '')}</p>
        <a href="${p.canonicalPath}" class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-azure">Read article
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
      </article>`
    )
    .join('\n');
  const idxRaw = await readFile(s('blog/index.html'), 'utf8');
  const { data: idxData, content: idxContent } = matter(idxRaw);
  const html = renderDocument({
    content: fill(idxContent, { postList: list }),
    data: idxData,
    canonicalPath: '/blog',
  });
  await writeOut('blog/index.html', html);
  urls.push({ loc: '/blog', priority: '0.7' });
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function buildSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const body = urls
    .map((u) => `  <url>\n    <loc>${BASE}${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`)
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  await writeFile(r('sitemap.xml'), xml, 'utf8');
}

// llms.txt — a curated, plain-text map of the site for AI assistants
// (the "robots.txt for LLMs" convention). Not linked in the UI.
async function buildLlms() {
  const series = CATALOGUE.series
    .map((sx) => `- ${sx.name} (${sx.audience}): ${sx.blurb}`)
    .join('\n');
  const blog = BLOG_POSTS.map(
    (p) => `- [${p.title}](${BASE}${p.canonicalPath}): ${p.description}`
  ).join('\n');

  const out = `# Tavren

> Tavren publishes structured AI toolkits that help in-house SAP teams prepare for the move from ECC to S/4HANA, reducing reliance on external consultants. Each toolkit is a set of structured prompts you run in your own AI tool to produce repeatable, decision-ready outputs for a specific business function — Finance, Sales, Supply Chain or HR. Individual packs are $${CATALOGUE.packPrice.toLocaleString('en-US')} and full series bundles are $${CATALOGUE.bundlePrice.toLocaleString('en-US')} (USD); a starter kit is free. Tavren is a trading name of VBCJ Solutions Ltd, registered in England and Wales. Your company data stays yours — you run the prompts in your own AI tool and Tavren never sees, stores or receives it. Checkout is handled by Lemon Squeezy as Merchant of Record.

## Key pages
- [Toolkits](${BASE}/toolkits): The four function-specific series, individual packs and series bundles, with pricing.
- [How it works](${BASE}/how-it-works): What a toolkit is, why structured prompting works, and how you run one.
- [Readiness guide](${BASE}/readiness): A curated route through the blog for business teams — timeline, ownership, data, people/process and method.
- [Free starter toolkit](${BASE}/free-kit): A free, structured prompt set to try the format before buying.
- [FAQ](${BASE}/faq): Common questions about the toolkits, pricing, data privacy and delivery.
- [About](${BASE}/about): What Tavren is and how it works.
- [Contact](${BASE}/contact): Get in touch.

## Toolkit series
${series}

## Blog
${blog}
`;
  await writeFile(r('llms.txt'), out, 'utf8');
}

async function main() {
  await loadPartials();
  CATALOGUE = JSON.parse(await readFile(r('products.json'), 'utf8'));
  await buildPages();
  await buildLegal();
  await buildBlog();
  await buildSitemap();
  await buildLlms();
  console.log(`  ✓ built ${urls.length} pages + sitemap.xml + llms.txt`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
