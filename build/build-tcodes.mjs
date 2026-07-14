import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadDataset, assertValidTcode, moduleLabel, buildH1, successorText,
  shortStatusLabel, buildFirstParagraph, buildBodySection, buildSiblingLinks,
} from './tcode-lib.mjs';
import { renderDocument, writeOut, breadcrumbLd, faqPageLd, collectionPageLd, escHtml, BASE } from './build.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DATASET_PATH = join(ROOT, 'data/s4hana-tcode-dataset.json');
const REPO_URL = 'https://github.com/Vasfqwfqqw/s4hana-tcode-dataset';

function truncate(str, max) {
  const clean = String(str).replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

// version comes from the loaded dataset's own `version` field (Task 1's
// loadDataset), never hardcoded — a future dataset release must not
// require an edit here to stay accurate.
function datasetCreditHtml(version) {
  return `<p class="mt-8 text-xs text-slate">Data: SAP S/4HANA t-code fate dataset v${version} — <a href="${REPO_URL}" class="hover:text-azure" target="_blank" rel="noopener">github.com/Vasfqwfqqw/s4hana-tcode-dataset</a> (CC BY 4.0).</p>`;
}

function freeKitCtaHtml() {
  return `
    <div class="mt-12 max-w-3xl rounded-2xl bg-navy p-8 text-white reveal">
      <h2 class="text-xl font-bold text-white">Start with the free toolkit</h2>
      <p class="mt-2 text-white/85">See the format for yourself before you buy — the S/4HANA Readiness Starter Kit is free.</p>
      <a class="btn btn-onnavy mt-5" href="/free-kit?src=tcodes">Get the free starter toolkit</a>
    </div>`;
}

function renderCodePage(record, allRecords, version) {
  const h1 = buildH1(record);
  const paragraph = buildFirstParagraph(record);
  const body = buildBodySection(record);
  const siblings = buildSiblingLinks(record, allRecords, 6);
  const mLabel = moduleLabel(record.module);

  const siblingsHtml = siblings.length
    ? `
    <div class="mt-10 max-w-3xl reveal">
      <h2 class="text-lg font-bold text-navy">More ${escHtml(mLabel)} t-codes</h2>
      <ul class="mt-3 grid gap-2 sm:grid-cols-2">
        ${siblings.map((s) => `<li><a href="/tcodes/${s.tcode}/" class="text-azure hover:underline">${escHtml(s.tcode)} — ${shortStatusLabel(s.status)}</a></li>`).join('\n        ')}
      </ul>
    </div>`
    : '';

  const bodyInner = body.deltaNote
    ? `<p class="mt-3 leading-relaxed text-navy/80">${escHtml(body.deltaNote)}</p>`
    : `<p class="mt-3 leading-relaxed text-navy/80">${escHtml(paragraph)}</p><p class="mt-3 text-sm text-slate">${escHtml(body.pendingNote)}</p>`;

  const citationHtml = body.citation
    ? `<p class="mt-4 text-sm text-slate">SAP reference: ${escHtml(body.citation)}</p>`
    : '';

  const content = `
<section class="container-tavren py-14 sm:py-20">
  <nav class="mb-6 text-sm text-slate" aria-label="Breadcrumb"><a href="/tcodes" class="hover:text-azure">T-code reference</a> <span aria-hidden="true">/</span> <span>${escHtml(record.tcode)}</span></nav>
  <div class="max-w-3xl reveal">
    <span class="eyebrow">${escHtml(mLabel)}</span>
    <h1 class="mt-3 text-3xl font-bold leading-tight sm:text-4xl">${escHtml(h1)}</h1>
    <p class="mt-5 text-lg text-navy/80">${escHtml(paragraph)}</p>
  </div>

  <div class="mt-10 max-w-3xl overflow-x-auto reveal">
    <table class="w-full border-collapse text-left text-sm">
      <thead>
        <tr class="border-b border-navy/10 text-slate">
          <th class="py-2 pr-4 font-semibold">ECC t-code</th>
          <th class="py-2 pr-4 font-semibold">Status</th>
          <th class="py-2 pr-4 font-semibold">Successor</th>
        </tr>
      </thead>
      <tbody>
        <tr class="border-b border-navy/10">
          <td class="py-3 pr-4 font-mono font-semibold text-navy">${escHtml(record.tcode)}</td>
          <td class="py-3 pr-4">${shortStatusLabel(record.status)}</td>
          <td class="py-3 pr-4">${escHtml(successorText(record))}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="mt-10 max-w-3xl card reveal">
    <h2 class="text-lg font-bold text-navy">${body.heading}</h2>
    ${bodyInner}
    ${citationHtml}
  </div>
  ${siblingsHtml}
  ${freeKitCtaHtml()}
  ${datasetCreditHtml(version)}
</section>`;

  const canonicalPath = `/tcodes/${record.tcode}`;
  const data = {
    title: `${record.tcode} in S/4HANA — ${record.status === 'replaced' ? 'what replaces it' : 'what happens to it'} | Tavren`,
    description: truncate(paragraph, 155),
  };
  const extraHead =
    breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'T-code reference', path: '/tcodes' }, { name: record.tcode, path: canonicalPath }]) +
    faqPageLd([{ q: h1, a: paragraph }]);

  return renderDocument({ content, data, canonicalPath, extraHead });
}

export async function buildTcodes() {
  const { records, version } = await loadDataset(DATASET_PATH);
  for (const r of records) assertValidTcode(r.tcode);

  const urls = [];
  for (const record of records) {
    const html = renderCodePage(record, records, version);
    await writeOut(`tcodes/${record.tcode}/index.html`, html);
    urls.push({ loc: `/tcodes/${record.tcode}`, priority: '0.4' });
  }

  return {
    urls,
    count: records.length,
    reviewedCount: records.filter((r) => r.review_status === 'reviewed').length,
    records,
    version,
  };
}
