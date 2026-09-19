const base = (process.argv[2] || 'https://enkarta.vercel.app').replace(/\/$/, '');
const routes = ['laura-y-andres','annie-y-micky','roly-y-yeliana','nicole-y-francisco','manuel-y-maya','mariana-y-jesus','paula-y-juan-felipe','karla-y-mauricio','maria-angelica-y-mario','jardin-de-seda','casa-limone','promesa','aurelia','velada'];
async function main() {
 const assets = new Set(['/lottie/boda/annie-corazones-original.json']);
 for (const route of routes) {
  const r = await fetch(`${base}/muestra/${route}?full=1`, {signal:AbortSignal.timeout(25000)});
  const html = await r.text();
  if (!r.ok || !html.includes('Confirmar') || !html.includes('<h1')) throw new Error(`${route}: HTTP ${r.status}, contenido no válido`);
  for (const m of html.matchAll(/src="(\/(?:invitations|lottie)\/[^"?]+)"/g)) assets.add(m[1]);
  console.log(`OK ${route}`);
 }
 for (const path of assets) {
  const r = await fetch(base + path, {method:'HEAD',signal:AbortSignal.timeout(20000)});
  if (!r.ok) throw new Error(`Recurso ${path}: HTTP ${r.status}`);
 }
 console.log(`OK ${routes.length} invitaciones y ${assets.size} recursos locales`);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
