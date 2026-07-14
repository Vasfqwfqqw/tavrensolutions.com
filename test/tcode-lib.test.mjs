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
