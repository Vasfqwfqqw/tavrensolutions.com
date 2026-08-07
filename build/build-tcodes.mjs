import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadDataset, assertValidTcode, moduleLabel, buildH1, successorText,
  shortStatusLabel, buildFirstParagraph, buildBodySection, buildSiblingLinks,
} from './tcode-lib.mjs';
import { renderDocument, writeOut, breadcrumbLd, faqPageLd, collectionPageLd, webPageLd, datasetLd, escHtml, BASE } from './build.mjs';

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

function gemCtaHtml() {
  return `
    <aside class="max-w-3xl rounded-2xl border border-azure/30 bg-white p-8 reveal">
      <span class="callout-label text-azure">Ask our S/4HANA Gem — free</span>
      <p class="mt-2 text-navy/80">Not sure what happens to a specific transaction in S/4HANA? Ask the free finance end-user Gem — it answers at desk level from our verified t-code dataset.</p>
      <a class="btn btn-secondary mt-5" href="https://gemini.google.com/gem/1SwS90yNM0E2Mj6IkNlr6iJ3oEGfjmCd3" target="_blank" rel="noopener">Ask the S/4HANA Gem</a>
    </aside>`;
}

function renderCodePage(record, allRecords, version, generated) {
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

  const noteParts = [];
  if (body.pendingNote) noteParts.push(`<p class="leading-relaxed text-navy/80">${escHtml(body.pendingNote)}</p>`);
  if (body.citation) noteParts.push(`<p class="text-sm text-slate">SAP reference: ${escHtml(body.citation)}</p>`);
  const noteCardHtml = noteParts.length
    ? `<div class="mt-10 max-w-3xl card reveal">${noteParts.join('\n')}</div>`
    : '';

  const content = `
<section class="container-tavren py-14 sm:py-20">
  <nav class="mb-6 text-sm text-slate" aria-label="Breadcrumb"><a href="/tcodes" class="hover:text-azure">T-code reference</a> <span aria-hidden="true">/</span> <span>${escHtml(record.tcode)}</span></nav>
  <div class="max-w-3xl reveal">
    <span class="eyebrow">${escHtml(mLabel)}</span>
    <h1 class="mt-3 text-3xl font-bold leading-tight sm:text-4xl">${escHtml(h1)}</h1>
    <p class="label-muted mt-6">${body.heading}</p>
    <p class="mt-2 text-lg text-navy/80">${escHtml(paragraph)}</p>
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
  ${noteCardHtml}
  ${siblingsHtml}
  ${freeKitCtaHtml()}
  ${datasetCreditHtml(version)}
</section>`;

  const canonicalPath = `/tcodes/${record.tcode}/`;
  const data = {
    title: `${record.tcode} in S/4HANA — ${record.status === 'replaced' ? 'what replaces it' : 'what happens to it'} | Tavren`,
    description: truncate(paragraph, 155),
  };
  const extraHead =
    breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'T-code reference', path: '/tcodes' }, { name: record.tcode, path: canonicalPath }]) +
    faqPageLd([{ q: h1, a: paragraph }]) +
    webPageLd({ name: data.title, description: data.description, url: `${BASE}${canonicalPath}`, dateModified: generated });

  return renderDocument({ content, data, canonicalPath, extraHead });
}

function renderModuleSections(records) {
  const byModule = new Map();
  for (const r of records) {
    if (!byModule.has(r.module)) byModule.set(r.module, []);
    byModule.get(r.module).push(r);
  }
  const modules = [...byModule.keys()].sort((a, b) => moduleLabel(a).localeCompare(moduleLabel(b)));
  return modules
    .map((m) => {
      const codes = byModule.get(m).sort((a, b) => a.tcode.localeCompare(b.tcode));
      const items = codes.map((c) => `<li><a href="/tcodes/${c.tcode}/" class="text-azure hover:underline">${escHtml(c.tcode)}</a></li>`).join('\n        ');
      return `
      <div class="reveal">
        <h3 class="font-bold text-navy">${escHtml(moduleLabel(m))} <span class="font-normal text-slate">(${codes.length})</span></h3>
        <ul class="mt-2 space-y-1 text-sm">
        ${items}
        </ul>
      </div>`;
    })
    .join('\n');
}

function renderModuleOptions(records) {
  const modules = [...new Set(records.map((r) => r.module))].sort((a, b) => moduleLabel(a).localeCompare(moduleLabel(b)));
  return modules.map((m) => `<option value="${escHtml(m)}">${escHtml(moduleLabel(m))}</option>`).join('\n');
}

