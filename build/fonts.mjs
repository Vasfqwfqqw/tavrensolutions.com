// Font pipeline: subset the supplied Red Hat .ttf files to a Latin character set
// and emit woff2 into assets/fonts/.
//
//  - Red Hat Display / Text : keep the variable `wght` axis (one file covers all weights),
//    so we ship two small variable woff2 files instead of six static ones.
//  - Red Hat Mono           : only Regular (400) is used, so we ship the static weight.
//
// Requires fonttools + brotli (Python). Run:  npm run fonts
import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = `${ROOT}assets`;
const OUT = `${ROOT}assets/fonts`;
mkdirSync(OUT, { recursive: true });

// Google Fonts "latin" subset unicode range — covers Western European text + common punctuation/symbols.
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,' +
  'U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

const jobs = [
  {
    in: `${SRC}/Red_Hat_Display font/RedHatDisplay-VariableFont_wght.ttf`,
    out: `${OUT}/RedHatDisplay-latin.woff2`,
    variable: true,
  },
  {
    in: `${SRC}/Red_Hat_Text/RedHatText-VariableFont_wght.ttf`,
    out: `${OUT}/RedHatText-latin.woff2`,
    variable: true,
  },
  {
    in: `${SRC}/Red_Hat_Mono/static/RedHatMono-Regular.ttf`,
    out: `${OUT}/RedHatMono-Regular-latin.woff2`,
    variable: false,
  },
];

function python() {
  // Prefer a python that has fontTools; fall back to python3.
  for (const cmd of ['python3', 'python']) {
    const r = spawnSync(cmd, ['-c', 'import fontTools'], { stdio: 'ignore' });
    if (r.status === 0) return cmd;
  }
  throw new Error('fonttools not found. Install with: pip install fonttools brotli');
}

const PY = python();
let failed = false;

for (const j of jobs) {
  if (!existsSync(j.in)) {
    console.error(`  ✗ missing source: ${j.in}`);
    failed = true;
    continue;
  }
  const args = [
    '-m',
    'fontTools.subset',
    j.in,
    `--unicodes=${LATIN}`,
    '--layout-features=*', // keep kerning, ligatures, etc.
    '--flavor=woff2',
    `--output-file=${j.out}`,
  ];
  // Note: pyftsubset retains the variable `wght` axis automatically (we never pass
  // --instance), so each variable woff2 still serves every weight in the design.
  const r = spawnSync(PY, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) {
    console.error(`  ✗ ${j.out}\n${r.stderr?.toString() || ''}`);
    failed = true;
    continue;
  }
  const kb = (statSync(j.out).size / 1024).toFixed(1);
  console.log(`  ✓ ${j.out.replace(ROOT, '')}  (${kb} KB)`);
}

if (failed) process.exit(1);
console.log('\n  Fonts subset complete.\n');
