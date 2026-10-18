// Synthetic commercial handoffs only. Never follows redirects to WhatsApp.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
require('@next/env').loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const {createClient}=require('@supabase/supabase-js');
const arg=name=>{const index=process.argv.indexOf(name);return index<0?null:process.argv[index+1];};
assert.ok(process.argv.includes('--exercise')&&process.argv.includes('--production'));
const origin='https://enkarta.vercel.app',project=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
assert.equal(project,'eodedockxqvynedwhpsp');assert.equal(arg('--expect-project'),project);assert.notEqual(process.env.PAYMENT_PROVIDER,'bcp');
const output=arg('--report');assert.ok(output);const reportPath=path.resolve(output),tempRoot=path.resolve('tmp')+path.sep;
assert.ok(reportPath.startsWith(tempRoot)&&reportPath.endsWith('.json'));fs.mkdirSync(path.dirname(reportPath),{recursive:true});
const resume=process.argv.includes('--resume-cleanup');assert.ok(resume||!fs.existsSync(reportPath),'Use a new report or resume only cleanup');
const sessionId=crypto.randomUUID(),report=resume?JSON.parse(fs.readFileSync(reportPath,'utf8')):{origin,project,sessionId,tag:'qa-contact-'+crypto.randomUUID(),checks:[],cleanup:'not-started',bankCalls:0,messagesSent:0,usersCreated:0};
assert.equal(report.origin,origin);assert.equal(report.project,project);assert.match(report.sessionId,/^[a-f0-9-]{36}$/);assert.match(report.tag,/^qa-contact-[a-f0-9-]{36}$/);
const hash=crypto.createHash('sha256').update('enkarta-commercial:'+report.sessionId).digest('hex');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,init={})=>fetch(url,{...init,signal:AbortSignal.timeout(25000)})}});
const save=()=>fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
const must=(result,label)=>{if(result.error)throw Error(label+': '+(result.error.code||'DATABASE_ERROR'));return result.data;};
async function http(route,headers={}){
 const url=new URL(route,origin);assert.equal(url.origin,origin);
 return fetch(url,{headers:{...headers,Cookie:`enkarta-commercial=${report.sessionId}`},redirect:'manual',signal:AbortSignal.timeout(30000)});
}
async function rows(table){return must(await db.from(table).select('*').eq('session_hash',hash),'Read isolated '+table);}
async function main(){
 for(const[design,referer,name]of[['azure','/catalogo','Lunaria'],['nicole-y-francisco','/catalogo','Nicole y Francisco'],['','/muestra/carmesi','Granate']]){
  const params=new URLSearchParams({package:'premium',placement:report.tag,utm_campaign:report.tag,...(design?{design}:{})});
  const response=await http('/contacto/whatsapp?'+params,{Referer:origin+referer});assert.equal(response.status,302);assert.equal(response.headers.get('cache-control'),'no-store');
  const destination=new URL(response.headers.get('location'));assert.equal(destination.origin,'https://wa.me');const message=destination.searchParams.get('text');
  assert.ok(message.includes('diseño '+name));assert.ok(message.includes('Premium de 930 Bs'));assert.match(message,/Referencia: EK-[A-F0-9]{8}/);await response.body?.cancel();
  report.checks.push('Message uses public design '+name+' with unchanged package and reference');save();
 }
 const leads=await rows('commercial_leads'),events=await rows('commercial_events');assert.equal(leads.length,3);assert.equal(events.length,3);
 for(const lead of leads){assert.equal(lead.status,'whatsapp_open');assert.equal(lead.revenue_bs,null);assert.equal(lead.placement,report.tag);assert.equal(lead.utm_campaign,report.tag);}
 report.checks.push('Only three isolated intents exist, without conversations, reserves or sales');save();
 for(const[from,expected]of [['/catalogo','/catalogo'],['/\\outside.example','/'],['/%255Coutside.example','/']]){
  const response=await http('/contacto/preparado?'+new URLSearchParams({design:'azure',package:'premium',from}));assert.equal(response.status,200);const html=await response.text();assert.match(html,/diseño Lunaria/);assert.match(html,/Preparamos el mensaje/);assert.doesNotMatch(html,/Abrimos una conversación/);
  const back=html.match(/<a\b[^>]*href="([^"]+)"[^>]*>Volver a la página<\/a>/);assert.ok(back);assert.equal(back[1],expected);
 }
 report.checks.push('Prepared message and return links stay correct for normal and hostile input');
 const admin=await http('/api/admin/commercial');assert.equal(admin.status,401);await admin.body?.cancel();report.checks.push('Commercial dashboard still rejects an anonymous session');save();
}
async function cleanup(){
 report.cleanup='in-progress';save();
 const leads=await rows('commercial_leads'),events=await rows('commercial_events');assert.ok(leads.length<=3&&events.length<=3);
 assert.ok(leads.every(row=>row.placement===report.tag&&row.utm_campaign===report.tag&&row.status==='whatsapp_open'&&row.revenue_bs===null));
 assert.ok(events.every(row=>row.placement===report.tag&&row.utm_campaign===report.tag&&row.event_type==='whatsapp_open'));
 const ids=leads.map(row=>row.id);
 if(ids.length){const history=must(await db.from('commercial_lead_history').select('id').in('lead_id',ids),'Verify no real sales history');assert.equal(history.length,0);}
 must(await db.from('commercial_leads').delete().eq('session_hash',hash).eq('placement',report.tag).eq('utm_campaign',report.tag),'Delete isolated leads');
 must(await db.from('commercial_events').delete().eq('session_hash',hash).eq('placement',report.tag).eq('utm_campaign',report.tag),'Delete isolated events');
 assert.equal((await rows('commercial_leads')).length,0);assert.equal((await rows('commercial_events')).length,0);
 report.cleanup='verified-no-fixtures-remain';report.completedAt=new Date().toISOString();save();
 console.log(JSON.stringify({passed:report.checks.length,cleanup:report.cleanup,bankCalls:0,messagesSent:0,usersCreated:0}));
}
save();(resume?Promise.resolve():main()).catch(error=>{report.failure=error.message;save();console.error(error.message);process.exitCode=1;}).finally(async()=>{try{await cleanup();}catch(error){report.cleanup='failed';report.cleanupFailure=error.message;save();console.error('Cleanup requires attention: '+error.message);process.exitCode=1;}});
