// Import only known full source URLs. Existing differing bytes are never overwritten.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),archive=path.join(root,'Iconos INVITALI');
const manifestPath=path.join(root,'public/invitali-originales.json');
const rows=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
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
