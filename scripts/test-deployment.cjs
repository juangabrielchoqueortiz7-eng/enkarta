const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const path = require('node:path');
const { verifyDistribution, deploymentDecision } = require('./vercel-originals-guard.cjs');
const root = path.resolve(__dirname, '..'), bytes = Buffer.from('synthetic original only');
const entry = { path: '/synthetic/original.json', sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
const manifest = { version: 1, resources: [entry] };
const reader = file => file.endsWith('original-distribution-lock.json') ? JSON.stringify(manifest) : bytes;

test('complete original bytes permit a Vercel build with exit code 1', () => {
  assert.deepEqual(deploymentDecision(root, reader), { checked: 1, complete: true, issues: [], exitCode: 1 });
});
test('missing or changed originals skip deployment instead of replacing production', () => {
  for (const read of [() => { throw new Error('missing'); }, () => Buffer.from('changed')]) {
    assert.equal(verifyDistribution(root, manifest, read).complete, false);
    assert.equal(deploymentDecision(root, file => file.endsWith('original-distribution-lock.json') ? JSON.stringify(manifest) : read(file)).exitCode, 0);
  }
});
test('an absent, malformed or empty lock always skips, including unexpected read errors', () => {
  for (const read of [() => { throw new Error('read failure'); }, () => 'invalid-json', () => JSON.stringify({version:1,resources:[]})]) assert.equal(deploymentDecision(root,read).exitCode,0);
});
test('lock rejects traversal, absolute paths, ambiguity and invalid hashes', () => {
  for (const value of ['/../outside', '/folder/../../outside', '//absolute', '/C:/outside', '/folder\\outside', '/a?b', '/a#b']) assert.throws(() => verifyDistribution(root,{...manifest,resources:[{...entry,path:value}]},reader),/INVALID_ORIGINALS_LOCK/);
  assert.throws(() => verifyDistribution(root,{...manifest,resources:[entry,entry]},reader),/INVALID_ORIGINALS_LOCK/);
  assert.throws(() => verifyDistribution(root,{...manifest,resources:[{...entry,sha256:'forged'}]},reader),/INVALID_ORIGINALS_LOCK/);
});
test('Vercel configuration actually invokes the originals guard', () => {
  assert.equal(require('../vercel.json').ignoreCommand,'node scripts/vercel-originals-guard.cjs');
});