function renderHubPage(records, reviewedCount, version, generated, datasetName, sourceEdition) {
  const content = `
<section class="container-tavren py-14 sm:py-20">
  <div class="max-w-3xl reveal">
    <span class="eyebrow">T-code reference</span>
    <h1 class="mt-3 text-4xl font-bold leading-tight sm:text-5xl">What happens to your ECC transaction codes in S/4HANA?</h1>
    <p class="mt-5 text-lg text-navy/80">This reference checks ${records.length} ECC transaction codes against the SAP Simplification List for S/4HANA — which ones are deleted at conversion, which are replaced, which still run unchanged after go-live, and which strategic Fiori app SAP points you to next. ${reviewedCount} entries are human-reviewed; the rest are machine-parsed from the Simplification List and flagged for review. Search or filter below, or browse by module.</p>
  </div>
</section>

<section class="container-tavren pb-10">
  <div class="card reveal">
    <div class="grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
      <input type="search" id="tcode-search" placeholder="Search t-code or keyword…" class="rounded-lg border border-navy/15 px-4 py-2.5 text-sm" aria-label="Search t-codes" />
      <select id="tcode-module-filter" class="rounded-lg border border-navy/15 px-4 py-2.5 text-sm" aria-label="Filter by module">
        <option value="">All modules</option>
        ${renderModuleOptions(records)}
      </select>
      <select id="tcode-status-filter" class="rounded-lg border border-navy/15 px-4 py-2.5 text-sm" aria-label="Filter by status">
        <option value="">All statuses</option>
        <option value="deleted">Deleted</option>
        <option value="replaced">Replaced</option>
        <option value="changed">Changed</option>
        <option value="available">Available</option>
      </select>
    </div>
    <p id="tcode-result-count" class="mt-4 text-sm text-slate" role="status" aria-live="polite">Loading…</p>
    <div class="mt-2 overflow-x-auto">
      <table class="w-full border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-navy/10 text-slate">
            <th class="py-2 pr-4 font-semibold">T-code</th>
            <th class="py-2 pr-4 font-semibold">Module</th>
            <th class="py-2 pr-4 font-semibold">Status</th>
            <th class="py-2 pr-4 font-semibold">Successor</th>
          </tr>
        </thead>
        <tbody id="tcode-results"></tbody>
      </table>
    </div>
  </div>
  ${gemCtaHtml()}
</section>

<section class="container-tavren pb-16">
  <h2 class="text-2xl font-bold text-navy reveal">Browse by module</h2>
  <p class="mt-2 text-sm text-slate reveal">Every t-code page, grouped by SAP module — works without JavaScript.</p>
  <div class="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3" data-stagger>
    ${renderModuleSections(records)}
  </div>
  ${datasetCreditHtml(version)}
</section>`;

  const data = {
    title: 'SAP ECC t-code reference for S/4HANA | Tavren',
    description: `What happens to your ECC transaction codes in S/4HANA — replaced, changed, deleted, or still available. ${records.length} t-codes, searchable by module and status.`,
    extraScripts: '<script src="/js/tcodes-filter.js" defer></script>',
  };
  const extraHead =
    breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'T-code reference', path: '/tcodes' }]) +
    collectionPageLd(data, `${BASE}/tcodes`) +
    datasetLd({
      name: datasetName,
      description: `Structured fate of ${records.length} SAP ECC transaction codes in S/4HANA — deleted, replaced, changed, or still available — derived from the SAP Simplification List with a plain-English 'what changes for you' note per code.`,
      url: `${BASE}/tcodes`,
      version,
      dateModified: generated,
      sourceEdition,
      dataDownloadUrl: `${BASE}/tcodes/data.json`,
      repoUrl: REPO_URL,
    }) +
    webPageLd({ name: data.title, description: data.description, url: `${BASE}/tcodes`, dateModified: generated });

  return renderDocument({ content, data, canonicalPath: '/tcodes', extraHead });
}

function buildDataJson(records) {
  return JSON.stringify(
    records.map((r) => ({
      tcode: r.tcode,
      module: r.module,
      moduleLabel: moduleLabel(r.module),
      status: r.status,
      successor: successorText(r),
      url: `/tcodes/${r.tcode}/`,
    }))
  );
}

export async function buildTcodes() {
  const { records, version, generated, dataset: datasetName, sourceEdition } = await loadDataset(DATASET_PATH);
  for (const r of records) assertValidTcode(r.tcode);

  const urls = [];
  for (const record of records) {
    const html = renderCodePage(record, records, version, generated);
    await writeOut(`tcodes/${record.tcode}/index.html`, html);
    urls.push({ loc: `/tcodes/${record.tcode}/`, priority: '0.4' });
  }

  const hubHtml = renderHubPage(records, records.filter((r) => r.review_status === 'reviewed').length, version, generated, datasetName, sourceEdition);
  await writeOut('tcodes/index.html', hubHtml);
  urls.push({ loc: '/tcodes', priority: '0.6' });

  await writeOut('tcodes/data.json', buildDataJson(records));

  return {
    urls,
    count: records.length,
    reviewedCount: records.filter((r) => r.review_status === 'reviewed').length,
    records,
    version,
  };
}
