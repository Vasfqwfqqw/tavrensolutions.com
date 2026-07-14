# /tcodes/ Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate an 829-page `/tcodes/` reference section (828 per-code pages + 1 hub) from the vendored SAP S/4HANA t-code fate dataset, wired into the existing Node build so `npm run build` regenerates it, the sitemap, and llms.txt in one pass.

**Architecture:** A new pure-function library (`build/tcode-lib.mjs`) turns one dataset record into page content (H1, first paragraph, table data, body section, citation). A new orchestrator (`build/build-tcodes.mjs`) calls that library once per record, reuses `build/build.mjs`'s existing template/partial engine (exported for reuse), and writes 828 code pages + the hub + a `data.json` for the hub's client-side filter. `build.mjs`'s `main()` calls it alongside `buildBlog()`/`buildPages()` so sitemap and llms.txt stay single-source-of-truth.

**Tech Stack:** Node 18+ (ESM), `gray-matter` (front-matter parsing, already a dependency), Node's built-in `node:test`/`node:assert` for unit tests (zero new dependencies), plain vanilla JS for the hub's client-side filter (no frameworks, matches project convention).

## Global Constraints

- Never `git push` without the owner's explicit instruction (repo-wide rule) — this plan stops at "ready to push," does not push.
- British English throughout generated copy. "after go-live", never "post-migration". "mainstream maintenance" verbatim only where it genuinely describes the 2027 timeline (hub framing / continuity-flavoured delta notes) — never force-fit into every page.
- No invented statistics or fabricated successors. The 320 `replaced`+`pending` records with no named replacement must say "not yet confirmed," never guess a successor.
- Exact t-codes and exact Fiori app names/IDs only — pulled verbatim from `data/s4hana-tcode-dataset.json` fields, HTML-escaped on output.
- Every dataset-derived text field (`delta_note`, `sap_reference`, `replacement`) must be HTML-escaped when interpolated (defense in depth + correctness — e.g. an unescaped "&" breaks markup).
- `Always run npm run build before committing` (repo CLAUDE.md) so `css/styles.css` and generated HTML stay in sync with `src/`.
- FBL1N's page must state plainly: still runs after go-live (`changed`), SAP's strategic direction is the Manage Supplier Line Items app (`F0712`), saved layouts need rebuilding. No mention of Gemini or any other AI tool.
- Module code → friendly label map (all 29 dataset modules, verified exhaustive against the vendored file — see Task 2).

---

## Task 1: Vendor the dataset + data loader

**Files:**
- Create: `data/s4hana-tcode-dataset.json` (copy of the external dataset, v1.1.0, 828 records)
- Create: `build/tcode-lib.mjs`
- Create: `test/tcode-lib.test.mjs`
- Modify: `package.json` (add `"test": "node --test test/"` script)

**Interfaces:**
- Produces: `loadDataset(path) -> { dataset, version, generated, copyrightNote, records: Array<TcodeRecord> }` where `TcodeRecord` has `{ tcode, description, module, status, replacement, replacement_type, fiori_app_id, sap_reference, delta_note, review_status, source_item, source_page }` (exact field names from the source JSON).
- Produces: `assertValidTcode(tcode: string) -> void` — throws `Error` if the tcode contains characters outside `[A-Z0-9_-]`.

- [ ] **Step 1: Copy the dataset into the repo**

```bash
mkdir -p /Users/vasanttank/Documents/TavrenWS/data
cp "/Users/vasanttank/Documents/TavrenAgents/Tavren Solutions GO To Market Strategy/repo/s4hana-tcode-dataset/data/s4hana-tcode-dataset.json" /Users/vasanttank/Documents/TavrenWS/data/s4hana-tcode-dataset.json
```

- [ ] **Step 2: Write the failing test for the loader**

Create `test/tcode-lib.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, assertValidTcode } from '../build/tcode-lib.mjs';

test('loadDataset reads the vendored dataset', async () => {
  const data = await loadDataset(new URL('../data/s4hana-tcode-dataset.json', import.meta.url));
  assert.equal(data.records.length, 828);
  assert.equal(data.version, '1.1.0');
  assert.ok(data.records.every((r) => typeof r.tcode === 'string' && r.tcode.length > 0));
});

test('assertValidTcode accepts real tcode shapes', () => {
  assert.doesNotThrow(() => assertValidTcode('FBL1N'));
  assert.doesNotThrow(() => assertValidTcode('BD_GEN_GRCP'));
  assert.doesNotThrow(() => assertValidTcode('CPC1-3')); // hyphenated tcode, confirmed present in dataset
  assert.doesNotThrow(() => assertValidTcode('V-04'));
});

test('assertValidTcode rejects anything with path-unsafe characters', () => {
  assert.throws(() => assertValidTcode('FOO/BAR'));
  assert.throws(() => assertValidTcode('FOO BAR'));
  assert.throws(() => assertValidTcode(''));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test test/tcode-lib.test.mjs`
Expected: FAIL — `build/tcode-lib.mjs` does not exist yet.

- [ ] **Step 4: Write the minimal implementation**

Create `build/tcode-lib.mjs`:

```js
// Pure functions turning one dataset record into page content. No file I/O
// side effects except loadDataset itself, which just reads+parses JSON.
import { readFile } from 'node:fs/promises';

export async function loadDataset(path) {
  const raw = await readFile(path, 'utf8');
  const json = JSON.parse(raw);
  return {
    dataset: json.dataset,
    version: json.version,
    generated: json.generated,
    copyrightNote: json.copyright_note,
    records: json.records,
  };
}

const TCODE_RE = /^[A-Z0-9_-]+$/;
export function assertValidTcode(tcode) {
  if (typeof tcode !== 'string' || !TCODE_RE.test(tcode)) {
    throw new Error(`Unexpected tcode format: "${tcode}"`);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test test/tcode-lib.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 6: Add the `test` script and commit**

Modify `package.json` — add `"test": "node --test test/"` inside `"scripts"`.

```bash
git add data/s4hana-tcode-dataset.json build/tcode-lib.mjs test/tcode-lib.test.mjs package.json
git commit -m "Vendor t-code dataset and add loader with validation"
```

---

## Task 2: Module label map

**Files:**
- Modify: `build/tcode-lib.mjs`
- Modify: `test/tcode-lib.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces: `moduleLabel(moduleCode: string) -> string` — e.g. `moduleLabel('FI-AP')` returns `"Accounts Payable (FI-AP)"`. Unknown codes fall back to the raw code alone.

