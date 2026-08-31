'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { LAUNCH_CALENDAR, MARKETING_CAMPAIGNS, MARKETING_FORMATS, marketingTrackingPath, type MarketingCampaignKey, type MarketingFormatKey } from '@/lib/marketing-kit';
import { SITE_URL } from '@/lib/site';

type Check = { key: string; label: string; status: 'ok' | 'error'; latencyMs: number; detail: string };
type Health = { status: 'operational' | 'degraded'; checkedAt: string; checks: Check[] };

function HealthPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/health', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'No se pudo comprobar');
      setHealth(body); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo comprobar'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <section className="rounded-3xl border border-[#e2ddd3] bg-white p-5 sm:p-7">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.2em] text-[#a48655]">Monitoreo operativo</p><h2 className="mt-1 font-playfair text-3xl text-gray-900">Salud de los servicios críticos</h2><p className="mt-2 max-w-2xl font-outfit text-xs leading-5 text-gray-500">Comprueba invitaciones, RSVP, QR, embudo y configuración. El endpoint público solo devuelve el estado general y no expone detalles.</p></div><button type="button" onClick={() => void load()} className="self-start rounded-xl border border-gray-200 px-4 py-2 font-outfit text-xs text-gray-600">{loading ? 'Comprobando…' : 'Actualizar'}</button></div>
    {error ? <p className="mt-5 rounded-xl bg-red-50 p-4 font-outfit text-sm text-red-700">{error}</p> : health && <><div className={`mt-6 rounded-2xl border p-4 ${health.status === 'operational' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}><div className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${health.status === 'operational' ? 'bg-emerald-500' : 'bg-red-500'}`} /><strong className={`font-outfit text-sm ${health.status === 'operational' ? 'text-emerald-800' : 'text-red-800'}`}>{health.status === 'operational' ? 'Todos los servicios responden' : 'Hay servicios que requieren atención'}</strong></div><p className="mt-1 pl-6 font-outfit text-[10px] text-gray-500">Última comprobación: {new Date(health.checkedAt).toLocaleString('es-BO')}</p></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{health.checks.map(check => <article key={check.key} className="rounded-2xl border border-gray-100 bg-[#faf9f6] p-4"><div className="flex items-center justify-between gap-2"><span className={`h-2.5 w-2.5 rounded-full ${check.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} /><span className="font-mono text-[9px] text-gray-400">{check.latencyMs} ms</span></div><h3 className="mt-3 font-outfit text-xs font-semibold text-gray-800">{check.label}</h3><p className="mt-1 font-outfit text-[10px] leading-4 text-gray-500">{check.detail}</p></article>)}</div></>}
    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-outfit text-xs font-semibold text-emerald-900">Monitor externo versionado</p><p className="mt-1 font-outfit text-[11px] leading-5 text-emerald-800">GitHub Actions comprobará <code className="rounded bg-white/70 px-1">/api/health</code> cada 5 minutos. Si falla, abre una incidencia; cuando se recupera, la cierra automáticamente.</p></div>
  </section>;
}

function LaunchCalendar() {
  const [copied, setCopied] = useState(0);
  const copy = async (day: number, value: string) => { await navigator.clipboard.writeText(value); setCopied(day); window.setTimeout(() => setCopied(0), 1500); };
  return <section className="rounded-3xl border border-[#e2ddd3] bg-white p-5 sm:p-7">
    <div><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.2em] text-[#a48655]">Plan de 14 días</p><h2 className="mt-1 font-playfair text-3xl text-gray-900">Lanzamiento orgánico medible</h2><p className="mt-2 max-w-2xl font-outfit text-xs leading-5 text-gray-500">Una acción diaria para validar el mensaje, el segmento y el proceso de venta antes de pagar anuncios.</p></div>
    <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{LAUNCH_CALENDAR.map(item => {
      const url = `${SITE_URL}${marketingTrackingPath(item.campaign, item.format, item.channel.toLowerCase())}`;
      const text = `${item.caption}\n\n${url}`;
      return <article key={item.day} className="flex flex-col rounded-2xl border border-gray-100 bg-[#faf9f6] p-5"><div className="flex items-center justify-between gap-3"><span className="font-playfair text-2xl text-[#9a7e50]">Día {item.day}</span><span className="rounded-full bg-white px-2.5 py-1 font-outfit text-[9px] font-semibold text-gray-500">{item.channel}</span></div><p className="mt-3 font-outfit text-[10px] font-semibold uppercase tracking-[.14em] text-[#a48655]">{item.objective}</p><h3 className="mt-1 font-outfit text-sm font-semibold text-gray-800">{item.action}</h3><p className="mt-3 flex-1 font-outfit text-[11px] leading-5 text-gray-500">{item.caption}</p><button type="button" onClick={() => void copy(item.day, text)} className="mt-4 self-start rounded-xl border border-gray-200 bg-white px-4 py-2 font-outfit text-xs font-semibold text-gray-700">{copied === item.day ? 'Copiado' : 'Copiar publicación y enlace'}</button></article>;
    })}</div>
  </section>;
}

function MarketingKit() {
  const [campaign, setCampaign] = useState<MarketingCampaignKey>('bodas');
  const [format, setFormat] = useState<MarketingFormatKey>('story');
  const [copied, setCopied] = useState('');
  const item = MARKETING_CAMPAIGNS[campaign]; const size = MARKETING_FORMATS[format];
  const trackingPath = useMemo(() => marketingTrackingPath(campaign, format), [campaign, format]);
  const fullUrl = `${SITE_URL}${trackingPath}`;
  const copy = async (value: string, key: string) => { await navigator.clipboard.writeText(value); setCopied(key); window.setTimeout(() => setCopied(''), 1600); };
  return <section className="rounded-3xl border border-[#e2ddd3] bg-white p-5 sm:p-7">
    <div><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.2em] text-[#a48655]">Kit publicitario</p><h2 className="mt-1 font-playfair text-3xl text-gray-900">Piezas uniformes y medibles</h2><p className="mt-2 max-w-2xl font-outfit text-xs leading-5 text-gray-500">Selecciona campaña y formato. La imagen descargada mantiene la identidad Enkarta y el enlace incorpora UTM para atribuir contactos y ventas.</p></div>
    <div className="mt-6 flex flex-wrap gap-2">{(Object.keys(MARKETING_CAMPAIGNS) as MarketingCampaignKey[]).map(key => <button key={key} type="button" onClick={() => setCampaign(key)} className={`rounded-full px-4 py-2 font-outfit text-xs ${campaign === key ? 'bg-[#806b48] text-white' : 'bg-[#f3efe8] text-gray-600'}`}>{MARKETING_CAMPAIGNS[key].label}</button>)}</div>
    <div className="mt-3 flex flex-wrap gap-2">{(Object.keys(MARKETING_FORMATS) as MarketingFormatKey[]).map(key => <button key={key} type="button" onClick={() => setFormat(key)} className={`rounded-full border px-4 py-2 font-outfit text-xs ${format === key ? 'border-[#b8975a] bg-[#f8f2e7] text-[#765f38]' : 'border-gray-200 text-gray-500'}`}>{MARKETING_FORMATS[key].label}</button>)}</div>
    <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(260px,420px)_1fr]">
      <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-3xl border border-gray-200 bg-[#eee8de] shadow-xl"><Image key={`${campaign}-${format}`} src={`/api/admin/marketing-card?campaign=${campaign}&format=${format}`} alt={`Vista previa publicitaria para ${item.label}`} width={size.width} height={size.height} unoptimized className="max-h-[620px] w-full object-cover object-top" /></div>
      <div className="space-y-4">
        <article className="rounded-2xl bg-[#faf8f4] p-5"><div className="flex justify-between gap-3"><div><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.18em] text-[#a48655]">Archivo</p><h3 className="mt-1 font-playfair text-xl">{size.label} · {size.width} × {size.height}</h3></div><a href={`/api/admin/marketing-card?campaign=${campaign}&format=${format}&download=1`} download className="self-start rounded-xl bg-[#806b48] px-4 py-2 font-outfit text-xs font-semibold text-white">Descargar PNG</a></div></article>
        <article className="rounded-2xl bg-[#faf8f4] p-5"><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.18em] text-[#a48655]">Enlace medible</p><p className="mt-2 break-all font-mono text-[11px] leading-5 text-gray-600">{fullUrl}</p><button type="button" onClick={() => void copy(fullUrl, 'url')} className="mt-3 rounded-xl border border-gray-200 bg-white px-4 py-2 font-outfit text-xs font-semibold text-gray-700">{copied === 'url' ? 'Copiado' : 'Copiar enlace'}</button></article>
        <article className="rounded-2xl bg-[#faf8f4] p-5"><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.18em] text-[#a48655]">Guion breve para Reel</p><ol className="mt-3 space-y-2">{item.reelScript.map((line, index) => <li key={line} className="flex gap-3 font-outfit text-xs leading-5 text-gray-600"><span className="font-playfair text-[#a48655]">0{index + 1}</span>{line}</li>)}</ol><button type="button" onClick={() => void copy(`${item.reelScript.join('\n')}\n\n${fullUrl}`, 'script')} className="mt-4 rounded-xl border border-gray-200 bg-white px-4 py-2 font-outfit text-xs font-semibold text-gray-700">{copied === 'script' ? 'Copiado' : 'Copiar guion y enlace'}</button></article>
      </div>
    </div>
  </section>;
}

export default function LaunchDashboard() {
  return <div className="space-y-6"><HealthPanel /><LaunchCalendar /><MarketingKit /></div>;
}
