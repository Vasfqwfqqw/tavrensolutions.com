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
