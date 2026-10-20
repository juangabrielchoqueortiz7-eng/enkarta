// Explicit opt-in native PostgreSQL proof. No .env, Supabase, service accounts,
// downloads, existing PostgreSQL services or external network are used.
// Two independent psql sessions run READ COMMITTED (the HTTP API default).
const fs = require('node:fs'), path = require('node:path'), net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto'), assert = require('node:assert/strict');
const { test, before, beforeEach, afterEach, after } = require('node:test');
const root = path.resolve(__dirname, '..'), tmpRoot = path.join(root, 'tmp'), reportDir = path.join(tmpRoot, 'partner-draft-concurrency');
const enabled = process.argv.includes('--local-postgres');
function findBin() {
  if (process.env.ENKARTA_TEST_POSTGRES_BIN) return path.resolve(process.env.ENKARTA_TEST_POSTGRES_BIN);
  if (process.platform === 'win32') {
    const base = 'C:/Program Files/PostgreSQL';
    if (!fs.existsSync(base)) return null;
    for (const version of fs.readdirSync(base).sort((a, b) => Number(b) - Number(a))) { const candidate = path.join(base, version, 'bin'); if (fs.existsSync(path.join(candidate, 'initdb.exe'))) return candidate; }
  }
  try { return execFileSync('pg_config', ['--bindir'], { windowsHide: true, encoding: 'utf8' }).trim(); } catch { return null; }
}
const bin = enabled ? findBin() : null, suffix = process.platform === 'win32' ? '.exe' : '';
const executable = name => path.join(bin, name + suffix);
const owner = '20000000-0000-4000-8000-000000000001', otherOwner = '20000000-0000-4000-8000-000000000002';
let clusterDir, dataDir, port, started = false, ownedServer, serverLog, serverExit;
const serverState = { exited: false, code: null, error: null };
const scopeId = randomUUID(), sessions = new Set(), env = { ...process.env };
// Never allow connection defaults inherited from a different database/session.
for (const key of Object.keys(env)) if (/^PG[A-Z_]+$/.test(key)) delete env[key];
env.PGCONNECT_TIMEOUT = '2';
const report = { scopeId, enabled, isolation: 'READ COMMITTED', checks: [], races: [], productionCalls: 0, existingServicesTouched: 0, downloads: 0, cleanup: 'not-started' };
const save = () => { fs.mkdirSync(reportDir, { recursive: true }); fs.writeFileSync(path.join(reportDir, 'result.json'), JSON.stringify(report, null, 2) + '\n'); };
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function command(file, args, input = '', timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); let stdout = '', stderr = '', timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    child.stdout.on('data', bytes => { stdout += bytes; }); child.stderr.on('data', bytes => { stderr += bytes; }); child.once('error', error => { clearTimeout(timeout); reject(error); });
    // pg_ctl's background postmaster can inherit pipe handles on Windows. Its
    // own exit is the completion barrier; do not wait for the server to close them.
    child.once('exit', code => { clearTimeout(timeout); child.stdout.destroy(); child.stderr.destroy(); if (timedOut) reject(Error('Bounded local PostgreSQL command timed out: ' + path.basename(file))); else resolve({ code, stdout, stderr }); }); child.stdin.end(input);
  });
}
function openSession(sql = '', end = false) {
  assert.equal(started, true); assert.ok(port > 1024 && port < 65536);
  const child = spawn(executable('psql'), ['-X', '-q', '-A', '-t', '-h', '127.0.0.1', '-p', String(port), '-U', 'enkarta_test', '-d', 'postgres', '--no-password', '-v', 'ON_ERROR_STOP=1'], { env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const state = { child, stdout: '', stderr: '', closed: false, code: null };
  const timeout = setTimeout(() => child.kill(), 30000);
  state.done = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', code => { clearTimeout(timeout); state.closed = true; state.code = code; sessions.delete(state); resolve(state); }); });
  child.stdout.on('data', value => { state.stdout += value; }); child.stderr.on('data', value => { state.stderr += value; }); sessions.add(state);
  if (end) child.stdin.end(sql); else if (sql) child.stdin.write(sql);
  state.wait = async marker => { const until = Date.now() + 10000; while (!state.stdout.includes(marker)) { if (state.closed) throw Error('Local psql session ended before barrier: ' + state.stderr); assert.ok(Date.now() < until, 'Local psql barrier timed out'); await delay(15); } return state.stdout; };
  return state;
}
async function closeSessions() {
  const pending = [...sessions];
  for (const state of pending) { state.child.stdin.destroy(); state.child.kill(); }
  let timer;
  try { await Promise.race([Promise.allSettled(pending.map(state => state.done)), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Local psql clients did not close during cleanup')), 5000); })]); }
  finally { clearTimeout(timer); }
}
async function sql(query, allowFailure = false) {
  const result = await openSession(query, true).done;
  if (!allowFailure) assert.equal(result.code, 0, result.stderr);
  return result;
}
async function scalar(query) { return (await sql(query)).stdout.trim().split(/\r?\n/).filter(Boolean).at(-1); }
const insert = (slug, partner = owner, packageKey = 'plus') => `INSERT INTO public.invitations(slug,partner_id,builder_config) VALUES('${slug}','${partner}','{"package":"${packageKey}"}'::jsonb);`;
async function seed(count = 11, partner = owner, packageKey = 'plus') { await sql(`INSERT INTO public.invitations(slug,partner_id,builder_config) SELECT 'qa-seed-'||n||'-${partner}','${partner}','{"package":"${packageKey}"}'::jsonb FROM generate_series(1,${count})n;`); }
function backendPid(state) {
  const value = Number(state.stdout.match(/PID=(\d+)/)?.[1]); assert.ok(Number.isSafeInteger(value) && value > 0, 'Expected a positive backend PID'); return value;
}
async function blocked(applicationName, firstPid, secondPid) {
  assert.notEqual(firstPid, secondPid);
  const until = Date.now() + 10000;
  while (Date.now() < until) {
    const value = await scalar(`SELECT count(*) FROM pg_catalog.pg_stat_activity WHERE pid=${secondPid} AND application_name='${applicationName}' AND wait_event_type='Lock' AND state='active' AND ${firstPid}=ANY(pg_catalog.pg_blocking_pids(${secondPid}));`);
    if (value === '1') return { firstBackendPid: firstPid, secondBackendPid: secondPid, exactBlockingPidObserved: true }; await delay(25);
  }
  throw Error('Independent second PostgreSQL session did not reach the expected lock wait');
}
function ownedCluster() {
  assert.ok(clusterDir && fs.existsSync(clusterDir));
  const actual = fs.realpathSync(clusterDir), intended = path.resolve(clusterDir), allowed = fs.realpathSync(tmpRoot);
  assert.equal(actual.toLowerCase(), intended.toLowerCase());
  const relative = path.relative(allowed, actual); assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
  assert.ok(path.basename(actual).startsWith('partner-draft-pg-'));
  const marker = JSON.parse(fs.readFileSync(path.join(actual, 'enkarta-test-cluster.json'), 'utf8')); assert.equal(marker.scopeId, scopeId); assert.equal(marker.path, intended);
  return actual;
}
before(async () => {
  if (!enabled) return;
  assert.ok(bin && ['postgres', 'pg_ctl', 'initdb', 'psql', 'pg_isready'].every(name => fs.existsSync(executable(name))), 'Native PostgreSQL binaries unavailable; use ENKARTA_TEST_POSTGRES_BIN');
  fs.mkdirSync(tmpRoot, { recursive: true }); clusterDir = fs.mkdtempSync(path.join(tmpRoot, 'partner-draft-pg-')); dataDir = path.join(clusterDir, 'data');
  fs.writeFileSync(path.join(clusterDir, 'enkarta-test-cluster.json'), JSON.stringify({ scopeId, path: path.resolve(clusterDir) })); ownedCluster();
  report.postgresVersion = execFileSync(executable('postgres'), ['--version'], { windowsHide: true, encoding: 'utf8' }).trim(); save();
  const initialized = await command(executable('initdb'), ['-D', dataDir, '-U', 'enkarta_test', '-A', 'trust', '--no-locale', '-E', 'UTF8'], '', 120000); assert.equal(initialized.code, 0, initialized.stderr);
  port = await new Promise((resolve, reject) => { const probe = net.createServer(); probe.once('error', reject); probe.listen(0, '127.0.0.1', () => { const assigned = probe.address().port; probe.close(error => error ? reject(error) : resolve(assigned)); }); });
  // Keep the postmaster as our direct, non-detached child. In particular, do
  // not inherit pg_ctl's Windows background-process handles into test pipes.
  serverLog = fs.openSync(path.join(clusterDir, 'postgres.log'), 'a');
  ownedServer = spawn(executable('postgres'), ['-D', dataDir, '-h', '127.0.0.1', '-p', String(port), '-c', 'fsync=off', '-c', 'synchronous_commit=off', '-c', 'statement_timeout=15000', '-c', 'lock_timeout=8000', '-c', 'idle_in_transaction_session_timeout=15000'], { env, windowsHide: true, detached: false, stdio: ['ignore', serverLog, serverLog] });
  serverExit = new Promise(resolve => {
    ownedServer.once('error', error => { serverState.error = error.message; serverState.exited = true; resolve(); });
    ownedServer.once('exit', code => { serverState.code = code; serverState.exited = true; resolve(); });
  });
  fs.writeFileSync(path.join(clusterDir, 'enkarta-test-cluster.json'), JSON.stringify({ scopeId, path: path.resolve(clusterDir), dataDir: path.resolve(dataDir), harnessPid: process.pid, serverPid: ownedServer.pid }));
  report.startup = 'waiting-for-own-postmaster'; save();
  const readyBy = Date.now() + 30000;
  while (true) {
    assert.equal(serverState.exited, false, serverState.error || 'Owned PostgreSQL exited during startup');
    const ready = await command(executable('pg_isready'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'enkarta_test', '-d', 'postgres', '-t', '1'], '', 3000);
    if (ready.code === 0) break;
    assert.ok(Date.now() < readyBy, 'Owned PostgreSQL startup readiness timed out'); await delay(100);
  }
  assert.equal(serverState.exited, false, 'Owned PostgreSQL must remain alive after readiness');
  started = true;
  // Releasing the port probe is inherently racy. Before any schema/data write,
  // prove that the server answering psql owns this exact isolated data directory.
  const connectedDataDir = await scalar('SHOW data_directory;');
  assert.equal(fs.realpathSync(connectedDataDir).toLowerCase(), fs.realpathSync(dataDir).toLowerCase(), 'Connected PostgreSQL is not the owned test cluster');
  assert.equal(serverState.exited, false, 'Owned PostgreSQL exited during connection verification');
  report.startup = 'ready'; report.connectedDataDirectoryMatchesOwnedCluster = true; save();
  const read = file => fs.readFileSync(path.join(root, 'migrations', file), 'utf8');
  const first = read('001_create_invitations.sql').replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";', '');
  const migration = read('021_partner_draft_creation.sql');
  await sql('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE FUNCTION public.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS $$SELECT gen_random_uuid()$$;\n' + first + '\nALTER TABLE invitations ADD COLUMN builder_config jsonb;\n' + read('013_partner_subscriptions.sql') + '\nGRANT USAGE ON SCHEMA public TO anon,authenticated,service_role; GRANT SELECT,INSERT,UPDATE,DELETE ON invitations TO service_role;\n' + migration + '\n' + migration);
});
beforeEach(async () => {
  if (!enabled) return;
  await sql(`TRUNCATE public.invitations,public.partners CASCADE; INSERT INTO public.partners(id,email) VALUES('${owner}','qa-owner@example.invalid'),('${otherOwner}','qa-other@example.invalid'); INSERT INTO public.partner_subscriptions(partner_id,plan_key,status) VALUES('${owner}','inicio','active'),('${otherOwner}','estudio','active');`);
});
afterEach(async () => { if (enabled) await closeSessions(); });
after(async () => {
  if (!enabled) return;
  try {
    await closeSessions();
    if (dataDir && fs.existsSync(dataDir)) {
      ownedCluster();
      const pidFile = path.join(dataDir, 'postmaster.pid');
      if (fs.existsSync(pidFile)) {
        const lines = fs.readFileSync(pidFile, 'utf8').split(/\r?\n/); assert.equal(path.resolve(lines[1]).toLowerCase(), path.resolve(dataDir).toLowerCase());
        assert.equal(Number(lines[0]), ownedServer?.pid, 'Cluster PID must match the direct child before stopping it');
      }
      if (ownedServer && !serverState.exited) {
        let result;
        try { result = await command(executable('pg_ctl'), ['-D', dataDir, '-m', 'fast', '-w', '-t', '5', 'stop'], '', 10000); }
        catch { /* The fallback can target only the ChildProcess this harness spawned. */ }
        report.shutdown = result?.code === 0 ? 'pg-ctl-fast' : 'own-child-termination';
        if (!serverState.exited && result?.code !== 0) ownedServer.kill();
        const stoppedBy = Date.now() + 10000;
        while (!serverState.exited && Date.now() < stoppedBy) await delay(25);
        assert.equal(serverState.exited, true, 'Owned PostgreSQL child is still alive; cluster preserved'); await serverExit;
      }
      if (ownedServer) { assert.equal(serverState.exited, true); report.server = 'stopped'; }
      started = false;
    }
    if (serverLog !== undefined) { fs.closeSync(serverLog); serverLog = undefined; }
    if (clusterDir && fs.existsSync(clusterDir)) { const actual = ownedCluster(); fs.rmSync(actual, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); assert.equal(fs.existsSync(actual), false); report.cleanup = 'own-cluster-stopped-and-removed'; }
  } catch (error) { report.cleanup = 'failed'; report.cleanupFailure = error.message; throw error; }
  finally { report.completedAt = new Date().toISOString(); save(); }
});
const nativeTest = (name, work) => test(name, { skip: !enabled }, async () => { await work(); report.checks.push(name); save(); });

nativeTest('021 is reappliable in native PostgreSQL and its readiness is true', async () => {
  assert.equal(await scalar('SELECT public.enkarta_partner_draft_creation_ready();'), 't'); assert.equal(await scalar("SELECT count(*) FROM pg_catalog.pg_trigger WHERE tgname='enkarta_guard_partner_draft_creation' AND NOT tgisinternal;"), '1');
});
nativeTest('two independent READ COMMITTED sessions at 11/12 serialize on the owner and finish at 12, never 13', async () => {
  await seed();
  const first = openSession(`SET application_name='enkarta-qa-draft-a'; BEGIN ISOLATION LEVEL READ COMMITTED; SET ROLE service_role; SELECT 'PID='||pg_backend_pid(); ${insert('qa-race-first')}\n\\echo FIRST_INSERTED\n`);
  await first.wait('FIRST_INSERTED'); const second = openSession(`SET application_name='enkarta-qa-draft-b'; BEGIN ISOLATION LEVEL READ COMMITTED; SET ROLE service_role; SELECT 'PID='||pg_backend_pid(); ${insert('qa-race-second')} COMMIT;\n`, true);
  await second.wait('PID='); const barrier = await blocked('enkarta-qa-draft-b', backendPid(first), backendPid(second)); first.child.stdin.end('COMMIT;\n\\q\n'); const [a, b] = await Promise.all([first.done, second.done]);
  assert.equal(a.code, 0, a.stderr); assert.notEqual(b.code, 0); assert.match(b.stderr, /DRAFT_QUOTA_REACHED/); assert.equal(await scalar(`SELECT count(*) FROM invitations WHERE partner_id='${owner}';`), '12');
  report.races.push({ isolation: 'READ COMMITTED', ...barrier, independentBackendPids: true, secondLockWaitObservedBeforeCommit: true, first: 'committed', second: 'DRAFT_QUOTA_REACHED', finalCount: 12 });
});
nativeTest('a waiting INSERT validates the current plan after the owner lock is released', async () => {
  const first = openSession(`SET application_name='enkarta-qa-plan-a'; BEGIN ISOLATION LEVEL READ COMMITTED; SELECT 'PID='||pg_backend_pid(); SELECT id FROM partners WHERE id='${owner}' FOR UPDATE; UPDATE partner_subscriptions SET plan_key='estudio' WHERE partner_id='${owner}';\n\\echo PLAN_UPDATED\n`);
  await first.wait('PLAN_UPDATED'); const second = openSession(`SET application_name='enkarta-qa-plan-b'; BEGIN ISOLATION LEVEL READ COMMITTED; SET ROLE service_role; SELECT 'PID='||pg_backend_pid(); ${insert('qa-plan-old-package')} COMMIT;\n`, true);
  await second.wait('PID='); const barrier = await blocked('enkarta-qa-plan-b', backendPid(first), backendPid(second)); first.child.stdin.end('COMMIT;\n\\q\n'); const [a, b] = await Promise.all([first.done, second.done]);
  assert.equal(a.code, 0, a.stderr); assert.notEqual(b.code, 0); assert.match(b.stderr, /DRAFT_PLAN_CHANGED/); assert.equal(await scalar(`SELECT count(*) FROM invitations WHERE partner_id='${owner}';`), '0');
  await sql(insert('qa-plan-current-package', owner, 'premium'));
  report.races.push({ isolation: 'READ COMMITTED', ...barrier, secondLockWaitObservedBeforeCommit: true, first: 'plan-changed-and-committed', second: 'DRAFT_PLAN_CHANGED', oldPackageRows: 0, currentPackageAccepted: true });
});
nativeTest('rolling back the owner lock and inserted draft releases the remaining slot', async () => {
  await seed(); await sql('BEGIN ISOLATION LEVEL READ COMMITTED; ' + insert('qa-rolled-back') + ' ROLLBACK;'); await sql(insert('qa-after-rollback'));
  assert.equal(await scalar(`SELECT count(*) FROM invitations WHERE partner_id='${owner}';`), '12'); assert.equal(await scalar("SELECT count(*) FROM invitations WHERE slug='qa-rolled-back';"), '0');
});
nativeTest('an owner lock does not serialize creation for another independent owner', async () => {
  await seed(); const first = openSession(`BEGIN ISOLATION LEVEL READ COMMITTED; ${insert('qa-owner-held')}\n\\echo OWNER_HELD\n`); await first.wait('OWNER_HELD');
  const second = await sql(insert('qa-other-owner', otherOwner, 'premium')); assert.equal(second.code, 0); assert.equal(await scalar(`SELECT count(*) FROM invitations WHERE partner_id='${otherOwner}';`), '1');
  first.child.stdin.end('ROLLBACK;\n\\q\n'); assert.equal((await first.done).code, 0);
});
nativeTest('a multirow INSERT cannot consume the last slot partially', async () => {
  await seed(); const result = await sql(`INSERT INTO invitations(slug,partner_id,builder_config) VALUES('qa-batch-one','${owner}','{"package":"plus"}'),('qa-batch-two','${owner}','{"package":"plus"}');`, true);
  assert.notEqual(result.code, 0); assert.match(result.stderr, /DRAFT_QUOTA_REACHED/); assert.equal(await scalar(`SELECT count(*) FROM invitations WHERE partner_id='${owner}';`), '11');
});
nativeTest('new owner assignment respects its cap while same-owner edits remain valid', async () => {
  await seed(12); await sql("INSERT INTO invitations(slug,builder_config) VALUES('qa-free-team','{\"package\":\"plus\"}');");
  const rejected = await sql(`UPDATE invitations SET partner_id='${owner}' WHERE slug='qa-free-team';`, true); assert.notEqual(rejected.code, 0); assert.match(rejected.stderr, /DRAFT_QUOTA_REACHED/);
  await sql(`UPDATE invitations SET partner_id=partner_id,names='QA same owner' WHERE partner_id='${owner}';`); assert.equal(await scalar("SELECT count(*) FROM invitations WHERE slug='qa-free-team' AND partner_id IS NULL;"), '1');
});
nativeTest('readiness execution is denied to anonymous/authenticated database roles', async () => {
  for (const role of ['anon', 'authenticated']) { const result = await sql('SET ROLE ' + role + '; SELECT public.enkarta_partner_draft_creation_ready();', true); assert.notEqual(result.code, 0); assert.match(result.stderr, /permission denied|permiso denegado/i); }
  assert.equal(await scalar('SET ROLE service_role; SELECT public.enkarta_partner_draft_creation_ready();'), 't');
});
