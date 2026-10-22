// Real public page/metadata/OG modules, isolated transport and publication policy.
// No production, browser rendering, third-party downloads or real guest data.
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const { test, beforeEach } = require('node:test'), assert = require('node:assert/strict'), ts = require('typescript');
const root = path.resolve(__dirname, '..'), source = file => path.join(root, 'src', file);
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request === 'server-only') return path.join(__dirname, 'server-only.stub');
  return originalResolve.call(this, request.startsWith('@/') ? source(request.slice(2)) : request, parent, ...rest);
};
require.extensions['.ts'] = require.extensions['.tsx'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: file,
}).outputText, file);
const replace = (file, exports) => { require.cache[require.resolve(file)] = { exports }; };
replace('server-only', {});
process.env.NEXT_PUBLIC_SITE_URL = 'https://enkarta.vercel.app';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://qa-storage.supabase.co';
let row, snapshot, lookups, queries, filters, historyReads, headerReads, features, guest, previewAllowed;
const fakeComponent = name => Object.assign(function Component() {}, { displayName: name });
for (const name of ['PublishedTemplate', 'EntryGate', 'BlockRenderer', 'FontScope', 'SmartRsvp', 'InvitationAnalytics', 'PreviewCaptureController']) {
  replace(source(`components/invitations/${name}.tsx`), { __esModule: true, default: fakeComponent(name) });
}
replace(source('lib/scroll-motion.tsx'), { PageMotionProvider: fakeComponent('PageMotionProvider') });
replace('next/navigation', { notFound() { throw new Error('NEXT_NOT_FOUND'); } });
replace('next/headers', { async headers() { headerReads++; return new Headers({ host: 'attacker.example', 'x-forwarded-host': 'attacker.example' }); } });
replace('next/og', { ImageResponse: class { constructor(tree, options) { this.tree = tree; this.options = options; } } });
replace(source('lib/supabase/server.ts'), { supabaseAdmin: {
  from(table) { queries.push(table); return { select() { return this; }, eq(key, value) { filters.push([key, value]); return this; }, async single() { return { data: row, error: null }; } }; },
  rpc() { return Promise.resolve({ error: null }); },
} });
replace(source('lib/packages.ts'), { gateInvitation: x => x, resolveFeatures: () => features });
replace(source('lib/partner-session.ts'), { partnerServesInvitation: async () => true });
replace(source('lib/host-session.ts'), { canReviewInvitation: async () => previewAllowed });
replace(source('lib/guests.ts'), { findGuestByPublicId: async (...args) => { lookups.push(args); return guest; } });
replace(source('lib/package-services-server.ts'), { guestForServices: x => x });
replace(source('lib/published-invitation.ts'), {
  async latestPublishedInvitation() { historyReads++; return snapshot ? { data: structuredClone(snapshot) } : null; },
  async publicInvitationData() { return row?.status === 'ready' && row.is_active !== false ? structuredClone(snapshot) : null; },
});
const { invitationShareMetadata, invitationShareUrl, validGuestLinkId, validInvitationSlug } = require(source('lib/invitation-sharing.ts'));
const { readInvitationBySlug } = require(source('lib/public-invitation-read.ts'));
const { shareCardCoverUrl, shareCardCover, shareCardFont, shareCardAsset } = require(source('lib/share-card-assets.ts'));
const page = require(source('app/i/[slug]/page.tsx')), Og = require(source('app/i/[slug]/opengraph-image.tsx')).default;
const props = query => ({ params: Promise.resolve({ slug: 'qa-guest' }), searchParams: Promise.resolve(query || {}) });
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4s8AAAAASUVORK5CYII=', 'base64');
const renderText = value => typeof value === 'string' ? value : Array.isArray(value) ? value.map(renderText).join(' ') : value && typeof value === 'object' ? renderText(value.props?.children) : '';
beforeEach(() => {
  row = { id: '10000000-0000-4000-8000-000000000001', slug: 'qa-guest', status: 'ready', type: 'boda', names: 'QA PRIVATE DRAFT', builder_config: {}, expires_at: null };
  snapshot = { ...row, names: 'QA Publicada', config: {}, cover_image_url: '/catalog/azure.jpg', event_date: '2027-06-19' };
  features = { guestNames: true, smartRsvp: false, passes: true };
  guest = null; previewAllowed = false; queries = []; filters = []; lookups = []; historyReads = 0; headerReads = 0;
  global.fetch = async () => new Response('', { status: 404 });
});

