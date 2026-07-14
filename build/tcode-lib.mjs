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
  const friendly = MODULE_LABELS[moduleCode];
  return friendly ? `${friendly} (${moduleCode})` : moduleCode;
}