- [ ] **Step 1: Write the failing test**

Append to `test/tcode-lib.test.mjs`:

```js
import { moduleLabel } from '../build/tcode-lib.mjs';

test('moduleLabel returns a friendly label for all 29 known dataset modules', () => {
  assert.equal(moduleLabel('FI-AP'), 'Accounts Payable (FI-AP)');
  assert.equal(moduleLabel('CO'), 'Controlling (CO)');
  assert.equal(moduleLabel('IND-Automotive'), 'Automotive (IND-Automotive)');
  assert.equal(moduleLabel('CROSS'), 'Cross-application (CROSS)');
});

test('moduleLabel falls back to the raw code for unknown modules', () => {
  assert.equal(moduleLabel('ZZ-UNKNOWN'), 'ZZ-UNKNOWN');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/tcode-lib.test.mjs`
Expected: FAIL — `moduleLabel` is not exported.

- [ ] **Step 3: Write the minimal implementation**

Add to `build/tcode-lib.mjs`:

```js
// Verified exhaustive against the 29 distinct `module` values in
// data/s4hana-tcode-dataset.json v1.1.0. Business-friendly labels — the
// audience is FICO analysts / AP clerks / supply chain / HR staff, not
// SAP module-code-literate architects.
const MODULE_LABELS = {
  'CO': 'Controlling',
  'CO-PA': 'Profitability Analysis',
  'CROSS': 'Cross-application',
  'CS': 'Customer Service',
  'EHS': 'Environment, Health & Safety',
  'FI-AP': 'Accounts Payable',
  'FI-AR': 'Accounts Receivable',
  'FI-GL': 'General Ledger',
  'FI-GRC': 'Governance, Risk & Compliance',
  'FI-TRM': 'Treasury & Risk Management',
  'FIN-CLOSE': 'Financial Close',
  'HR': 'Human Resources',
  'IND-Aerospace and Defense': 'Aerospace & Defense',
  'IND-Automotive': 'Automotive',
  'IND-Banking': 'Banking',
  'IND-High Tech': 'High Tech',
  'IND-Oil and Gas': 'Oil & Gas',
  'IND-Public Sector': 'Public Sector',
  'IND-Retail': 'Retail',
  'IND-Utilities': 'Utilities',
  'MDM': 'Master Data Management',
  'MM-IM': 'Inventory Management',
  'MM-IV': 'Invoice Verification',
  'MM-PUR': 'Purchasing',
  'PLM': 'Product Lifecycle Management',
  'PP': 'Production Planning',
  'PPM': 'Project & Portfolio Management',
  'QM': 'Quality Management',
  'SD': 'Sales & Distribution',
};

export function moduleLabel(moduleCode) {
  const friendly = MODULE_LABELS[moduleCode];
  return friendly ? `${friendly} (${moduleCode})` : moduleCode;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/tcode-lib.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: Verify the map is exhaustive against the real vendored file**

Run:
```bash
node -e "
import('./build/tcode-lib.mjs').then(async (lib) => {
  const { records } = await lib.loadDataset(new URL('./data/s4hana-tcode-dataset.json', 'file://' + process.cwd() + '/'));
  const modules = [...new Set(records.map(r => r.module))];
  const unmapped = modules.filter(m => lib.moduleLabel(m) === m);
  console.log('unmapped modules:', unmapped);
});
"
```
Expected: `unmapped modules: []`

- [ ] **Step 6: Commit**

```bash
git add build/tcode-lib.mjs test/tcode-lib.test.mjs
git commit -m "Add friendly module label map for t-code pages"
```

---

## Task 3: H1 and successor/citation helpers

**Files:**
- Modify: `build/tcode-lib.mjs`
- Modify: `test/tcode-lib.test.mjs`

**Interfaces:**
- Consumes: `TcodeRecord` shape from Task 1.
- Produces:
  - `buildH1(record) -> string`
  - `successorText(record) -> string` — e.g. `"Manage Supplier Line Items (Fiori app) — Fiori app F0712"`, or `"Fiori app F1077"` when only `fiori_app_id` is set, or `"—"` when neither is set.
  - `shortStatusLabel(status) -> string` — `{deleted:'Deleted', replaced:'Replaced', changed:'Changed', available:'Available'}[status]`.

- [ ] **Step 1: Write the failing test**

Append to `test/tcode-lib.test.mjs`:

```js
import { buildH1, successorText, shortStatusLabel } from '../build/tcode-lib.mjs';

test('buildH1 uses the "what replaces" phrasing only for replaced status', () => {
  assert.equal(buildH1({ tcode: 'FD32', status: 'replaced' }), 'What replaces FD32 in S/4HANA?');
  assert.equal(buildH1({ tcode: 'FBL1N', status: 'changed' }), 'What happens to FBL1N in SAP S/4HANA?');
  assert.equal(buildH1({ tcode: 'ABLM_BLACKLIST', status: 'deleted' }), 'What happens to ABLM_BLACKLIST in SAP S/4HANA?');
  assert.equal(buildH1({ tcode: 'KKBC_HOE_H', status: 'available' }), 'What happens to KKBC_HOE_H in SAP S/4HANA?');
});

test('successorText combines replacement text and Fiori app id', () => {
  assert.equal(
    successorText({ replacement: 'Manage Supplier Line Items (Fiori app)', fiori_app_id: 'F0712' }),
    'Manage Supplier Line Items (Fiori app) — Fiori app F0712'
  );
  assert.equal(successorText({ replacement: '', fiori_app_id: 'F1077' }), 'Fiori app F1077');
  assert.equal(successorText({ replacement: 'UKM_BP (SAP Credit Management)', fiori_app_id: '' }), 'UKM_BP (SAP Credit Management)');
  assert.equal(successorText({ replacement: '', fiori_app_id: '' }), '—');
});

