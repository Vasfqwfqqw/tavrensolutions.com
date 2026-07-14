import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadDataset, assertValidTcode } from '../build/tcode-lib.mjs';

test('loadDataset reads the vendored dataset', async () => {
  const data = await loadDataset(new URL('../data/s4hana-tcode-dataset.json', import.meta.url));
  assert.equal(data.records.length, 828);
  assert.equal(data.version, '1.1.1');
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

import { buildFirstParagraph } from '../build/tcode-lib.mjs';

test('buildFirstParagraph returns the delta_note verbatim for reviewed records', () => {
  const fbl1n = {
    tcode: 'FBL1N', status: 'changed', review_status: 'reviewed',
    replacement: 'Manage Supplier Line Items (Fiori app)', fiori_app_id: 'F0712',
    delta_note: 'Your day-to-day vendor line item list keeps working after conversion, but SAP\'s direction is the Manage Supplier Line Items app (SAP now says Supplier, not Vendor). The app swaps the classic selection screen for filter bars and builds in actions like blocking and paying, and your saved FBL1N layouts will not come across, so plan to rebuild them.',
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