test('canonical and OpenGraph URL name the invitation and never inherit page query flags', () => {
  const url = invitationShareUrl('qa-guest');
  assert.equal(url.href, 'https://enkarta.vercel.app/i/qa-guest');
  const meta = invitationShareMetadata('qa-guest', snapshot);
  assert.equal(meta.alternates.canonical, url.href); assert.equal(meta.openGraph.url, url.href);
  assert.equal(meta.metadataBase.origin, 'https://enkarta.vercel.app');
  assert.equal(meta.referrer, 'no-referrer'); assert.equal(meta.robots.index, false); assert.equal(meta.robots.noimageindex, true);
});

test('metadata ignores request Host, personalized guests and owner-only preview draft values', async () => {
  snapshot.config.activeGuest = { name: 'QA PRIVATE FAMILY', publicId: 'PRIVATE_TOKEN' };
  snapshot.config.guestMeta = { PRIVATE_TOKEN: { phone: '59170000000' } };
  const meta = await page.generateMetadata(props({ g: 'PRIVATE_TOKEN', preview: '1', capture: 'cover' }));
  assert.match(meta.title.absolute, /QA Publicada/); assert.match(meta.description, /2027/);
  assert.doesNotMatch(JSON.stringify(meta), /PRIVATE|59170000000|attacker|preview|capture/); assert.equal(headerReads, 0);
});

test('draft metadata stays generic even for an owner requesting private preview', async () => {
  row.status = 'draft'; previewAllowed = true;
  const meta = await page.generateMetadata(props({ preview: '1' }));
  assert.equal(meta.title.absolute, 'Invitación Digital | Enkarta'); assert.doesNotMatch(JSON.stringify(meta), /QA PRIVATE|QA Publicada/);
});

test('invalid slug input never reaches the database and is not normalized into another invitation', async () => {
  for (const value of ['', '   ', null, undefined, {}, 'qa/guest', 'qa\\guest', 'qa\n', 'qa\0', 'qa\x7f', 'qa\x85', '.', '..', '../qa-guest', ['qa-guest']]) {
    assert.equal(validInvitationSlug(value), false); assert.equal(await readInvitationBySlug(value), null);
  }
  assert.deepEqual(queries, []); assert.equal(validInvitationSlug('qa-guest-23'), true);
});

test('historical mixed-case, Unicode, underscore and spaced slugs are looked up without rewriting', async () => {
  for (const slug of ['QA_Ángela_y_Andrés', 'Boda QA', '  QA Histórica  ']) {
    assert.equal(validInvitationSlug(slug), true);
    await readInvitationBySlug(slug);
    assert.deepEqual(filters.at(-1), ['slug', slug]);
    assert.equal(invitationShareUrl(slug).pathname, `/i/${encodeURIComponent(slug)}`);
  }
});

test('a valid long slug remains readable after duplication adds the UUID suffix', async () => {
  const original = 'a'.repeat(170), copy = `${original}-copia-30000000-0000-4000-8000-000000000001`;
  assert.equal(copy.length, 213); assert.equal(validInvitationSlug(copy), true);
  await readInvitationBySlug(copy);
  assert.deepEqual(filters.at(-1), ['slug', copy]);
  assert.equal(invitationShareUrl(copy).pathname, `/i/${copy}`);
});

test('one raw invitation read is scoped to its exact slug without persistent caching', async () => {
  assert.equal((await readInvitationBySlug('qa-guest')).id, row.id); row.names = 'QA newer';
  assert.equal((await readInvitationBySlug('qa-guest')).names, 'QA newer'); assert.deepEqual(queries, ['invitations', 'invitations']);
});

test('malformed personalized IDs stop at a clear status without querying a guest or rendering the form', async () => {
  for (const value of ['', 'QA/2', 'QA\n', 'QA?other=1', ['TEST0001', 'TEST0002'], 'a'.repeat(129)]) {
    assert.equal(validGuestLinkId(value), false);
    const result = await page.default(props({ g: value }));
    assert.equal(result.props.title, 'Enlace de invitado no disponible'); assert.match(result.props.text, /enlace personal/);
  }
  assert.deepEqual(lookups, []);
});

test('unknown personalized ID cannot silently fall back to the general invitation or generic RSVP', async () => {
  const result = await page.default(props({ g: 'TEST0001' }));
  assert.equal(result.props.title, 'Enlace de invitado no disponible'); assert.deepEqual(lookups, [[row.id, 'TEST0001']]);
});

