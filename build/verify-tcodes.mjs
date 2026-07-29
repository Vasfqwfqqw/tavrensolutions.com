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

// --- pending sample: chosen dynamically (a still-pending record with no named
// successor). Robust to review_status flips as codes get resolved over time. ---
const pendingRec = dataset.records.find((x) => x.review_status !== 'reviewed');
if (!pendingRec) {
  check('a pending sample record exists to verify the hedge', false);
} else {
  const pending = await readFile(r(`tcodes/${pendingRec.tcode}/index.html`), 'utf8');
  check(`${pendingRec.tcode} (pending) shows the machine-parsed/under-review note`, /Machine-parsed from the SAP Simplification List/.test(pending));
  check(`${pendingRec.tcode} (pending) does not fabricate a successor`, /not yet.*confirmed/i.test(pending));
}

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
