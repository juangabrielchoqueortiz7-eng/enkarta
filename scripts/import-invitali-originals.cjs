// Import only known full source URLs. Existing differing bytes are never overwritten.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),archive=path.join(root,'Iconos INVITALI');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

// A separate, explicit manifest imports images/fonts without rewriting the Lottie registry.
function inside(file, directory) {
 return file.startsWith(directory + path.sep);
}
function relativeParts(value, name) {
 if(typeof value!=='string'||!value||/[\\\x00-\x1f\x7f:]/.test(value)||value.startsWith('/')||value.split('/').some(part=>!part||part==='.'||part==='..'||/[ .]$/.test(part))) throw Error('Invalid '+name);
 return value;
}
function confinedFile(directory, relative, name) {
 const destination=path.resolve(directory,relative);
 if(!inside(destination,directory)) throw Error('Escaping '+name);
 let existing=destination;
 while(!fs.existsSync(existing)) {
  const parent=path.dirname(existing);
  if(parent===existing) throw Error('Missing '+name+' root');
  existing=parent;
 }
 const realDirectory=fs.realpathSync(directory),realExisting=fs.realpathSync(existing);
 if(realExisting!==realDirectory&&!inside(realExisting,realDirectory)) throw Error('Symlink escape in '+name);
 return destination;
}
function validateResourceBytes(bytes, extension) {
 const text=(start,end)=>bytes.subarray(start,end).toString('ascii');
 const valid={
  '.webp':()=>bytes.length>=20&&text(0,4)==='RIFF'&&text(8,12)==='WEBP'&&bytes.readUInt32LE(4)===bytes.length-8&&['VP8 ','VP8L','VP8X'].includes(text(12,16)),
  '.png':()=>bytes.length>=33&&bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))&&text(12,16)==='IHDR'&&bytes.readUInt32BE(16)>0&&bytes.readUInt32BE(20)>0,
  '.jpg':()=>bytes.length>=4&&bytes[0]===255&&bytes[1]===216&&bytes[bytes.length-2]===255&&bytes[bytes.length-1]===217,
  '.jpeg':()=>bytes.length>=4&&bytes[0]===255&&bytes[1]===216&&bytes[bytes.length-2]===255&&bytes[bytes.length-1]===217,
  '.gif':()=>bytes.length>=13&&['GIF87a','GIF89a'].includes(text(0,6))&&bytes.readUInt16LE(6)>0&&bytes.readUInt16LE(8)>0,
  '.ttf':()=>bytes.length>=12&&bytes.subarray(0,4).equals(Buffer.from([0,1,0,0])),
  '.otf':()=>bytes.length>=12&&text(0,4)==='OTTO',
  '.woff':()=>bytes.length>=44&&text(0,4)==='wOFF'&&bytes.readUInt32BE(8)===bytes.length,
  '.woff2':()=>bytes.length>=48&&text(0,4)==='wOF2'&&bytes.readUInt32BE(8)===bytes.length,
  // Static vector art only: anything able to run script or load external content is rejected.
  '.svg':()=>{
   const source=bytes.toString('utf8').replace(/^﻿/,'').trim();
   return /^(<\?xml[^>]*\?>\s*)?<svg[\s>]/.test(source)&&source.endsWith('</svg>')
    &&!/<\s*(script|foreignObject|iframe|object|embed)\b|\son\w+\s*=|javascript:|(href|src)\s*=\s*["']?\s*(https?:|\/\/|data:)|@import|url\(\s*["']?\s*(https?:|\/\/)|<!ENTITY/i.test(source);
  },
 };
 if(!valid[extension]?.()) throw Error('Invalid original image/font bytes: '+extension);
}
function importResources({projectRoot=root,manifestFile}) {
 const project=path.resolve(projectRoot),archiveRoot=path.join(project,'Iconos INVITALI'),publicRoot=path.join(project,'public');
 const manifest=path.resolve(project,manifestFile||'');
 if(!inside(manifest,archiveRoot)||!inside(fs.realpathSync(manifest),fs.realpathSync(archiveRoot))) throw Error('Resource manifest must stay inside Iconos INVITALI');
 const resources=JSON.parse(fs.readFileSync(manifest,'utf8'));
 if(!Array.isArray(resources)) throw Error('Resource manifest must be an array');
 const destinations=new Set(),sources=new Set();
 // Validate the entire batch before creating any distribution files.
 const plans=resources.map(row=>{
  if(!row||typeof row!=='object'||Array.isArray(row)) throw Error('Invalid resource row');
  const sourceUrl=new URL(row.url);
  if(sourceUrl.protocol!=='https:'||sourceUrl.username||sourceUrl.password||sourceUrl.hash) throw Error('Invalid resource URL');
  if(sources.has(row.url)) throw Error('Duplicate resource URL');
  sources.add(row.url);
  if(typeof row.localPath!=='string'||!row.localPath.startsWith('/')) throw Error('Invalid localPath');
  const relative=relativeParts(row.localPath.slice(1),'localPath'),extension=path.extname(relative).toLowerCase();
  const destination=confinedFile(publicRoot,relative,'public resource');
  const destinationKey=destination.toLowerCase();
  if(destinations.has(destinationKey)) throw Error('Duplicate resource destination');
  destinations.add(destinationKey);
  if(typeof row.sha256!=='string'||!(/^[a-f0-9]{64}$/i.test(row.sha256))||!Number.isSafeInteger(row.bytes)||row.bytes<1) throw Error('Missing resource hash/size');
  let source;
  if(row.archiveFile!==undefined) {
   const archived=relativeParts(row.archiveFile,'archiveFile');
   if(!archived.startsWith('Iconos INVITALI/')) throw Error('Invalid archiveFile root');
   source=confinedFile(archiveRoot,archived.slice('Iconos INVITALI/'.length),'archive resource');
  } else {
   if(row.reused!==true) throw Error('Unarchived resource must be explicitly reused');
   source=destination;
  }
  const bytes=fs.readFileSync(source);
  if(bytes.length!==row.bytes||hash(bytes)!==row.sha256.toLowerCase()) throw Error('Original hash/size differs: '+row.localPath);
  validateResourceBytes(bytes,extension);
  const exists=fs.existsSync(destination);
  if(exists) {
   const current=fs.readFileSync(destination);
   if(current.length!==row.bytes||hash(current)!==row.sha256.toLowerCase()) throw Error('Different existing original: '+row.localPath);
  }
  return {destination,bytes,exists};
 });
 let copied=0,existing=0;
 for(const plan of plans) {
  if(plan.exists) {existing++;continue;}
  fs.mkdirSync(path.dirname(plan.destination),{recursive:true});
  confinedFile(publicRoot,path.relative(publicRoot,plan.destination),'public resource');
  try {fs.writeFileSync(plan.destination,plan.bytes,{flag:'wx'});copied++;}
  catch(error) {
   if(error.code!=='EEXIST') throw error;
   confinedFile(publicRoot,path.relative(publicRoot,plan.destination),'public resource');
   const current=fs.readFileSync(plan.destination);
   if(!current.equals(plan.bytes)) throw Error('Different existing original: '+plan.destination);
   existing++;
  }
 }
 return {copied,existing,total:plans.length};
}
function importLottieOriginals() {
const manifestPath=path.join(root,'public/invitali-originales.json');
const rows=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const mappings={};let copied=0,existing=0;
for(const row of rows){
 const sourceName=decodeURIComponent(new URL(row.url).pathname.split('/').pop());
 const uniqueMusic=!row.filename.endsWith('.json')&&rows.filter(item=>new URL(item.url).pathname.split('/').pop()===sourceName).length===1;
 const candidates=[path.basename(row.filename),...(uniqueMusic?[sourceName]:[])];
 const source=candidates.map(name=>path.join(archive,name)).find(file=>fs.existsSync(file));
 if(!source)continue;
 const bytes=fs.readFileSync(source),json=row.filename.endsWith('.json');
 if(json){const data=JSON.parse(bytes);if(!Array.isArray(data.layers))throw Error('Invalid Lottie: '+source);}
 else if(bytes.length<4||!(bytes.subarray(0,3).toString()==='ID3'||bytes[0]===255&&(bytes[1]&224)===224))throw Error('Invalid MP3: '+source);
 const localPath=(json?'/lottie/invitali-originales/':'/audio/invitali-originales/')+path.basename(row.filename);
 const destination=path.join(root,'public',localPath),sha256=hash(bytes);
 if(fs.existsSync(destination)){if(hash(fs.readFileSync(destination))!==sha256)throw Error('Different existing original: '+destination);existing++;}
 else{fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(source,destination);copied++;}
 mappings[row.url]=localPath;
 Object.assign(row,{localPath,sha256,bytes:bytes.length,archiveFile:path.relative(root,source).replaceAll('\\','/')});
}
fs.writeFileSync(path.join(root,'src/lib/invitali-local-assets.json'),JSON.stringify(mappings,null,2)+'\n');
fs.writeFileSync(manifestPath,JSON.stringify(rows,null,2)+'\n');
fs.writeFileSync(path.join(archive,'manifest.json'),JSON.stringify(rows,null,2)+'\n');
console.log(`${copied} imported; ${existing} unchanged; ${rows.length-Object.keys(mappings).length} pending.`);
}

module.exports={importResources,validateResourceBytes};
if(require.main===module) {
 try {
  const args=process.argv.slice(2);
  if(args.length===0) importLottieOriginals();
  else if(args.length===2&&args[0]==='--resources') {
   const result=importResources({manifestFile:args[1]});
   console.log(`${result.copied} resources imported; ${result.existing} unchanged; ${result.total} verified.`);
  } else throw Error('Usage: node scripts/import-invitali-originals.cjs [--resources <archive-manifest.json>]');
 } catch(error) {console.error(error.message);process.exitCode=1;}
}
