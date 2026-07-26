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
    sourceEdition: json.source_edition,
    recordCount: json.record_count,
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

// Verified exhaustive against the 29 distinct `module` values in
// data/s4hana-tcode-dataset.json v1.1.1. Business-friendly labels — the
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
  const friendly = Object.prototype.hasOwnProperty.call(MODULE_LABELS, moduleCode) ? MODULE_LABELS[moduleCode] : null;
  return friendly ? `${friendly} (${moduleCode})` : moduleCode;
}

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

function buildCitation(record) {
  if (!record.sap_reference) return null;
  if (record.source_item && !record.sap_reference.includes(String(record.source_item))) {
    return `${record.sap_reference} (item ${record.source_item})`;
  }
  return record.sap_reference;
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

export function buildSiblingLinks(record, allRecords, max = 6) {
  const sameModule = allRecords.filter((r) => r.module === record.module && r.tcode !== record.tcode);
  sameModule.sort((a, b) => {
    if (a.review_status === b.review_status) return 0;
    return a.review_status === 'reviewed' ? -1 : 1;
  });
  return sameModule.slice(0, max).map((r) => ({ tcode: r.tcode, status: r.status }));
}