test('historical personalized IDs remain usable and no token is required for a general invitation', async () => {
  assert.equal(validGuestLinkId('legacy_ID-001'), true);
  assert.equal(validGuestLinkId('TEST0001'), true);
  await page.default(props()); assert.deepEqual(lookups, []);
  guest = { id: 'qa-guest', publicId: 'TEST0001', name: 'QA Family', passes: 2, allowKids: true };
  const result = await page.default(props({ g: 'TEST0001', full: '1' }));
  assert.notEqual(result.props.title, 'Enlace de invitado no disponible'); assert.equal(lookups.length, 1);
});

test('public client props contain only the verified group, never roster or operational contact metadata', async () => {
  snapshot.config.guestMeta = { OTHERGROUP: { phone: '59170000000', group: 'QA PRIVATE GROUP' } };
  snapshot.config.activeGuest = { name: 'QA SAVED PREVIEW GUEST', publicId: 'OTHERGROUP' };
  guest = { id: 'qa-guest', publicId: 'TEST0001', name: 'QA Verified Family', passes: 2, allowKids: true, phone: '59171111111', group: 'QA PRIVATE GROUP', eventAccess: 'both', metadataStored: true };
  const result = await page.default(props({ g: 'TEST0001', full: '1' }));
  assert.equal(result.props.config.activeGuest.name, 'QA Verified Family');
  assert.doesNotMatch(JSON.stringify(result), /OTHERGROUP|QA SAVED PREVIEW GUEST|QA PRIVATE GROUP|59170000000|59171111111|guestMeta|metadataStored/);
  const generic = await page.default(props({ full: '1' }));
  assert.equal(generic.props.config.activeGuest, undefined); assert.equal(generic.props.config.guestMeta, undefined);
});

test('closed and unpublished pages skip publication history and personalized guest queries', async () => {
  for (const status of ['draft', 'disabled', 'expired']) {
    row.status = status;
    const result = await page.default(props({ g: 'TEST0001' }));
    assert.ok(result.props.title); assert.equal(historyReads, 0); assert.deepEqual(lookups, []);
  }
  row.status = 'ready'; row.expires_at = '2000-01-01'; await page.default(props({ g: 'TEST0001' })); assert.equal(historyReads, 0);
});

test('cover fetch rejects arbitrary hosts, credentials, redirects, non-images and application routes before rendering', async () => {
  for (const url of ['http://127.0.0.1/a.jpg', 'https://evil.example/a.jpg', '//evil.example/a.jpg', 'https://enkarta.vercel.app/api/private.png', '/i/qa-guest?preview=1', 'https://user:pass@invitali.com/a.jpg', 'https://invitali.com:8443/a.jpg', 'https://invitali.com/a.jpg#frag', 'data:image/png;base64,AA', '/catalog/a.jpg\n']) {
    assert.equal(shareCardCoverUrl(url), null, url);
  }
  let calls = 0; global.fetch = async () => { calls++; return new Response('bad', { headers: { 'content-type': 'text/html' } }); };
  assert.equal(await shareCardCover('https://evil.example/a.jpg'), null); assert.equal(calls, 0);
  assert.equal(await shareCardCover('/catalog/a.jpg'), null); assert.equal(calls, 1);
});

test('allowed original covers become an in-memory data URL with bounded bytes and no Satori network fetch', async () => {
  const requests = [];
  global.fetch = async (url, options) => { requests.push({ url: String(url), options }); return new Response(tinyPng, { headers: { 'content-type': 'image/png' } }); };
  assert.equal(await shareCardCover('/invitations/qa/cover.webp'), 'data:image/png;base64,' + tinyPng.toString('base64'));
  assert.equal(requests[0].url, 'https://enkarta.vercel.app/invitations/qa/cover.webp');
  assert.equal(requests[0].options.redirect, 'error'); assert.equal(requests[0].options.cache, 'no-store'); assert.equal(requests[0].options.referrerPolicy, 'no-referrer');
  assert.ok(requests[0].options.signal instanceof AbortSignal);
  assert.ok(shareCardCoverUrl('https://qa-storage.supabase.co/storage/v1/object/public/media/qa/cover.webp'));
});