test('shortStatusLabel maps all four dataset statuses', () => {
  assert.equal(shortStatusLabel('deleted'), 'Deleted');
  assert.equal(shortStatusLabel('replaced'), 'Replaced');
  assert.equal(shortStatusLabel('changed'), 'Changed');
  assert.equal(shortStatusLabel('available'), 'Available');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/tcode-lib.test.mjs`
Expected: FAIL — three new exports missing.

- [ ] **Step 3: Write the minimal implementation**

Add to `build/tcode-lib.mjs`:

```js
export function buildH1(record) {
  return record.status === 'replaced'
    ? `What replaces ${record.tcode} in S/4HANA?`
    : `What happens to ${record.tcode} in SAP S/4HANA?`;
}

export function successorText(record) {
  const parts = [];
  if (record.replacement) parts.push(record.replacement);
  if (record.fiori_app_id) parts.push(`Fiori app ${record.fiori_app_id}`);
  return parts.length ? parts.join(' — ') : '—';
}

const SHORT_STATUS_LABELS = { deleted: 'Deleted', replaced: 'Replaced', changed: 'Changed', available: 'Available' };
export function shortStatusLabel(status) {
  return SHORT_STATUS_LABELS[status] || status;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/tcode-lib.test.mjs`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add build/tcode-lib.mjs test/tcode-lib.test.mjs
git commit -m "Add H1, successor text, and status label helpers"
```

---

## Task 4: First-paragraph builder

This is the core direct-answer generator. Every reviewed record (197 of
828) has a human-authored `delta_note` that is already 2–3 sentences in
the right voice and answers the H1 directly — verified empirically: 100%
of `reviewed` records have a non-empty `delta_note`, and both `available`
and `changed` statuses are *entirely* reviewed (3/3 and 14/14). So the
branch only needs to invent prose for `pending` records, which are always
`status: 'deleted'` or `status: 'replaced'` in the current dataset (verified:
no pending `changed`/`available` records exist), and always have a
non-empty `sap_reference` (verified: 0 pending records are missing it).

**Files:**
- Modify: `build/tcode-lib.mjs`
- Modify: `test/tcode-lib.test.mjs`

**Interfaces:**
- Consumes: `TcodeRecord`.
- Produces: `buildFirstParagraph(record) -> string` (plain text, not HTML-escaped — callers escape on output).

- [ ] **Step 1: Write the failing test**

Append to `test/tcode-lib.test.mjs`:

```js
import { buildFirstParagraph } from '../build/tcode-lib.mjs';

test('buildFirstParagraph returns the delta_note verbatim for reviewed records', () => {
  const fbl1n = {
    tcode: 'FBL1N', status: 'changed', review_status: 'reviewed',
    replacement: 'Manage Supplier Line Items (Fiori app)', fiori_app_id: 'F0712',
    delta_note: 'Your day-to-day vendor line item list keeps working after conversion, but SAP’s direction is the Manage Supplier Line Items app (SAP now says Supplier, not Vendor). The app swaps the classic selection screen for filter bars and builds in actions like blocking and paying, and your saved FBL1N layouts will not come across, so plan to rebuild them.',
    sap_reference: '', source_item: null,
  };
  assert.equal(buildFirstParagraph(fbl1n), fbl1n.delta_note);
});

test('buildFirstParagraph handles pending+replaced with a named replacement', () => {
  const fd32Pending = {
    tcode: 'FD32', status: 'replaced', review_status: 'pending',
    replacement: 'UKM_BP (SAP Credit Management)', fiori_app_id: '',
    delta_note: '', sap_reference: 'S4TWL - Credit Management', source_item: '6.3.1',
  };
  const p = buildFirstParagraph(fd32Pending);
  assert.match(p, /FD32 is replaced in S\/4HANA by UKM_BP \(SAP Credit Management\)/);
  assert.match(p, /machine-parsed/i);
  assert.match(p, /under review|awaiting human review/i);
});

test('buildFirstParagraph handles pending+replaced with no named replacement yet', () => {
  const bdGenGrcp = {
    tcode: 'BD_GEN_GRCP', status: 'replaced', review_status: 'pending',
    replacement: '', fiori_app_id: '',
    delta_note: '', sap_reference: 'S4TWL - Recipe Management', source_item: '10.4.22',
  };
  const p = buildFirstParagraph(bdGenGrcp);
  assert.match(p, /BD_GEN_GRCP is marked as replaced/);
  assert.match(p, /not yet (?:been )?confirmed/);
  assert.doesNotMatch(p, /\bis replaced in S\/4HANA by\b/);
});

test('buildFirstParagraph handles pending+deleted', () => {
  const ablm = {
    tcode: 'ABLM_BLACKLIST', status: 'deleted', review_status: 'pending',
    replacement: '', fiori_app_id: '',
    delta_note: '', sap_reference: 'S4TWL - Product catalog', source_item: '13.15.48',
  };
  const p = buildFirstParagraph(ablm);
  assert.match(p, /ABLM_BLACKLIST is removed in S\/4HANA/);
  assert.match(p, /machine-parsed/i);
});

test('buildFirstParagraph never writes "post-migration"', () => {
  const recs = [
    { tcode: 'A', status: 'deleted', review_status: 'pending', replacement: '', fiori_app_id: '', delta_note: '' },
    { tcode: 'B', status: 'replaced', review_status: 'pending', replacement: 'X', fiori_app_id: '', delta_note: '' },
  ];
  for (const r of recs) assert.doesNotMatch(buildFirstParagraph(r), /post-migration/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/tcode-lib.test.mjs`
Expected: FAIL — `buildFirstParagraph` not exported.

- [ ] **Step 3: Write the minimal implementation**

Add to `build/tcode-lib.mjs`:

```js
export function buildFirstParagraph(record) {
  if (record.review_status === 'reviewed') {
    // Human-verified, already 2-3 sentences, already answers the H1 directly.
    return record.delta_note;
  }

  // Pending: dataset-verified to always be status 'deleted' or 'replaced',
  // and to always carry a sap_reference. No delta_note is used here even
  // if a stray one exists on the record (spec: pending never shows one).
  if (record.status === 'deleted') {
    return `${record.tcode} is removed in S/4HANA — it does not exist after conversion. This entry is machine-parsed from the SAP Simplification List and is awaiting human review, so treat the detail as provisional until it has been checked against the source.`;
  }

  if (record.status === 'replaced') {
    if (record.replacement) {
      const fioriPart = record.fiori_app_id ? ` (Fiori app ${record.fiori_app_id})` : '';
      return `${record.tcode} is replaced in S/4HANA by ${record.replacement}${fioriPart}. This mapping is machine-parsed from the SAP Simplification List and is awaiting human review, so treat the successor as provisional until it has been checked against the source.`;
    }
    return `${record.tcode} is marked as replaced in S/4HANA, but the specific successor has not yet been confirmed in this dataset. This entry is machine-parsed from the SAP Simplification List and is awaiting human review — check the cited source for the named replacement.`;
  }

  // Defensive fallback — not hit by the current dataset (verified: pending
  // records are only ever 'deleted' or 'replaced'), kept so a future
  // dataset release with a pending 'changed'/'available' record still
  // renders something honest instead of crashing the build.
  return `${record.tcode} is marked "${record.status}" in S/4HANA. This entry is machine-parsed from the SAP Simplification List and is awaiting human review.`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/tcode-lib.test.mjs`
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add build/tcode-lib.mjs test/tcode-lib.test.mjs
git commit -m "Add first-paragraph direct-answer builder"
```

---

## Task 5: Body section builder ("what changes at your desk")

**Files:**
- Modify: `build/tcode-lib.mjs`
- Modify: `test/tcode-lib.test.mjs`

**Interfaces:**
- Consumes: `TcodeRecord`.
- Produces: `buildBodySection(record) -> { heading: string, deltaNote: string|null, pendingNote: string|null, citation: string|null }`. `deltaNote` is set (and `pendingNote` null) for reviewed records; `pendingNote` is set (and `deltaNote` null) for pending records. `citation` is `"{sap_reference} (item {source_item})"` or just `sap_reference` when `source_item` is absent, or `null` when `sap_reference` is empty (only possible for 14 reviewed records).

- [ ] **Step 1: Write the failing test**

Append to `test/tcode-lib.test.mjs`:

```js
import { buildBodySection } from '../build/tcode-lib.mjs';

test('buildBodySection: reviewed record shows delta note, no pending note', () => {
  const r = buildBodySection({
    review_status: 'reviewed', delta_note: 'Nothing changes in how FB60 posts.',
    sap_reference: '', source_item: null,
  });
  assert.equal(r.heading, 'What changes at your desk');
  assert.equal(r.deltaNote, 'Nothing changes in how FB60 posts.');
  assert.equal(r.pendingNote, null);
  assert.equal(r.citation, null);
});

test('buildBodySection: reviewed record with a sap_reference still shows it as citation', () => {
  const r = buildBodySection({
    review_status: 'reviewed', delta_note: 'Some note.',
    sap_reference: 'S4TWL - Credit Management', source_item: '6.3.1',
  });
  assert.equal(r.citation, 'S4TWL - Credit Management (item 6.3.1)');
});

test('buildBodySection: pending record shows the machine-parsed note and citation, no delta note', () => {
  const r = buildBodySection({
    review_status: 'pending', delta_note: '',
    sap_reference: 'S4TWL - Recipe Management', source_item: '10.4.22',
  });
  assert.equal(r.heading, 'Status');
  assert.equal(r.deltaNote, null);
  assert.match(r.pendingNote, /Machine-parsed from the SAP Simplification List/);
  assert.match(r.pendingNote, /under human review/);
  assert.equal(r.citation, 'S4TWL - Recipe Management (item 10.4.22)');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/tcode-lib.test.mjs`
Expected: FAIL — `buildBodySection` not exported.

- [ ] **Step 3: Write the minimal implementation**

Add to `build/tcode-lib.mjs`:

```js
function buildCitation(record) {
  if (!record.sap_reference) return null;
  return record.source_item ? `${record.sap_reference} (item ${record.source_item})` : record.sap_reference;
}

export function buildBodySection(record) {
  const citation = buildCitation(record);
  if (record.review_status === 'reviewed') {
    return { heading: 'What changes at your desk', deltaNote: record.delta_note, pendingNote: null, citation };
  }
  return {
    heading: 'Status',
    deltaNote: null,
    pendingNote: 'Machine-parsed from the SAP Simplification List — under human review.',
    citation,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/tcode-lib.test.mjs`
Expected: PASS (16 tests)

- [ ] **Step 5: Commit**

```bash
git add build/tcode-lib.mjs test/tcode-lib.test.mjs
git commit -m "Add body-section builder for reviewed vs pending records"
```

---

## Task 6: Sibling cross-link selector

**Files:**
- Modify: `build/tcode-lib.mjs`
- Modify: `test/tcode-lib.test.mjs`

**Interfaces:**
- Consumes: `TcodeRecord`, `Array<TcodeRecord>` (all records).
- Produces: `buildSiblingLinks(record, allRecords, max = 6) -> Array<{tcode, status}>` — same-module records excluding self, reviewed records sorted first, capped at `max`, may return fewer than 4 (down to zero) when the module is small.

- [ ] **Step 1: Write the failing test**

Append to `test/tcode-lib.test.mjs`:

```js
import { buildSiblingLinks } from '../build/tcode-lib.mjs';

const fixtureModule = [
  { tcode: 'A1', module: 'FI-AP', review_status: 'pending', status: 'deleted' },
  { tcode: 'A2', module: 'FI-AP', review_status: 'reviewed', status: 'changed' },
  { tcode: 'A3', module: 'FI-AP', review_status: 'pending', status: 'replaced' },
  { tcode: 'A4', module: 'FI-AP', review_status: 'reviewed', status: 'replaced' },
  { tcode: 'A5', module: 'FI-AP', review_status: 'pending', status: 'deleted' },
  { tcode: 'A6', module: 'FI-AP', review_status: 'pending', status: 'deleted' },
  { tcode: 'A7', module: 'FI-AP', review_status: 'pending', status: 'deleted' },
  { tcode: 'B1', module: 'SD', review_status: 'reviewed', status: 'changed' },
];

test('buildSiblingLinks excludes self, prefers reviewed, caps at max', () => {
  const self = fixtureModule[0]; // A1
  const siblings = buildSiblingLinks(self, fixtureModule, 6);
  assert.equal(siblings.length, 6);
  assert.ok(!siblings.some((s) => s.tcode === 'A1'));
  assert.ok(!siblings.some((s) => s.tcode.startsWith('B'))); // no cross-module leakage
  // reviewed records (A2, A4) come before pending ones
  const reviewedIdx = siblings.map((s) => s.tcode).indexOf('A2');
  const pendingIdx = siblings.map((s) => s.tcode).indexOf('A5');
  assert.ok(reviewedIdx < pendingIdx);
});

test('buildSiblingLinks returns fewer than max when the module is small', () => {
  const self = fixtureModule[7]; // B1, only member of SD in this fixture
  assert.deepEqual(buildSiblingLinks(self, fixtureModule, 6), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/tcode-lib.test.mjs`
Expected: FAIL — `buildSiblingLinks` not exported.

- [ ] **Step 3: Write the minimal implementation**

Add to `build/tcode-lib.mjs`:

```js
export function buildSiblingLinks(record, allRecords, max = 6) {
  const sameModule = allRecords.filter((r) => r.module === record.module && r.tcode !== record.tcode);
  sameModule.sort((a, b) => {
    if (a.review_status === b.review_status) return 0;
    return a.review_status === 'reviewed' ? -1 : 1;
  });
  return sameModule.slice(0, max).map((r) => ({ tcode: r.tcode, status: r.status }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/tcode-lib.test.mjs`
Expected: PASS (18 tests)

- [ ] **Step 5: Commit**

```bash
git add build/tcode-lib.mjs test/tcode-lib.test.mjs
git commit -m "Add same-module sibling cross-link selector"
```

---

## Task 7: Export shared template primitives from build.mjs

No new behaviour — this is a pure refactor so `build-tcodes.mjs` (Task 8)
can reuse the same layout/partial/JSON-LD engine `buildPages()` and
`buildBlog()` already use, instead of duplicating it.

**Files:**
- Modify: `build/build.mjs`

**Interfaces:**
- Produces (newly exported, previously private): `renderDocument`, `writeOut`, `breadcrumbLd`, `collectionPageLd`, `faqPageLd`, `escHtml`, `BASE`.

- [ ] **Step 1: Capture a before-checksum of every generated output file**

```bash
cd /Users/vasanttank/Documents/TavrenWS
npm run build
find . -maxdepth 3 \( -name '*.html' -o -name 'sitemap.xml' -o -name 'llms.txt' \) -not -path './node_modules/*' -not -path './src/*' -not -path './docs/*' | sort | xargs shasum -a 256 > /tmp/tcodes-before.txt
wc -l /tmp/tcodes-before.txt
```

- [ ] **Step 2: Add `export` to the six functions/constants**

In `build/build.mjs`, change these declarations (no other edits):

```js
// line ~23
export const BASE = 'https://tavrensolutions.com';
```
```js
// line ~36
export const escHtml = (v) => ...
```
```js
// line ~62
export function breadcrumbLd(crumbs) { ...
```
```js
// line ~74
export function collectionPageLd(d, url) { ...
```
```js
// line ~116
export function faqPageLd(faqs) { ...
```
```js
// line ~129
export function renderDocument({ content, data, canonicalPath, extraHead = '', ogType = 'website', bodyClass = '' }) { ...
```
```js
// line ~153
export async function writeOut(relPath, html) { ...
```

- [ ] **Step 3: Run the build again and diff against the before-checksum**

```bash
npm run build
find . -maxdepth 3 \( -name '*.html' -o -name 'sitemap.xml' -o -name 'llms.txt' \) -not -path './node_modules/*' -not -path './src/*' -not -path './docs/*' | sort | xargs shasum -a 256 > /tmp/tcodes-after.txt
diff /tmp/tcodes-before.txt /tmp/tcodes-after.txt
```
Expected: no output (identical) — adding `export` keywords must not change any generated byte.

- [ ] **Step 4: Commit**

```bash
git add build/build.mjs
git commit -m "Export template primitives from build.mjs for reuse by build-tcodes.mjs"
```

---

## Task 8: Per-code page generation

**Files:**
- Create: `build/build-tcodes.mjs`
- Modify: `build/build.mjs` (wire in the call)

**Interfaces:**
- Consumes: everything from `build/tcode-lib.mjs` (Tasks 1–6) and `renderDocument`/`writeOut`/`breadcrumbLd`/`faqPageLd`/`escHtml`/`BASE` from `build/build.mjs` (Task 7).
- Produces: `export async function buildTcodes() -> { urls: Array<{loc, priority}>, count: number, reviewedCount: number, records: Array<TcodeRecord> }`. `records` is returned so Task 9 (hub) and Task 11 (llms.txt) don't have to reload the dataset.

- [ ] **Step 1: Write `build/build-tcodes.mjs` — per-code page generation**

```js
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
const DATASET_VERSION = '1.1.0';

function truncate(str, max) {
  const clean = String(str).replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

function datasetCreditHtml() {
  return `<p class="mt-8 text-xs text-slate">Data: SAP S/4HANA t-code fate dataset v${DATASET_VERSION} — <a href="${REPO_URL}" class="hover:text-azure" target="_blank" rel="noopener">github.com/Vasfqwfqqw/s4hana-tcode-dataset</a> (CC BY 4.0).</p>`;
}

function freeKitCtaHtml() {
  return `
    <div class="mt-12 max-w-3xl rounded-2xl bg-navy p-8 text-white reveal">
      <h2 class="text-xl font-bold text-white">Start with the free toolkit</h2>
      <p class="mt-2 text-white/85">See the format for yourself before you buy — the S/4HANA Readiness Starter Kit is free.</p>
      <a class="btn btn-onnavy mt-5" href="/free-kit?src=tcodes">Get the free starter toolkit</a>
    </div>`;
}

function renderCodePage(record, allRecords) {
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
  ${datasetCreditHtml()}
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
    const html = renderCodePage(record, records);
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
```

- [ ] **Step 2: Wire into `build/build.mjs`**

Add the import near the top of `build/build.mjs`:

```js
import { buildTcodes } from './build-tcodes.mjs';
```

In `main()`, after `await buildBlog();` and before `await buildSitemap();`:

```js
  const tcodesResult = await buildTcodes();
  urls.push(...tcodesResult.urls);
```

(`build-tcodes.mjs` imports `renderDocument` etc. *from* `build.mjs`, and
`build.mjs` imports `buildTcodes` *from* `build-tcodes.mjs` — this is fine
in ESM as long as neither side calls the other at module-evaluation time,
only inside functions invoked from `main()`, which is the case here.)

- [ ] **Step 3: Run the build and spot-check FBL1N**

```bash
npm run build
cat tcodes/FBL1N/index.html | grep -o 'F0712\|Manage Supplier Line Items\|still runs after go-live\|saved.*layouts\|rebuild'
```
Expected: all of `F0712`, `Manage Supplier Line Items`, and text about saved layouts/rebuild present. No `FBL3H`, no `Gemini`, no `post-migration` anywhere in the file:
```bash
grep -i 'FBL3H\|Gemini\|post-migration' tcodes/FBL1N/index.html
```
Expected: no matches (empty output, grep exits 1).

- [ ] **Step 4: Spot-check a pending record**

```bash
cat tcodes/BD_GEN_GRCP/index.html | grep -o 'not yet.*confirmed\|Machine-parsed from the SAP Simplification List\|under human review'
```
Expected: all three fragments present.

- [ ] **Step 5: Count generated pages**

```bash
find tcodes -mindepth 1 -maxdepth 1 -type d | wc -l
```
Expected: `828`

- [ ] **Step 6: Commit**

```bash
git add build/build-tcodes.mjs build/build.mjs
git commit -m "Generate 828 per-code t-code reference pages"
```

---

## Task 9: Hub page — static module index + filter shell + data.json

**Files:**
- Modify: `build/build-tcodes.mjs`

**Interfaces:**
- Consumes: `records` from within `buildTcodes()` (Task 8).
- Produces (within the same `buildTcodes()` call): writes `tcodes/index.html` and `tcodes/data.json`; adds `{ loc: '/tcodes', priority: '0.6' }` to the returned `urls`.

- [ ] **Step 1: Add the hub renderer to `build/build-tcodes.mjs`**

```js
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

function renderHubPage(records, reviewedCount) {
  const content = `
<section class="container-tavren py-14 sm:py-20">
  <div class="max-w-3xl reveal">
    <span class="eyebrow">T-code reference</span>
    <h1 class="mt-3 text-4xl font-bold leading-tight sm:text-5xl">What happens to your ECC transaction codes in S/4HANA?</h1>
    <p class="mt-5 text-lg text-navy/80">This reference checks ${records.length} ECC transaction codes against the SAP Simplification List for S/4HANA — which ones are deleted at conversion, which are replaced, which still run unchanged after go-live, and which strategic Fiori app SAP points you to next. ${reviewedCount} entries are human-reviewed with full detail; the rest are machine-parsed from the Simplification List and flagged for review. Search or filter below, or browse by module.</p>
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
</section>

<section class="container-tavren pb-16">
  <h2 class="text-2xl font-bold text-navy reveal">Browse by module</h2>
  <p class="mt-2 text-sm text-slate reveal">Every t-code page, grouped by SAP module — works without JavaScript.</p>
  <div class="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3" data-stagger>
    ${renderModuleSections(records)}
  </div>
</section>
${datasetCreditHtml()}`;

  const data = {
    title: 'SAP ECC t-code reference for S/4HANA | Tavren',
    description: `What happens to your ECC transaction codes in S/4HANA — replaced, changed, deleted, or still available. ${records.length} t-codes, searchable by module and status.`,
    extraScripts: '<script src="/js/tcodes-filter.js" defer></script>',
  };
  const extraHead =
    breadcrumbLd([{ name: 'Home', path: '/' }, { name: 'T-code reference', path: '/tcodes' }]) +
    collectionPageLd(data, `${BASE}/tcodes`);

  return renderDocument({ content, data, canonicalPath: '/tcodes' });
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
```

- [ ] **Step 2: Call the hub renderer from `buildTcodes()`**

Modify `buildTcodes()` in `build/build-tcodes.mjs` — add before the `return`:

```js
  const hubHtml = renderHubPage(records, records.filter((r) => r.review_status === 'reviewed').length);
  await writeOut('tcodes/index.html', hubHtml);
  urls.push({ loc: '/tcodes', priority: '0.6' });

  await writeOut('tcodes/data.json', buildDataJson(records));
```

- [ ] **Step 3: Run the build and check the hub**

```bash
npm run build
grep -c 'href="/tcodes/' tcodes/index.html
```
Expected: at least 828 (one per module-list `<a>`, plus nav/breadcrumb links).

```bash
node -e "const d = require('./tcodes/data.json'); console.log(d.length)"
```
Expected: `828`

- [ ] **Step 4: Commit**

```bash
git add build/build-tcodes.mjs
git commit -m "Add /tcodes/ hub with static module index and data.json"
```

---

## Task 10: Client-side filter script

**Files:**
- Create: `js/tcodes-filter.js`

**Interfaces:**
- Consumes: `/tcodes/data.json` (array of `{tcode, module, moduleLabel, status, successor, url}`, from Task 9).
- Produces: no exports (browser script, matches `js/main.js`'s IIFE style).

- [ ] **Step 1: Write `js/tcodes-filter.js`**

```js
// /tcodes/ hub: fetch the generated data.json and wire up search + filters.
// The "Browse by module" section below is static HTML and works with this
// script disabled or failing to load.
(function () {
  'use strict';
  var searchInput = document.getElementById('tcode-search');
  var moduleFilter = document.getElementById('tcode-module-filter');
  var statusFilter = document.getElementById('tcode-status-filter');
  var resultsBody = document.getElementById('tcode-results');
  var countEl = document.getElementById('tcode-result-count');
  if (!searchInput || !resultsBody) return;

  var rows = [];

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function render() {
    var q = searchInput.value.trim().toLowerCase();
    var mod = moduleFilter.value;
    var status = statusFilter.value;
    var matches = rows.filter(function (r) {
      if (mod && r.module !== mod) return false;
      if (status && r.status !== status) return false;
      if (q && r.tcode.toLowerCase().indexOf(q) === -1 && r.successor.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var shown = matches.slice(0, 200);
    resultsBody.innerHTML = shown
      .map(function (r) {
        return (
          '<tr class="border-b border-navy/10">' +
          '<td class="py-2 pr-4 font-mono"><a href="' + r.url + '" class="text-azure hover:underline">' + escapeHtml(r.tcode) + '</a></td>' +
          '<td class="py-2 pr-4">' + escapeHtml(r.moduleLabel) + '</td>' +
          '<td class="py-2 pr-4">' + escapeHtml(r.status) + '</td>' +
          '<td class="py-2 pr-4">' + escapeHtml(r.successor) + '</td>' +
          '</tr>'
        );
      })
      .join('');
    countEl.textContent =
      matches.length === rows.length
        ? matches.length + ' t-codes'
        : matches.length + ' of ' + rows.length + ' t-codes' + (matches.length > shown.length ? ' (showing first ' + shown.length + ')' : '');
  }

  fetch('/tcodes/data.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      rows = data;
      render();
      searchInput.addEventListener('input', render);
      moduleFilter.addEventListener('change', render);
      statusFilter.addEventListener('change', render);
    })
    .catch(function () {
      countEl.textContent = 'Search is unavailable right now — use "Browse by module" below.';
    });
})();
```

- [ ] **Step 2: Manual check in the browser**

```bash
npm run build && npm run serve
```
Open `http://localhost:4321/tcodes`, type `FBL1N` in the search box —
confirm the table filters to that row and the link works. Clear the
search, pick a module in the dropdown — confirm the table filters
accordingly. Check the `Browse by module` section below renders 828 links
total across all module groups.

- [ ] **Step 3: Commit**

```bash
git add js/tcodes-filter.js
git commit -m "Add client-side search/filter for the t-code hub"
```

---

## Task 11: llms.txt integration

**Files:**
- Modify: `build/build.mjs`

**Interfaces:**
- Consumes: `tcodesResult.count` from Task 8's `buildTcodes()` return value.

- [ ] **Step 1: Update `buildLlms()` to accept the tcodes summary**

In `build/build.mjs`, change the `buildLlms` signature and replace the
placeholder line (currently: `- SAP t-code reference (/tcodes/): Coming
soon…`):

```js
async function buildLlms(tcodesCount) {
  // ...unchanged series/blog setup...
```

Replace:
```
- SAP t-code reference (/tcodes/): Coming soon — ECC t-code to S/4HANA/Fiori mapping guide, one page per code.
```
with:
```
- [SAP t-code reference](${BASE}/tcodes): What happens to ${tcodesCount} ECC transaction codes in S/4HANA — deleted, replaced, changed, or still available, with the SAP Simplification List citation for each. One page per code.
```

- [ ] **Step 2: Update the `main()` call site**

```js
  await buildLlms(tcodesResult.count);
```

- [ ] **Step 3: Run the build and check llms.txt**

```bash
npm run build
grep -A1 't-code reference' llms.txt
```
Expected: the new line with `828` (not "Coming soon").

- [ ] **Step 4: Commit**

```bash
git add build/build.mjs
git commit -m "Replace llms.txt tcodes placeholder with the live hub + count"
```

---

## Task 12: Nav and footer links

**Files:**
- Modify: `src/partials/header.html`
- Modify: `src/partials/footer.html`

- [ ] **Step 1: Add to desktop + mobile nav in `header.html`**

After the `/readiness` link in both the desktop `<nav>` (around line 10)
and the mobile `<nav>` (around line 39), add:

```html
      <a href="/tcodes" class="nav-link text-sm font-medium text-navy/80 transition hover:text-azure">T-code reference</a>
```
(desktop) and
```html
      <a href="/tcodes" class="nav-link py-2.5 font-medium text-navy">T-code reference</a>
```
(mobile, matching the existing mobile link style).

- [ ] **Step 2: Add to the footer's Explore list**

In `footer.html`, after the `/readiness` `<li>` (around line 14), add:

```html
          <li><a href="/tcodes" class="text-navy/80 hover:text-azure">T-code reference</a></li>
```

- [ ] **Step 3: Rebuild and confirm the link renders on every page**

```bash
npm run build
grep -c 'href="/tcodes"' index.html toolkits.html
```
Expected: `2` in each (desktop + mobile nav; footer adds a 3rd — adjust
the expected count to `3` if the grep includes the footer, verify by
eye).

- [ ] **Step 4: Commit**

```bash
git add src/partials/header.html src/partials/footer.html
git commit -m "Add /tcodes/ to site nav and footer"
```

---

## Task 13: Structural verification script

Mirrors `build/verify-catalogue.mjs`'s pattern (read generated output,
assert, exit non-zero on failure) but needs no browser — everything is
static HTML/JSON on disk.

**Files:**
- Create: `build/verify-tcodes.mjs`

- [ ] **Step 1: Write `build/verify-tcodes.mjs`**

```js
// T-code section integrity: page count, sitemap/llms wiring, and the
// specific claims required for FBL1N, one pending record, and one
// reviewed-deleted record. Run after `npm run build`: node build/verify-tcodes.mjs
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url);
const r = (p) => new URL(p, ROOT);

let problems = 0;
function check(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    console.log(`  ✗ ${label}`);
    problems++;
  }
}

const dataset = JSON.parse(await readFile(r('data/s4hana-tcode-dataset.json'), 'utf8'));
const recordCount = dataset.records.length;

// --- page count ---
const dirs = (await readdir(r('tcodes'), { withFileTypes: true })).filter((d) => d.isDirectory());
check(`tcodes/ has ${recordCount} code directories`, dirs.length === recordCount);
check('tcodes/index.html exists', existsSync(r('tcodes/index.html')));
check('tcodes/data.json exists', existsSync(r('tcodes/data.json')));

const dataJson = JSON.parse(await readFile(r('tcodes/data.json'), 'utf8'));
check(`tcodes/data.json has ${recordCount} entries`, dataJson.length === recordCount);

// --- sitemap ---
const sitemap = await readFile(r('sitemap.xml'), 'utf8');
const tcodeLocs = (sitemap.match(/<loc>https:\/\/tavrensolutions\.com\/tcodes/g) || []).length;
check(`sitemap.xml has ${recordCount + 1} /tcodes entries (${recordCount} codes + hub)`, tcodeLocs === recordCount + 1);

// --- llms.txt ---
const llms = await readFile(r('llms.txt'), 'utf8');
check('llms.txt no longer says "Coming soon" for t-codes', !/t-code reference.*Coming soon/i.test(llms));
check('llms.txt references /tcodes and the record count', llms.includes('/tcodes') && llms.includes(String(recordCount)));

// --- robots.txt still permissive ---
const robots = await readFile(r('robots.txt'), 'utf8');
check('robots.txt still allows all user-agents', /User-agent: \*/.test(robots) && /Allow: \//.test(robots));
check('robots.txt has no bot-specific Disallow', !/Disallow/.test(robots));

// --- FBL1N ---
const fbl1n = await readFile(r('tcodes/FBL1N/index.html'), 'utf8');
check('FBL1N mentions F0712', fbl1n.includes('F0712'));
check('FBL1N mentions Manage Supplier Line Items', fbl1n.includes('Manage Supplier Line Items'));
check('FBL1N mentions rebuilding saved layouts', /rebuild/i.test(fbl1n) && /layout/i.test(fbl1n));
check('FBL1N does not mention FBL3H', !fbl1n.includes('FBL3H'));
check('FBL1N does not mention Gemini or other AI tools', !/gemini/i.test(fbl1n));
check('FBL1N does not say "post-migration"', !/post-migration/i.test(fbl1n));
check('FBL1N does not say "hard-blocked"', !/hard-blocked/i.test(fbl1n));

// --- pending sample: BD_GEN_GRCP (replaced, pending, no named successor) ---
const pending = await readFile(r('tcodes/BD_GEN_GRCP/index.html'), 'utf8');
check('BD_GEN_GRCP shows the machine-parsed/under-review note', /Machine-parsed from the SAP Simplification List/.test(pending));
check('BD_GEN_GRCP does not fabricate a successor', /not yet.*confirmed/i.test(pending));

// --- deleted+reviewed sample: COMP ---
const deleted = await readFile(r('tcodes/COMP/index.html'), 'utf8');
check('COMP shows its reviewed delta_note', deleted.includes('line-wrap fragment'));

// --- no page anywhere says "post-migration" ---
let postMigrationHits = 0;
for (const dir of dirs) {
  const html = await readFile(r(`tcodes/${dir.name}/index.html`), 'utf8');
  if (/post-migration/i.test(html)) postMigrationHits++;
}
check('no generated t-code page says "post-migration"', postMigrationHits === 0);

console.log(`\n${problems === 0 ? '  ✅ ALL TCODES CHECKS PASSED' : '  ❌ ' + problems + ' problem(s) found'}`);
process.exit(problems ? 1 : 0);
```

- [ ] **Step 2: Run it**

```bash
npm run build && node build/verify-tcodes.mjs
```
Expected: `✅ ALL TCODES CHECKS PASSED`, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add build/verify-tcodes.mjs
git commit -m "Add structural verification script for the t-code section"
```

---

## Task 14: Add tcode pages to the overflow audit

**Files:**
- Modify: `build/check.mjs`

- [ ] **Step 1: Extend the `PAGES` array**

In `build/check.mjs`, change:

```js
const PAGES = ['/', '/toolkits', '/how-it-works', '/about', '/faq', '/free-kit', '/contact', '/blog', '/legal/terms-of-sale'];
```

to:

```js
const PAGES = ['/', '/toolkits', '/how-it-works', '/about', '/faq', '/free-kit', '/contact', '/blog', '/legal/terms-of-sale', '/tcodes', '/tcodes/FBL1N', '/tcodes/BD_GEN_GRCP', '/tcodes/COMP'];
```

- [ ] **Step 2: Run it against the local server**

```bash
npm run build
npm run serve &
sleep 1
node build/check.mjs
```
Expected: no `⚠ OVERFLOW` lines for any `/tcodes*` path, mobile or
desktop. Stop the server afterwards: `kill %1`.

- [ ] **Step 3: Commit**

```bash
git add build/check.mjs
git commit -m "Add t-code pages to the overflow audit"
```

---

## Task 15: Full build, verification, and review pack

No new files — this is the final checkpoint before asking the user for
the OK to push, per this repo's standing rule (never push without
explicit instruction).

- [ ] **Step 1: Full clean build**

```bash
cd /Users/vasanttank/Documents/TavrenWS
npm run build
```
Expected: build script's own log line, e.g. `✓ built N pages + sitemap.xml + llms.txt`, with `N` up by 829 versus the pre-tcodes baseline.

- [ ] **Step 2: Run both verification scripts**

```bash
node build/verify-tcodes.mjs
node build/verify-catalogue.mjs   # confirms the tcodes work didn't disturb the existing 24-button catalogue (requires: npm run serve running separately)
```

- [ ] **Step 3: Run the unit test suite**

```bash
npm test
```
Expected: all `tcode-lib.mjs` tests pass (18+ tests from Tasks 1–6).

- [ ] **Step 4: Gather the review pack**

```bash
echo "Total pages: $(find tcodes -mindepth 1 -maxdepth 1 -type d | wc -l) code pages + 1 hub"
echo "Sample URLs:"
echo "  http://localhost:4321/tcodes/FBL1N"
echo "  http://localhost:4321/tcodes/BD_GEN_GRCP   (pending, replaced, no named successor)"
echo "  http://localhost:4321/tcodes/COMP           (deleted, reviewed)"
git diff HEAD~<N> -- llms.txt   # llms.txt diff for the user to review, N = number of commits back to before Task 11
```

- [ ] **Step 5: Present to the user, wait for explicit OK, then commit any stragglers and stop short of push**

Do not run `git push`. Report the review pack (page count, 3 sample URLs,
llms.txt diff) to the user and wait for their explicit "OK, push" before
running `git push`.

---

## Self-review notes

- **Spec coverage:** every numbered section of the approved design doc
  (`docs/superpowers/specs/2026-07-14-tcodes-section-design.md`) maps to a
  task: §2 architecture → Tasks 1, 7, 8; §3 per-code page → Tasks
  1–6, 8; §4 hub → Task 9, 10; §5 plumbing → Tasks 11, 12; §6
  verification → Tasks 13, 14, 15. The mid-turn static-crawlable-links
  requirement is Task 9's "Browse by module" section.
- **FBL1N requirement (Step 4 of the original brief):** directly asserted
  in Task 13's verification script, using the real record's exact
  `delta_note` text as the fixture in Task 4's tests.
- **No placeholders:** every step above has real, runnable code or an
  exact shell command with an expected result — none deferred to "later."
- **Type/name consistency check:** `TcodeRecord` field names (`tcode`,
  `module`, `status`, `replacement`, `replacement_type`, `fiori_app_id`,
  `sap_reference`, `delta_note`, `review_status`, `source_item`) are used
  identically across Tasks 1–9 — verified against the actual dataset
  sample, not assumed.
