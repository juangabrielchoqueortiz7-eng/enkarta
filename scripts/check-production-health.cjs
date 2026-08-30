const base = String(process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || 'https://enkarta.vercel.app').replace(/\/$/, '');

async function main() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${base}/api/health`, { signal: controller.signal, headers: { 'User-Agent': 'Enkarta-Health-Check/1.0' } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.status !== 'operational') throw new Error(`Estado ${response.status}: ${body.status || 'respuesta inválida'}`);
    console.log(`✔ Enkarta operativa · ${body.checkedAt || 'sin fecha'} · ${base}`);
  } finally { clearTimeout(timer); }
}

main().catch(error => { console.error(`✘ Enkarta requiere atención · ${error.message}`); process.exitCode = 1; });

