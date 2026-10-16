// Vercel ignoreCommand semantics: 0 skips a deployment; 1 permits the build.
// No network, downloads, writes, credentials or application dependencies.
const fs = require('node:fs'), path = require('node:path');
const { createHash } = require('node:crypto');

function verifyDistribution(root, manifest, read = fs.readFileSync) {
  if (manifest?.version !== 1 || !Array.isArray(manifest.resources) || !manifest.resources.length) throw new Error('INVALID_ORIGINALS_LOCK');
  const publicRoot = path.resolve(root, 'public'), seen = new Set(), issues = [];
  for (const entry of manifest.resources) {
    if (typeof entry.path !== 'string' || !entry.path.startsWith('/') || /[\\\x00-\x1f:?#]/.test(entry.path)
      || entry.path.slice(1).split('/').some(part => !part || part === '.' || part === '..')
      || seen.has(entry.path) || !/^[a-f0-9]{64}$/.test(entry.sha256 || '') || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0) throw new Error('INVALID_ORIGINALS_LOCK');
    seen.add(entry.path);
    const target = path.resolve(publicRoot, '.' + entry.path);
    if (!target.startsWith(publicRoot + path.sep)) throw new Error('INVALID_ORIGINALS_LOCK');
    try {
      const bytes = read(target);
      if (bytes.length !== entry.bytes || createHash('sha256').update(bytes).digest('hex') !== entry.sha256) issues.push({ path: entry.path, reason: 'changed' });
    } catch { issues.push({ path: entry.path, reason: 'unavailable' }); }
  }
  return { checked: seen.size, complete: issues.length === 0, issues };
}
function deploymentDecision(root, read = fs.readFileSync) {
  try {
    const manifest = JSON.parse(read(path.join(root, 'scripts/original-distribution-lock.json'), 'utf8'));
    const result = verifyDistribution(root, manifest, read);
    return { ...result, exitCode: result.complete ? 1 : 0 };
  } catch { return { checked: 0, complete: false, issues: [{ reason: 'invalid-or-missing-lock' }], exitCode: 0 }; }
}
if (require.main === module) {
  const result = deploymentDecision(path.resolve(__dirname, '..'));
  console.log(result.complete
    ? `ORIGINALS_OK: ${result.checked} resources match their archived hashes; continuing build.`
    : `ORIGINALS_REQUIRED: skipping this deployment (${result.issues.length} missing, changed or unverified resources). Use the verified workspace with the original distribution.`);
  process.exitCode = result.exitCode;
}
module.exports = { verifyDistribution, deploymentDecision };
