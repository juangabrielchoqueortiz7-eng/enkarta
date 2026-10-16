// Verify original public resource bytes against the archived SHA-256 manifests.
// GET only; never writes assets or modifies an invitation.
const fs = require('node:fs'), path = require('node:path');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const base = String(process.argv[2] || 'https://enkarta.vercel.app').replace(/\/$/, '');
const root = path.resolve(__dirname, '..');
const reportIndex = process.argv.indexOf('--report');
const reportPath = reportIndex < 0 ? null : process.argv[reportIndex + 1];
const sourceFiles = ['public/invitali-originales.json', ...fs.readdirSync(path.join(root, 'Iconos INVITALI'))
  .filter(name => name.endsWith('-recursos.json')).map(name => `Iconos INVITALI/${name}`)];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const assets = new Map();
const report = { checkedAt: new Date().toISOString(), base, resources: [], passed: false };
async function main() {
  for (const file of sourceFiles) {
    const rows = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    assert.ok(Array.isArray(rows), `Invalid archive manifest ${file}`);
    for (const item of rows) {
      if (!item.localPath || !item.sha256) continue;
      assert.match(item.sha256, /^[a-f0-9]{64}$/i);
      assert.ok(item.localPath.startsWith('/'), 'Public resource path must be absolute');
      const localFile = path.resolve(root, 'public', `.${item.localPath}`);
      assert.ok(localFile.startsWith(path.join(root, 'public') + path.sep), 'Public resource traversal denied');
      assert.equal(sha(fs.readFileSync(localFile)), item.sha256, `Local original differs: ${item.localPath}`);
      if (assets.has(item.localPath)) assert.equal(assets.get(item.localPath), item.sha256, 'Ambiguous archived original');
      assets.set(item.localPath, item.sha256);
    }
  }
  const queue = [...assets];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (cursor < queue.length) {
      const [resource, expected] = queue[cursor++];
      let response;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await fetch(new URL(resource, base), { redirect: 'manual', signal: AbortSignal.timeout(30000) });
          if (response.ok || response.status < 500) break;
          await response.body?.cancel();
        } catch (error) { if (attempt === 1) throw new Error(`Resource connection failed: ${resource}`); }
      }
      assert.ok(response?.ok, `Resource HTTP ${response?.status}: ${resource}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(sha(bytes), expected, `Deployed original differs: ${resource}`);
      report.resources.push({ path: resource, sha256: expected, bytes: bytes.length, passed: true });
    }
  });
  const results = await Promise.allSettled(workers);
  const failed = results.find(result => result.status === 'rejected');
  if (failed) throw failed.reason;
  assert.equal(report.resources.length, assets.size);
  report.resources.sort((a, b) => a.path.localeCompare(b.path));
  report.passed = true;
  console.log(`OK: ${assets.size} original resources match their archived SHA-256 in production (${report.resources.reduce((sum, item) => sum + item.bytes, 0)} bytes)`);
}
main().catch(error => { report.failure = error.message; console.error(`FAIL: ${error.message}`); process.exitCode = 1; }).finally(() => {
  if (reportPath) { const target = path.resolve(reportPath); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n'); }
});