test('oversized covers are rejected by declared size and streaming byte limit', async () => {
  global.fetch = async () => new Response('tiny', { headers: { 'content-type': 'image/png', 'content-length': String(8 * 1024 * 1024 + 1) } });
  assert.equal(await shareCardCover('/catalog/a.jpg'), null);
  global.fetch = async () => new Response(new Uint8Array(8 * 1024 * 1024 + 1), { headers: { 'content-type': 'image/png' } });
  assert.equal(await shareCardCover('/catalog/a.jpg'), null);
});

test('historical PNG archive with jpg extension and JPEG Content-Type keeps exact bytes and correct PNG data MIME', async () => {
  const original = fs.readFileSync(path.join(root, 'public/catalog/azure.jpg'));
  assert.equal(original.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  global.fetch = async () => new Response(original, { headers: { 'content-type': 'image/jpeg' } });
  const data = await shareCardCover('/catalog/azure.jpg');
  assert.ok(data.startsWith('data:image/png;base64,'));
  assert.deepEqual(Buffer.from(data.split(',')[1], 'base64'), original);
});

test('unsupported WebP and bytes that disagree with every supported encoding use the card background', async () => {
  for (const bytes of [Buffer.from('RIFF\x0c\x00\x00\x00WEBPVP8 ', 'binary'), Buffer.from('not an image'), Buffer.from([0x89, 0x50, 0x4e, 0x47])]) {
    global.fetch = async () => new Response(bytes, { headers: { 'content-type': 'image/jpeg' } });
    assert.equal(await shareCardCover('/catalog/azure.jpg'), null);
  }
});

test('font requests preserve the two existing families without sending names or event text to Google', async () => {
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return String(url).includes('fonts.googleapis') ? new Response("@font-face {src: url(https://fonts.gstatic.com/s/qa.ttf) format('truetype');}") : new Response(new Uint8Array([1, 2, 3]));
  };
  assert.equal((await shareCardFont('Great Vibes')).byteLength, 3); assert.equal((await shareCardFont('Cormorant Garamond', 600)).byteLength, 3);
  assert.match(requests[0].url, /family=Great\+Vibes$/); assert.match(requests[2].url, /family=Cormorant\+Garamond:wght@600$/);
  for (const request of requests) { assert.doesNotMatch(request.url, /text=|QA PRIVATE|QA Publicada/); assert.equal(request.options.redirect, 'error'); assert.equal(request.options.cache, 'force-cache'); }
});

test('a stalled asset or response body releases the image after its deadline and cancels its signal', async t => {
  let signal;
  assert.equal(await shareCardAsset(input => { signal = input; return new Promise(() => {}); }, 5), null); assert.equal(signal.aborted, true);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  global.fetch = async (_url, options) => { signal = options.signal; return new Response(new ReadableStream({ start() {} }), { headers: { 'content-type': 'image/png' } }); };
  const pending = shareCardCover('/catalog/a.jpg');
  await Promise.resolve(); await Promise.resolve(); t.mock.timers.tick(4000);
  assert.equal(await pending, null); assert.equal(signal.aborted, true);
});

test('OG renders only published content, resolved image bytes and private no-store headers', async () => {
  const requests = [];
  global.fetch = async url => { requests.push(String(url)); return String(url).includes('/catalog/') ? new Response(tinyPng, { headers: { 'content-type': 'image/jpeg' } }) : new Response('', { status: 404 }); };
  const result = await Og({ params: Promise.resolve({ slug: 'qa-guest' }) });
  const text = renderText(result.tree), serialized = JSON.stringify(result.tree);
  assert.match(text, /QA Publicada/); assert.doesNotMatch(text, /QA PRIVATE/); assert.match(serialized, /data:image\/png;base64/);
  assert.equal(result.options.headers['Cache-Control'], 'private, no-store'); assert.equal(result.options.headers['Referrer-Policy'], 'no-referrer');
  assert.doesNotMatch(requests.join(' '), /text=|QA PRIVATE|QA Publicada/);
});

test('draft OG never fetches its draft photo or exposes draft text', async () => {
  row.status = 'draft'; const requests = [];
  global.fetch = async url => { requests.push(String(url)); return new Response('', { status: 404 }); };
  const image = await Og({ params: Promise.resolve({ slug: 'qa-guest' }) });
  assert.doesNotMatch(JSON.stringify(image.tree), /QA PRIVATE|QA Publicada|\/catalog\/azure/);
  assert.equal(requests.some(url => url.includes('/catalog/')), false);
});
