import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/host-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ProbeInput { url?: string; kind?: string; label?: string; blockId?: string }

function privateAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^::ffff:/, '');
  if (normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
  if (isIP(normalized) !== 4) return false;
  const octets = normalized.split('.').map(Number);
  return octets[0] === 0 || octets[0] === 10 || octets[0] === 127 || octets[0] >= 224
    || (octets[0] === 169 && octets[1] === 254)
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168)
    || (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127);
}

async function safeRemoteUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Protocolo no verificable');
  if (!url.hostname || url.hostname === 'localhost' || url.hostname.endsWith('.local') || url.hostname.endsWith('.internal')) throw new Error('Destino local bloqueado');
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(item => privateAddress(item.address))) throw new Error('Destino privado bloqueado');
  return url;
}

async function remoteProbe(raw: string) {
  let current = await safeRemoteUrl(raw);
  const started = Date.now();
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    let response = await fetch(current, {
      method: 'HEAD', redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(5500),
      headers: { 'User-Agent': 'Enkarta-Publication-Audit/1.0', Accept: '*/*' },
    });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(current, {
        method: 'GET', redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(5500),
        headers: { 'User-Agent': 'Enkarta-Publication-Audit/1.0', Accept: '*/*', Range: 'bytes=0-0' },
      });
    }
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      await response.body?.cancel().catch(() => {});
      current = await safeRemoteUrl(new URL(response.headers.get('location')!, current).toString());
      continue;
    }
    const contentRange = response.headers.get('content-range');
    const rangedTotal = contentRange?.match(/\/(\d+)$/)?.[1];
    const bytes = Number(rangedTotal || response.headers.get('content-length') || 0) || undefined;
    await response.body?.cancel().catch(() => {});
    return {
      ok: response.ok,
      status: response.status,
      bytes,
      contentType: response.headers.get('content-type') || undefined,
      durationMs: Date.now() - started,
      finalUrl: current.toString(),
    };
  }
  throw new Error('Demasiadas redirecciones');
}

export async function POST(request: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = await request.json().catch(() => null) as { resources?: ProbeInput[] } | null;
  const resources = Array.isArray(body?.resources) ? body!.resources.slice(0, 24) : [];
  const results = await Promise.all(resources.map(async resource => {
    const url = String(resource.url || '').trim();
    const base = { url, kind: String(resource.kind || 'link'), label: String(resource.label || 'Recurso').slice(0, 120), blockId: resource.blockId ? String(resource.blockId).slice(0, 120) : undefined };
    if (!url) return { ...base, ok: false, error: 'URL vacía', durationMs: 0 };
    if (/^data:/i.test(url)) {
      const comma = url.indexOf(',');
      const bytes = comma >= 0 ? Math.ceil((url.length - comma - 1) * 0.75) : url.length;
      return { ...base, ok: true, status: 200, bytes, durationMs: 0, contentType: url.slice(5, url.indexOf(';') > 0 ? url.indexOf(';') : comma) };
    }
    if (/^(mailto:|tel:)/i.test(url)) return { ...base, ok: true, status: 200, durationMs: 0 };
    try {
      return { ...base, ...(await remoteProbe(url)) };
    } catch (error) {
      return { ...base, ok: false, error: error instanceof Error ? error.message : 'No se pudo verificar', durationMs: 0 };
    }
  }));
  const totalBytes = results.reduce((sum, item) => sum + ('bytes' in item && typeof item.bytes === 'number' ? item.bytes : 0), 0);
  const durations = results.map(item => item.durationMs || 0).filter(Boolean);
  return NextResponse.json({
    results,
    summary: {
      checked: results.length,
      failed: results.filter(item => !item.ok).length,
      totalBytes,
      averageResponseMs: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0,
      slow: results.filter(item => (item.durationMs || 0) > 1800).length,
      heavy: results.filter(item => ('bytes' in item ? (item.bytes || 0) > 1_500_000 : false)).length,
    },
  });
}
