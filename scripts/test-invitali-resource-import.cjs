const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {importResources}=require('./import-invitali-originals.cjs');
const project=path.resolve(__dirname,'..'),temporary=path.join(project,'tmp');
fs.mkdirSync(temporary,{recursive:true});
const scratch=fs.mkdtempSync(path.join(temporary,'invitali-resource-import-'));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9kAAAAASUVORK5CYII=','base64');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
let passed=0;
function test(name,run) {run();passed++;console.log('OK '+name);}
function fixture() {
 const root=fs.mkdtempSync(path.join(scratch,'case-'));
 for(const directory of ['Iconos INVITALI','public','src/lib']) fs.mkdirSync(path.join(root,directory),{recursive:true});
 const row={url:'https://invitali.com/wp-content/uploads/2026/10/fixture.png',archiveFile:'Iconos INVITALI/2026-10-fixture.png',localPath:'/invitations/test/2026-10-fixture.png',sha256:digest(png),bytes:png.length};
 fs.writeFileSync(path.join(root,row.archiveFile),png);
 const unchanged=['Iconos INVITALI/manifest.json','public/invitali-originales.json','src/lib/invitali-local-assets.json'];
 for(const file of unchanged) fs.writeFileSync(path.join(root,file),'original registry remains unchanged\n');
 const manifestFile='Iconos INVITALI/test-recursos.json',destination=path.join(root,'public',row.localPath);
 function manifest(rows=[row]) {fs.writeFileSync(path.join(root,manifestFile),JSON.stringify(rows));}
 function run(rows=[row]) {manifest(rows);return importResources({projectRoot:root,manifestFile});}
 return {root,row,destination,manifest,manifestFile,run,unchanged};
}
function rejectsChanged(change,pattern) {
 const f=fixture();change(f);
 assert.throws(()=>f.run(),pattern);
 assert.equal(fs.existsSync(f.destination),false);
}
try {
 test('copies original bytes and leaves all three Lottie registries untouched',()=>{
  const f=fixture();assert.deepEqual(f.run(),{copied:1,existing:0,total:1});
  assert.deepEqual(fs.readFileSync(f.destination),png);
  assert.deepEqual(fs.readFileSync(path.join(f.root,f.row.archiveFile)),png);
  for(const file of f.unchanged) assert.equal(fs.readFileSync(path.join(f.root,file),'utf8'),'original registry remains unchanged\n');
 });
 test('second import is idempotent and does not rewrite distribution',()=>{
  const f=fixture();f.run();fs.utimesSync(f.destination,1,1);
  assert.deepEqual(f.run(),{copied:0,existing:1,total:1});assert.equal(fs.statSync(f.destination).mtimeMs,1000);
 });
 test('explicitly reused local resource needs no invented archive path',()=>{
  const f=fixture();fs.mkdirSync(path.dirname(f.destination),{recursive:true});fs.writeFileSync(f.destination,png);
  delete f.row.archiveFile;f.row.reused=true;
  assert.deepEqual(f.run(),{copied:0,existing:1,total:1});
 });
 test('rejects changed archived bytes before copying',()=>rejectsChanged(f=>{f.row.sha256='0'.repeat(64);},/hash\/size differs/));
 test('rejects incorrect declared byte length',()=>rejectsChanged(f=>{f.row.bytes++;},/hash\/size differs/));
 test('rejects missing hash or invalid integer size',()=>rejectsChanged(f=>{f.row.bytes=NaN;},/hash\/size/));
 test('never overwrites a different existing destination',()=>{
  const f=fixture();fs.mkdirSync(path.dirname(f.destination),{recursive:true});const other=Buffer.from('different original');fs.writeFileSync(f.destination,other);
  assert.throws(()=>f.run(),/Different existing original/);assert.deepEqual(fs.readFileSync(f.destination),other);
 });
 test('preflights a complete batch before copying its first valid item',()=>{
  const f=fixture();const invalid={...f.row,url:f.row.url+'?second=1',localPath:'/invitations/test/second.png',sha256:'0'.repeat(64)};
  assert.throws(()=>f.run([f.row,invalid]),/hash\/size differs/);assert.equal(fs.existsSync(f.destination),false);
 });
 test('rejects destination parent traversal',()=>rejectsChanged(f=>{f.row.localPath='/../outside.png';},/Invalid localPath/));
 test('rejects archive parent traversal',()=>rejectsChanged(f=>{f.row.archiveFile='Iconos INVITALI/../outside.png';},/Invalid archiveFile/));
 test('rejects backslash path traversal on every platform',()=>rejectsChanged(f=>{f.row.localPath='/invitations\\..\\outside.png';},/Invalid localPath/));
 test('rejects Windows drive and alternate data stream paths',()=>rejectsChanged(f=>{f.row.localPath='/C:/outside.png';},/Invalid localPath/));
 test('rejects protocol relative destination paths',()=>rejectsChanged(f=>{f.row.localPath='//host/outside.png';},/Invalid localPath/));
 test('rejects Windows-normalized trailing dots and spaces',()=>rejectsChanged(f=>{f.row.localPath='/invitations/.. /outside.png';},/Invalid localPath/));
 test('rejects archive outside the master folder',()=>rejectsChanged(f=>{f.row.archiveFile='public/fixture.png';},/Invalid archiveFile root/));
 test('rejects resource manifest outside the master folder',()=>{
  const f=fixture();fs.writeFileSync(path.join(f.root,'outside.json'),JSON.stringify([f.row]));
  assert.throws(()=>importResources({projectRoot:f.root,manifestFile:'outside.json'}),/manifest must stay inside/);
 });
 test('rejects directory junctions that escape the public root',()=>{
  const f=fixture(),outside=fs.mkdtempSync(path.join(scratch,'outside-'));
  fs.symlinkSync(outside,path.join(f.root,'public','escape'),process.platform==='win32'?'junction':'dir');
  f.row.localPath='/escape/fixture.png';
  assert.throws(()=>f.run(),/Symlink escape/);assert.equal(fs.existsSync(path.join(outside,'fixture.png')),false);
 });
 test('rejects archive junctions before reading escaped files',()=>{
  const f=fixture(),outside=fs.mkdtempSync(path.join(scratch,'outside-'));
  fs.writeFileSync(path.join(outside,'fixture.png'),png);
  fs.symlinkSync(outside,path.join(f.root,'Iconos INVITALI','escape'),process.platform==='win32'?'junction':'dir');
  f.row.archiveFile='Iconos INVITALI/escape/fixture.png';
  assert.throws(()=>f.run(),/Symlink escape/);assert.equal(fs.existsSync(f.destination),false);
 });
 test('requires explicit reuse when no archive is provided',()=>rejectsChanged(f=>{delete f.row.archiveFile;},/explicitly reused/));
 test('does not create a missing reused resource',()=>rejectsChanged(f=>{delete f.row.archiveFile;f.row.reused=true;},/ENOENT/));
 test('rejects HTML or executable content disguised as an image',()=>rejectsChanged(f=>{
  const html=Buffer.from('<html>Access denied</html>');fs.writeFileSync(path.join(f.root,f.row.archiveFile),html);f.row.sha256=digest(html);f.row.bytes=html.length;
 },/Invalid original image\/font bytes/));
 test('imports an original font byte for byte',()=>{
  const f=fixture(),font=fs.readFileSync(path.join(project,'public/invitations/manuel-y-maya/cinzel-8vij7ww63mvu7gt79mt7.woff2'));
  f.row.url='https://invitali.com/wp-content/uploads/elementor/google-fonts/fonts/cinzel-8vij7ww63mvu7gt79mt7.woff2';f.row.archiveFile='Iconos INVITALI/2026-10-font.woff2';f.row.localPath='/invitations/test/font.woff2';f.row.sha256=digest(font);f.row.bytes=font.length;
  fs.writeFileSync(path.join(f.root,f.row.archiveFile),font);assert.equal(f.run().copied,1);assert.deepEqual(fs.readFileSync(path.join(f.root,'public',f.row.localPath)),font);
 });
 test('rejects unsupported script-capable resource formats',()=>rejectsChanged(f=>{f.row.localPath='/invitations/test/file.svg';},/Invalid original image\/font bytes/));
 test('imports a static original SVG byte for byte',()=>{
  const f=fixture(),svg=fs.readFileSync(path.join(project,'public/invitations/karla-y-mauricio/Recurso-1iconos.svg'));
  f.row.archiveFile='Iconos INVITALI/2026-10-static.svg';f.row.localPath='/invitations/test/static.svg';f.row.sha256=digest(svg);f.row.bytes=svg.length;
  fs.writeFileSync(path.join(f.root,f.row.archiveFile),svg);assert.equal(f.run().copied,1);assert.deepEqual(fs.readFileSync(path.join(f.root,'public',f.row.localPath)),svg);
 });
 for(const [name,body] of [['script','<script>alert(1)</script>'],['event handler','<rect onload="alert(1)"/>'],['external reference','<image href="https://example.com/x.png"/>'],['foreign object','<foreignObject><p>x</p></foreignObject>'],['javascript URL','<a href="javascript:alert(1)"/>']]) test('rejects SVG with '+name,()=>rejectsChanged(f=>{
  const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">'+body+'</svg>');f.row.archiveFile='Iconos INVITALI/2026-10-active.svg';f.row.localPath='/invitations/test/active.svg';fs.writeFileSync(path.join(f.root,f.row.archiveFile),svg);f.row.sha256=digest(svg);f.row.bytes=svg.length;
 },/Invalid original image\/font bytes/));
 test('rejects duplicate destinations including case variants',()=>{
  const f=fixture();assert.throws(()=>f.run([f.row,{...f.row,url:f.row.url+'?other=1',localPath:f.row.localPath.toUpperCase()}]),/Duplicate resource destination/);
  assert.equal(fs.existsSync(f.destination),false);
 });
 test('rejects duplicate source URL records',()=>{
  const f=fixture();assert.throws(()=>f.run([f.row,{...f.row,localPath:'/invitations/other.png'}]),/Duplicate resource URL/);
 });
 test('rejects non HTTPS and credential bearing URLs',()=>rejectsChanged(f=>{f.row.url='https://user:pass@invitali.com/asset.png';},/Invalid resource URL/));
 test('CLI rejects unknown flags before changing existing registries',()=>{
  const tracked=['Iconos INVITALI/manifest.json','public/invitali-originales.json','src/lib/invitali-local-assets.json'];
  const hashes=tracked.map(file=>digest(fs.readFileSync(path.join(project,file))));
  const result=spawnSync(process.execPath,[path.join(__dirname,'import-invitali-originals.cjs'),'--unknown'],{encoding:'utf8'});
  assert.equal(result.status,1);assert.match(result.stderr,/Usage:/);
  assert.deepEqual(tracked.map(file=>digest(fs.readFileSync(path.join(project,file)))),hashes);
 });
 console.log(`${passed} resource importer regression tests passed.`);
} finally {
 const resolved=path.resolve(scratch);
 assert.ok(resolved.startsWith(path.resolve(temporary)+path.sep)&&path.basename(resolved).startsWith('invitali-resource-import-'));
 fs.rmSync(resolved,{recursive:true,force:true});
}
