'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { boundedBuilderTask } from '@/lib/builder-request';
import type { Guest, InvitationParsed } from '@/lib/types';
import { collectPublicationResources } from '@/lib/publication-audit';
import { createStoredZip, createTextPdf, type PdfPage, type ZipEntryInput } from '@/lib/export-artifacts';

interface Props {
  data: InvitationParsed;
}

interface AnalyticsSummary {
  views: number; uniqueVisitors: number; guests: number; sent: number; confirmed: number; declined: number; pending: number; openRsvps: number;
  confirmedPasses: number; totalPasses: number; responseRate: number; conversionRate: number;
  trend: { date: string; label: string; responses: number }[];
  activityTrend: { date: string; label: string; events: number }[];
  engagement: { entryOpens: number; rsvpStarts: number; rsvpSubmits: number; mapOpens: number; calendarAdds: number; galleryOpens: number; shares: number; externalLinks: number; ctaClicks: number; musicToggles: number };
  scroll: { reach25: number; reach50: number; reach75: number; reach100: number };
  funnel: { stage: string; value: number; rate: number }[];
  retentionDays: number;
  analyticsEnabled: boolean;
  analyticsReady: boolean;
  sources: { label: string; value: number }[];
}

interface ExportQuery {
  id: string;
  guestMeta: InvitationParsed['config']['guestMeta'];
}
interface ExportSnapshot {
  query: ExportQuery;
  analytics: AnalyticsSummary | null;
  guests: Guest[];
  error: string;
}
interface ExportAttempt {
  controller: AbortController;
  timer?: ReturnType<typeof setTimeout>;
  query: ExportQuery;
  data: InvitationParsed;
  kind: string;
  snapshot?: ExportSnapshot;
}

function extensionFor(type: string | null, url: string) {
  const mime = (type || '').split(';')[0].trim().toLowerCase();
  const byMime: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'video/mp4': 'mp4', 'video/webm': 'webm' };
  if (byMime[mime]) return byMime[mime];
  const match = new URL(url, window.location.origin).pathname.match(/\.([a-z0-9]{2,5})$/i);
  return match?.[1]?.toLowerCase() || 'bin';
}

function canvasBlob(canvas: HTMLCanvasElement, type = 'image/png', quality = 0.94) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen')), type, quality));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Imagen no disponible'));
    image.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

async function guestCardBlob(data: InvitationParsed, guest: Guest, publicUrl: string) {
  const width = 1200; const height = 1600;
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas no disponible');
  const primary = safeCssColor(data.config?.theme?.primary || data.color_primary, '#b8975a');
  const bg = safeCssColor(data.config?.theme?.bg || data.color_secondary, '#f7f3ec');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = primary; ctx.lineWidth = 4; ctx.strokeRect(54, 54, width - 108, height - 108);
  ctx.textAlign = 'center'; ctx.fillStyle = primary; ctx.font = '600 25px Arial'; ctx.fillText('INVITACIÓN PERSONAL', width / 2, 150);
  ctx.fillStyle = '#2d2924'; ctx.font = '64px Georgia'; ctx.fillText(data.names || 'Nuestro evento', width / 2, 255, width - 150);
  ctx.fillStyle = '#655e55'; ctx.font = '32px Arial'; ctx.fillText('Tenemos un lugar reservado para', width / 2, 355);
  ctx.fillStyle = '#2d2924'; ctx.font = 'bold 58px Georgia';
  const name = guest.name.length > 32 ? `${guest.name.slice(0, 31)}…` : guest.name;
  ctx.fillText(name, width / 2, 445, width - 150);
  const url = `${publicUrl}?g=${encodeURIComponent(guest.publicId)}`;
  const qrUrl = await QRCode.toDataURL(url, { width: 560, margin: 2, color: { dark: '#211b14', light: '#ffffff' } });
  const qr = await loadImage(qrUrl); ctx.drawImage(qr, 330, 535, 540, 540);
  const detail = [`${guest.passes} ${guest.passes === 1 ? 'pase' : 'pases'}`, guest.tableNo ? `Mesa ${guest.tableNo}` : 'Mesa por asignar', guest.accessCode || 'Código al confirmar'];
  ctx.font = 'bold 28px Arial'; ctx.fillStyle = primary; ctx.fillText(detail.join('  ·  '), width / 2, 1165);
  ctx.font = '27px Arial'; ctx.fillStyle = '#655e55'; ctx.fillText('Escanea para ver tu invitación y confirmar asistencia', width / 2, 1240);
  ctx.font = '22px Arial'; ctx.fillStyle = '#8b8379'; ctx.fillText(url.replace(/^https?:\/\//, ''), width / 2, 1310);
  ctx.font = 'italic 24px Georgia'; ctx.fillStyle = primary; ctx.fillText('Enkarta', width / 2, 1460);
  return canvasBlob(canvas);
}

async function socialAssetBlob(data: InvitationParsed, size: { width: number; height: number; label: string }) {
  const canvas = document.createElement('canvas'); canvas.width = size.width; canvas.height = size.height;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas no disponible');
  const primary = safeCssColor(data.config?.theme?.primary || data.color_primary, '#b8975a');
  const bg = safeCssColor(data.config?.theme?.bg || data.color_secondary, '#f7f3ec');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, size.width, size.height);
  if (data.cover_image_url) {
    try { const image = await loadImage(data.cover_image_url); drawCover(ctx, image, size.width, size.height); ctx.fillStyle = 'rgba(18,15,12,.52)'; ctx.fillRect(0, 0, size.width, size.height); } catch { /* la paleta mantiene la pieza utilizable */ }
  }
  const pad = Math.round(size.width * 0.07);
  ctx.strokeStyle = 'rgba(255,255,255,.72)'; ctx.lineWidth = Math.max(2, size.width / 500); ctx.strokeRect(pad, pad, size.width - pad * 2, size.height - pad * 2);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = `600 ${Math.round(size.width * 0.026)}px Arial`; ctx.fillText('SAVE THE DATE', size.width / 2, size.height * 0.27);
  ctx.font = `${Math.round(size.width * 0.07)}px Georgia`; ctx.fillText((data.names || 'Nuestro evento').slice(0, 42), size.width / 2, size.height * 0.39, size.width * 0.84);
  ctx.font = `500 ${Math.round(size.width * 0.033)}px Arial`; ctx.fillText((data.event_date || '').slice(0, 10), size.width / 2, size.height * 0.49);
  ctx.fillStyle = primary; ctx.fillRect(size.width * 0.37, size.height * 0.54, size.width * 0.26, Math.max(4, size.width * 0.004));
  ctx.fillStyle = '#fff'; ctx.font = `${Math.round(size.width * 0.025)}px Arial`; ctx.fillText(data.ceremony_place || data.reception_place || 'Muy pronto', size.width / 2, size.height * 0.61);
  ctx.font = `italic ${Math.round(size.width * 0.024)}px Georgia`; ctx.fillText('Invitación digital · Enkarta', size.width / 2, size.height * 0.83);
  return canvasBlob(canvas, 'image/png');
}

function safeName(value: string) {
  return (value || 'invitacion').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function icsEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function htmlEscape(value: string) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
}

function safeCssColor(value: string | undefined, fallback: string) {
  return value && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\))$/i.test(value.trim()) ? value.trim() : fallback;
}

function calendarFile(data: InvitationParsed) {
  const day = (data.event_date || '').slice(0, 10).replace(/-/g, '');
  const match = (data.ceremony_time || '').match(/(\d{1,2}):(\d{2})/);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const start = day
    ? match ? `${day}T${match[1].padStart(2, '0')}${match[2]}00` : day
    : new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const dateKey = match ? 'DTSTART' : 'DTSTART;VALUE=DATE';
  const location = [data.ceremony_place, data.ceremony_address].filter(Boolean).join(', ');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Enkarta//Invitacion//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${data.id || data.slug}@enkarta`,
    `DTSTAMP:${stamp}`,
    `${dateKey}:${start}`,
    `SUMMARY:${icsEscape(data.names || 'Evento')}`,
    `LOCATION:${icsEscape(location)}`,
    `DESCRIPTION:${icsEscape(data.message || 'Te esperamos para celebrar juntos.')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function ExportCard({ icon, title, desc, format, onClick, busy, disabled }: { icon: string; title: string; desc: string; format: string; onClick: () => void; busy?: boolean; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={busy || disabled} className="group w-full rounded-2xl border border-gray-100 bg-white p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-enkarta-gold/40 hover:shadow-md disabled:opacity-60">
      <span className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5efe3] text-lg">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-outfit font-medium text-gray-800">{busy ? 'Preparando…' : title}</span>
            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-outfit font-semibold text-gray-400">{format}</span>
          </span>
          <span className="mt-0.5 block text-[11px] font-outfit leading-relaxed text-gray-400">{desc}</span>
        </span>
        <span className="mt-2 text-gray-300 transition-colors group-hover:text-enkarta-gold">↓</span>
      </span>
    </button>
  );
}

export default function ExportPanel({ data }: Props) {
  const [activity, setActivity] = useState<{ attempt: ExportAttempt; progress: string } | null>(null);
  const [copiedContext, setCopiedContext] = useState<{ query: ExportQuery; data: InvitationParsed } | null>(null);
  const [snapshot, setSnapshot] = useState<ExportSnapshot | null>(null);
  const [, renderQuery] = useState(0);
  const latestData = useRef(data), mounted = useRef(false);
  latestData.current = data;
  const guestMeta = data.config?.guestMeta;
  const queryRef = useRef<ExportQuery>({ id: data.id, guestMeta });
  if (queryRef.current.id !== data.id || queryRef.current.guestMeta !== guestMeta) queryRef.current = { id: data.id, guestMeta };
  const query = queryRef.current;
  const read = useRef<{ query: ExportQuery; controller: AbortController } | null>(null);
  const result = useRef<ExportSnapshot | null>(null);
  const operation = useRef<ExportAttempt | null>(null);
  const copyOperation = useRef<object | null>(null);
  const currentData = () => mounted.current && latestData.current === data && queryRef.current === query;
  const currentExport = (attempt: ExportAttempt) => mounted.current && operation.current === attempt
    && !attempt.controller.signal.aborted && latestData.current === attempt.data && queryRef.current === attempt.query
    && (!attempt.snapshot || result.current === attempt.snapshot);
  const currentSnapshot = snapshot?.query === query ? snapshot : null;
  const analytics = currentSnapshot?.analytics ?? null;
  const guests = currentSnapshot?.guests ?? [];
  const guestsReady = !!currentSnapshot && !currentSnapshot.error;
  const busy = activity && currentExport(activity.attempt) ? activity.attempt.kind : null;
  const progress = busy ? activity?.progress ?? '' : '';
  const copied = copiedContext?.query === query && copiedContext.data === data;
  const file = safeName(data.names || data.slug);
  const publicUrl = typeof window === 'undefined' ? `/i/${data.slug}` : `${window.location.origin}/i/${data.slug}`;

  useEffect(() => {
    mounted.current = true;
    const request = { query, controller: new AbortController() };
    read.current = request; result.current = null; operation.current = null; copyOperation.current = null;
    setSnapshot(null); setActivity(null); setCopiedContext(null);
    const current = () => mounted.current && read.current === request && queryRef.current === query && !request.controller.signal.aborted;
    const fetchJson = async (url: string) => {
      const response = await fetch(url, { cache: 'no-store', signal: request.controller.signal });
      if (!current()) return null;
      if (!response.ok) throw new Error('query-failed');
      const value = await response.json();
      return current() ? value : null;
    };
    Promise.all([
      fetchJson(`/api/admin/analytics?id=${query.id}`).catch(() => null),
      fetchJson(`/api/guests?id=${query.id}`),
    ]).then(([summary, rawGuests]) => {
      if (!current()) return;
      if (!Array.isArray(rawGuests)) throw new Error('invalid-guests');
      const meta = query.guestMeta ?? {};
      const next: ExportSnapshot = { query, analytics: summary && typeof summary === 'object' && !Array.isArray(summary)
        && Array.isArray(summary.trend) && Array.isArray(summary.funnel) && Array.isArray(summary.sources) && summary.engagement && summary.scroll ? summary as AnalyticsSummary : null,
      guests: (rawGuests as Guest[]).map(guest => ({ ...guest, ...(meta[guest.publicId] ?? {}) })), error: '' };
      result.current = next; setSnapshot(next);
    }).catch(() => {
      if (!current()) return;
      const next: ExportSnapshot = { query, analytics: null, guests: [], error: 'No se pudo consultar el padrón. Reintenta la consulta antes de exportar invitados.' };
      result.current = next; setSnapshot(next);
    }).finally(() => { if (read.current === request) read.current = null; });
    return () => {
      mounted.current = false; if (operation.current) { clearTimeout(operation.current.timer); operation.current.controller.abort(); } result.current = null; operation.current = null; copyOperation.current = null;
      if (read.current === request) read.current = null;
      request.controller.abort();
    };
  }, [query]);

  const retry = () => {
    if (!currentData()) return;
    queryRef.current = { id: query.id, guestMeta: query.guestMeta };
    renderQuery(value => value + 1);
  };
  const startExport = (kind: string, needsGuests = false) => {
    if (!currentData()) return null;
    if (operation.current && currentExport(operation.current)) return null;
    const ready = result.current?.query === query && !result.current.error ? result.current : null;
    if (needsGuests && !ready) return null;
    if (operation.current) { clearTimeout(operation.current.timer); operation.current.controller.abort(); }
    const attempt: ExportAttempt = { controller: new AbortController(), query, data, kind, ...(needsGuests ? { snapshot: ready! } : {}) };
    operation.current = attempt; setActivity({ attempt, progress: '' });
    attempt.timer = setTimeout(() => {
      if (operation.current !== attempt) return;
      const visible = currentExport(attempt); operation.current = null; attempt.controller.abort();
      if (mounted.current) setActivity(null);
      if (visible) alert('La exportación no terminó en 90 segundos. No se descargaron archivos incompletos; puedes volver a prepararla.');
    }, 90_000);
    return attempt;
  };
  const exportProgress = (attempt: ExportAttempt, value: string) => {
    if (currentExport(attempt)) setActivity(previous => previous?.attempt === attempt ? { attempt, progress: value } : previous);
  };
  const finishExport = (attempt: ExportAttempt) => {
    clearTimeout(attempt.timer);
    if (operation.current === attempt) { operation.current = null; if (mounted.current) setActivity(null); }
    attempt.controller.abort();
  };

  const exportBlob = (attempt: ExportAttempt, url: string) => boundedBuilderTask(async signal => {
    const response = await fetch(url, { cache: 'no-store', signal });
    if (!response.ok) throw new Error('No se pudo descargar el recurso.');
    return response.blob();
  }, { signal: attempt.controller.signal });

  const downloadQr = async () => {
    const attempt = startExport('qr'); if (!attempt) return;
    try {
      const url = await QRCode.toDataURL(publicUrl, { width: 1200, margin: 4, color: { dark: data.config?.theme?.primaryDeep || '#211b14', light: '#ffffff' } });
      if (!currentExport(attempt)) return;
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file}-qr.png`;
      a.click();
    } catch (error) { if (currentExport(attempt)) alert(error instanceof Error ? error.message : 'No se pudo crear el QR'); }
    finally { finishExport(attempt); }
  };

  const downloadCover = async () => {
    const attempt = startExport('cover'); if (!attempt) return;
    try {
      const blob = await exportBlob(attempt, `/i/${data.slug}/opengraph-image`);
      if (currentExport(attempt)) downloadBlob(blob, `${file}-portada.png`);
    } catch {
      if (currentExport(attempt)) alert('No se pudo descargar la portada. Comprueba la conexión y vuelve a prepararla.');
    } finally { finishExport(attempt); }
  };

  const downloadBackup = () => {
    if (!currentData()) return;
    const backup = {
      enkartaVersion: 2,
      exportedAt: new Date().toISOString(),
      invitation: data,
    };
    downloadBlob(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' }), `${file}-diseno.json`);
  };

  const downloadCalendar = () => { if (currentData()) downloadBlob(new Blob([calendarFile(data)], { type: 'text/calendar;charset=utf-8' }), `${file}.ics`); };

  const downloadQrCard = async () => {
    const attempt = startExport('qr-card'); if (!attempt) return;
    try {
      const qr = await QRCode.toDataURL(publicUrl, { width: 720, margin: 2, color: { dark: data.config?.theme?.primaryDeep || '#211b14', light: '#ffffff' } });
      if (!currentExport(attempt)) return;
      const primary = safeCssColor(data.config?.theme?.primary || data.color_primary, '#ad8448');
      const bg = safeCssColor(data.config?.theme?.bg || data.color_secondary, '#f7f3ec');
      const title = htmlEscape(data.names || 'Invitación');
      const eventLine = htmlEscape(`${(data.event_date || '').slice(0, 10)} · ${data.ceremony_place || data.reception_place || ''}`);
      const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:${bg};font-family:Georgia,serif;color:#302a23}.card{width:520px;text-align:center;padding:64px 52px;background:#fff;border:1px solid ${primary};border-radius:32px;box-shadow:0 24px 80px #0002}.eyebrow{font:12px Arial,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:${primary}}h1{font-size:44px;font-weight:400;margin:18px 0 6px}p{color:#756c62}img{width:260px;margin:26px auto 16px;display:block}.url{font:13px Arial,sans-serif;color:${primary};word-break:break-all}@media print{body{background:white}.card{box-shadow:none}}</style><body><main class="card"><div class="eyebrow">Estás invitado</div><h1>${title}</h1><p>${eventLine}</p><img src="${qr}" alt="Código QR"><p>Escanea para abrir la invitación digital</p><div class="url">${htmlEscape(publicUrl)}</div></main></body></html>`;
      downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${file}-tarjeta-qr.html`);
    } catch (error) { if (currentExport(attempt)) alert(error instanceof Error ? error.message : 'No se pudo crear la tarjeta QR'); }
    finally { finishExport(attempt); }
  };

  const downloadAnalytics = () => {
    if (!currentData()) return;
    const analytics = result.current?.query === query ? result.current.analytics : null;
    if (!analytics) return;
    const rows = [
      ['Métrica', 'Valor'], ['Vistas', analytics.views], ['Visitantes únicos', analytics.uniqueVisitors], ['Invitados', analytics.guests], ['Enviadas', analytics.sent], ['Confirmados', analytics.confirmed], ['No asisten', analytics.declined], ['Pendientes', analytics.pending], ['RSVP abiertos', analytics.openRsvps], ['Pases confirmados', analytics.confirmedPasses], ['Pases totales', analytics.totalPasses], ['Tasa de respuesta', `${analytics.responseRate}%`], ['Conversión por vista', `${analytics.conversionRate}%`],
      [], ['Interacción', 'Total'], ['Aperturas de portada', analytics.engagement.entryOpens], ['Scroll 25%', analytics.scroll.reach25], ['Scroll 50%', analytics.scroll.reach50], ['Scroll 75%', analytics.scroll.reach75], ['Scroll 100%', analytics.scroll.reach100], ['Clics en acciones', analytics.engagement.ctaClicks], ['Música', analytics.engagement.musicToggles], ['Inicios RSVP', analytics.engagement.rsvpStarts], ['Envíos RSVP', analytics.engagement.rsvpSubmits], ['Mapas abiertos', analytics.engagement.mapOpens], ['Calendarios', analytics.engagement.calendarAdds], ['Galerías', analytics.engagement.galleryOpens], ['Compartidos', analytics.engagement.shares], ['Enlaces externos', analytics.engagement.externalLinks],
      [], ['Embudo', 'Sesiones', 'Conversión'], ...analytics.funnel.map(stage => [stage.stage, stage.value, `${stage.rate}%`]),
      [], ['Fuente', 'Vistas'], ...analytics.sources.map(source => [source.label, source.value]),
      [], ['Día', 'Respuestas'], ...analytics.trend.map(day => [day.date, day.responses]),
    ];
    downloadBlob(new Blob(['\uFEFF' + rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${file}-analitica.csv`);
  };

  const staticPdfPages = (): PdfPage[] => {
    const lines = [
      `Fecha: ${(data.event_date || 'Por definir').slice(0, 10)}`,
      `Ceremonia: ${[data.ceremony_time, data.ceremony_place, data.ceremony_address].filter(Boolean).join(' · ') || 'Por definir'}`,
      `Recepción: ${[data.reception_time, data.reception_place, data.reception_address].filter(Boolean).join(' · ') || 'Por definir'}`,
      data.dress_code ? `Código de vestimenta: ${data.dress_code}` : '',
      data.message || '',
      `Invitación digital: ${publicUrl}`,
    ].filter(Boolean);
    const itinerary = data.itinerary.map(item => `${item.time} · ${item.label}`);
    return [
      { eyebrow: 'Invitación estática', title: data.names || 'Nuestro evento', subtitle: 'Una versión ligera y lista para imprimir de la información esencial.', lines, footer: `Enkarta · ${publicUrl.replace(/^https?:\/\//, '')}` },
      ...(itinerary.length ? [{ eyebrow: 'Programa', title: 'Itinerario', subtitle: 'Horarios previstos para la celebración.', lines: itinerary }] : []),
    ];
  };

  const downloadStaticPdf = () => { if (currentData()) downloadBlob(createTextPdf(staticPdfPages()), `${file}-invitacion.pdf`); };

  const downloadPackage = async () => {
    const attempt = startExport('package'); if (!attempt) return;
    exportProgress(attempt, 'Preparando archivos esenciales');
    try {
      const entries: ZipEntryInput[] = [];
      const qr = await QRCode.toDataURL(publicUrl, { width: 1200, margin: 4, color: { dark: data.config?.theme?.primaryDeep || '#211b14', light: '#ffffff' } });
      if (!currentExport(attempt)) return;
      const qrBlob = await exportBlob(attempt, qr);
      if (!currentExport(attempt)) return;
      entries.push({ name: '01-compartir/codigo-qr.png', data: qrBlob });
      entries.push({ name: '02-calendario/evento.ics', data: calendarFile(data) });
      entries.push({ name: '03-documentos/invitacion-estatica.pdf', data: createTextPdf(staticPdfPages()) });
      entries.push({ name: '03-documentos/contenido.txt', data: [data.names, data.event_date, data.message, data.ceremony_place, data.ceremony_address, data.reception_place, data.reception_address, publicUrl].filter(Boolean).join('\r\n\r\n') });
      entries.push({ name: '04-respaldo/diseno.json', data: JSON.stringify({ enkartaVersion: 2, exportedAt: new Date().toISOString(), invitation: data }, null, 2) });
      entries.push({ name: 'LEEME.txt', data: `Paquete Enkarta · ${data.names || data.slug}\r\nGenerado: ${new Date().toLocaleString('es-BO')}\r\nURL: ${publicUrl}\r\n\r\nIncluye QR, calendario, PDF estático, textos, respaldo y recursos visuales disponibles.` });

      try {
        const coverBlob = await exportBlob(attempt, `/i/${data.slug}/opengraph-image`);
        if (!currentExport(attempt)) return;
        {
          if (!currentExport(attempt)) return;
          entries.push({ name: '01-compartir/portada.png', data: coverBlob });
        }
      } catch { /* el resto del paquete sigue siendo válido */ }

      if (!currentExport(attempt)) return;
      const photos = collectPublicationResources(data).filter(resource => resource.kind === 'image').slice(0, 30);
      const unavailable: string[] = [];
      for (let index = 0; index < photos.length; index += 1) {
        const resource = photos[index];
        exportProgress(attempt, `Descargando imagen ${index + 1} de ${photos.length}`);
        try {
          const blob = await exportBlob(attempt, resource.url);
          if (!currentExport(attempt)) return;
          if (blob.size > 12_000_000) throw new Error('too-heavy');
          entries.push({ name: `05-fotos/foto-${String(index + 1).padStart(2, '0')}.${extensionFor(blob.type, resource.url)}`, data: blob });
        } catch { if (!currentExport(attempt)) return; unavailable.push(`${resource.label}: ${resource.url}`); }
      }
      if (unavailable.length) entries.push({ name: '05-fotos/enlaces-no-incluidos.txt', data: unavailable.join('\r\n') });
      exportProgress(attempt, 'Comprimiendo paquete');
      const zip = await createStoredZip(entries);
      if (currentExport(attempt)) downloadBlob(zip, `${file}-paquete-completo.zip`);
    } catch (error) {
      if (currentExport(attempt)) alert(error instanceof Error ? error.message : 'No se pudo crear el paquete');
    } finally { finishExport(attempt); }
  };

  const downloadGuestCards = async () => {
    const attempt = startExport('guest-png', true); if (!attempt) return;
    const guests = attempt.snapshot!.guests;
    if (!guests.length) { alert('Agrega invitados antes de generar tarjetas individuales.'); finishExport(attempt); return; }
    try {
      const entries: ZipEntryInput[] = [];
      for (let index = 0; index < guests.length; index += 1) {
        const guest = guests[index];
        exportProgress(attempt, `Creando tarjeta ${index + 1} de ${guests.length}`);
        const blob = await guestCardBlob(data, guest, publicUrl);
        if (!currentExport(attempt)) return;
        entries.push({ name: `${String(index + 1).padStart(3, '0')}-${safeName(guest.name)}.png`, data: blob });
      }
      const zip = await createStoredZip(entries);
      if (currentExport(attempt)) downloadBlob(zip, `${file}-tarjetas-personales-png.zip`);
    } catch (error) { if (currentExport(attempt)) alert(error instanceof Error ? error.message : 'No se pudieron generar las tarjetas'); }
    finally { finishExport(attempt); }
  };

  const downloadGuestPdf = async () => {
    const attempt = startExport('guest-pdf', true); if (!attempt) return;
    const guests = attempt.snapshot!.guests;
    if (!guests.length) { alert('Agrega invitados antes de generar tarjetas individuales.'); finishExport(attempt); return; }
    const pages: PdfPage[] = guests.map(guest => ({
      eyebrow: 'Invitación personal', title: guest.name,
      subtitle: data.names || 'Nuestro evento',
      lines: [
        `Fecha: ${(data.event_date || 'Por definir').slice(0, 10)}`,
        `${guest.passes} ${guest.passes === 1 ? 'pase asignado' : 'pases asignados'}`,
        guest.tableNo ? `Mesa: ${guest.tableNo}` : 'Mesa: por asignar',
        guest.group ? `Grupo: ${guest.group}` : '',
        guest.eventAccess && guest.eventAccess !== 'both' ? `Acceso: ${guest.eventAccess === 'ceremony' ? 'ceremonia' : 'recepción'}` : 'Acceso: ceremonia y recepción',
        guest.accessCode ? `Código de acceso: ${guest.accessCode}` : 'El código de acceso se generará al confirmar',
        `Enlace personal: ${publicUrl}?g=${encodeURIComponent(guest.publicId)}`,
      ].filter(Boolean),
    }));
    try {
      const entries: ZipEntryInput[] = [{ name: '000-todas-las-tarjetas.pdf', data: createTextPdf(pages) }];
      pages.forEach((page, index) => entries.push({ name: `${String(index + 1).padStart(3, '0')}-${safeName(guests[index].name)}.pdf`, data: createTextPdf([page]) }));
      exportProgress(attempt, 'Empaquetando PDFs individuales');
      const zip = await createStoredZip(entries);
      if (currentExport(attempt)) downloadBlob(zip, `${file}-tarjetas-personales-pdf.zip`);
    } catch (error) { if (currentExport(attempt)) alert(error instanceof Error ? error.message : 'No se pudieron generar los PDFs'); }
    finally { finishExport(attempt); }
  };

  const downloadSocialKit = async () => {
    const attempt = startExport('social'); if (!attempt) return;
    try {
      const sizes = [
        { width: 1080, height: 1920, label: 'story-1080x1920' },
        { width: 1080, height: 1350, label: 'post-1080x1350' },
        { width: 1200, height: 630, label: 'whatsapp-1200x630' },
      ];
      const entries: ZipEntryInput[] = [];
      for (let index = 0; index < sizes.length; index += 1) {
        exportProgress(attempt, `Diseñando formato ${index + 1} de ${sizes.length}`);
        const blob = await socialAssetBlob(data, sizes[index]);
        if (!currentExport(attempt)) return;
        entries.push({ name: `${sizes[index].label}.png`, data: blob });
      }
      entries.push({ name: 'texto-para-publicar.txt', data: `${data.names || 'Nuestro evento'}\r\n${(data.event_date || '').slice(0, 10)}\r\n${publicUrl}` });
      const zip = await createStoredZip(entries);
      if (currentExport(attempt)) downloadBlob(zip, `${file}-kit-redes.zip`);
    } catch (error) { if (currentExport(attempt)) alert(error instanceof Error ? error.message : 'No se pudo crear el kit social'); }
    finally { finishExport(attempt); }
  };

  const downloadTablesPdf = () => {
    if (!currentData()) return;
    const ready = result.current?.query === query && !result.current.error ? result.current : null;
    if (!ready) return;
    const guests = ready.guests;
    if (!guests.length) { alert('Agrega invitados antes de imprimir mesas y accesos.'); return; }
    const grouped = new Map<string, Guest[]>();
    guests.forEach(guest => { const key = guest.tableNo || 'Sin mesa'; grouped.set(key, [...(grouped.get(key) || []), guest]); });
    const pages: PdfPage[] = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b, 'es', { numeric: true })).flatMap(([table, tableGuests]) => {
      const sorted = tableGuests.sort((a, b) => a.name.localeCompare(b.name));
      const chunks = Array.from({ length: Math.ceil(sorted.length / 34) }, (_, index) => sorted.slice(index * 34, index * 34 + 34));
      return chunks.map((chunk, index) => ({
        eyebrow: 'Control de accesos', title: `${table === 'Sin mesa' ? table : `Mesa ${table}`}${chunks.length > 1 ? ` · ${index + 1}/${chunks.length}` : ''}`,
        subtitle: `${tableGuests.length} grupos · ${tableGuests.reduce((sum, guest) => sum + guest.passes, 0)} pases asignados`,
        lines: chunk.map(guest => `${guest.status === 'confirmed' ? '[CONFIRMADO]' : guest.status === 'declined' ? '[NO ASISTE]' : '[PENDIENTE]'}  ${guest.name} · ${guest.confirmedPasses ?? guest.passes} pases · ${guest.accessCode || 'sin código'}`),
      }));
    });
    downloadBlob(createTextPdf(pages), `${file}-mesas-y-accesos.pdf`);
  };

  const copyLink = async () => {
    if (!currentData()) return;
    const attempt = {}; copyOperation.current = attempt;
    try {
      await navigator.clipboard.writeText(publicUrl);
      if (!currentData() || copyOperation.current !== attempt) return;
      setCopiedContext({ query, data });
      setTimeout(() => { if (currentData() && copyOperation.current === attempt) setCopiedContext(null); }, 1600);
    } catch { /* no se anuncia una copia que no pudo completarse */ }
  };

  return (
    <div className="space-y-5 p-4">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-3.5">
        <div className="flex items-center justify-between"><div><p className="text-[10px] font-outfit font-semibold uppercase tracking-[0.18em] text-emerald-600">Rendimiento</p><h3 className="font-playfair text-lg text-gray-800">Embudo de la invitación</h3></div>{analytics && <button type="button" onClick={downloadAnalytics} className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[10px] font-outfit text-emerald-700">↓ CSV</button>}</div>
        {analytics ? <>
          <div className="mt-3 grid grid-cols-4 gap-1.5">{[
            ['Vistas', analytics.views], ['Únicos', analytics.uniqueVisitors], ['Confirman', analytics.confirmed + analytics.openRsvps], ['Pases', analytics.confirmedPasses],
          ].map(([label, value]) => <div key={label} className="rounded-xl bg-white p-2 text-center shadow-sm"><span className="block font-playfair text-lg font-bold text-emerald-700">{value}</span><span className="block text-[8px] font-outfit uppercase text-gray-400">{label}</span></div>)}</div>
          <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-white p-2.5"><span className="text-[9px] font-outfit uppercase text-gray-400">Respuesta sobre enviadas</span><span className="mt-0.5 block font-playfair text-2xl text-gray-800">{analytics.responseRate}%</span></div><div className="rounded-xl bg-white p-2.5"><span className="text-[9px] font-outfit uppercase text-gray-400">Conversión por vista</span><span className="mt-0.5 block font-playfair text-2xl text-gray-800">{analytics.conversionRate}%</span></div></div>
          <div className="mt-3 flex h-16 items-end gap-1 rounded-xl bg-white px-2 pb-2 pt-3">{analytics.trend.map(day => { const max = Math.max(1, ...analytics.trend.map(item => item.responses)); return <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1"><span title={`${day.responses} respuestas`} className="w-full rounded-t bg-emerald-400/80" style={{ height: `${Math.max(5, (day.responses / max) * 100)}%` }} /><span className="text-[7px] font-outfit uppercase text-gray-400">{day.label}</span></div>; })}</div>
          <div className="mt-3 grid grid-cols-4 gap-1.5">{[
            ['Portada', analytics.engagement.entryOpens], ['RSVP inicia', analytics.engagement.rsvpStarts], ['Mapa', analytics.engagement.mapOpens], ['Calendario', analytics.engagement.calendarAdds],
          ].map(([label, value]) => <div key={label} className="rounded-lg border border-emerald-100 bg-white/75 p-1.5 text-center"><span className="block text-sm font-outfit font-semibold text-emerald-700">{value}</span><span className="block truncate text-[7px] font-outfit uppercase text-gray-400">{label}</span></div>)}</div>
          {analytics.funnel.length > 0 && <div className="mt-3 rounded-xl border border-emerald-100 bg-white p-2.5"><div className="flex items-center justify-between"><p className="text-[9px] font-outfit uppercase tracking-wider text-gray-400">Recorrido del invitado</p><span className="text-[8px] font-outfit text-emerald-600">sesiones agregadas</span></div><div className="mt-2 grid grid-cols-4 gap-1">{analytics.funnel.map((stage, index) => <div key={stage.stage} className="relative rounded-lg bg-emerald-50 px-1 py-2 text-center"><span className="block text-sm font-semibold text-emerald-800 font-outfit">{stage.value}</span><span className="block truncate text-[7px] uppercase text-emerald-600 font-outfit">{stage.stage}</span><span className="block text-[7px] text-gray-400 font-outfit">{stage.rate}%</span>{index < analytics.funnel.length - 1 && <span className="absolute -right-1.5 top-1/2 z-10 -translate-y-1/2 text-[9px] text-emerald-300">›</span>}</div>)}</div></div>}
          <div className="mt-3 grid grid-cols-3 gap-1.5"><div className="rounded-lg bg-white p-2 text-center"><span className="block text-sm font-semibold text-emerald-700 font-outfit">{analytics.scroll.reach75}</span><span className="block text-[7px] uppercase text-gray-400 font-outfit">Llegó al 75%</span></div><div className="rounded-lg bg-white p-2 text-center"><span className="block text-sm font-semibold text-emerald-700 font-outfit">{analytics.engagement.ctaClicks}</span><span className="block text-[7px] uppercase text-gray-400 font-outfit">Clics</span></div><div className="rounded-lg bg-white p-2 text-center"><span className="block text-sm font-semibold text-emerald-700 font-outfit">{analytics.engagement.musicToggles}</span><span className="block text-[7px] uppercase text-gray-400 font-outfit">Música</span></div></div>
          {analytics.sources.length > 0 && <div className="mt-3"><p className="text-[9px] font-outfit uppercase tracking-wider text-gray-400">Fuentes de visita</p><div className="mt-1.5 flex flex-wrap gap-1.5">{analytics.sources.map(source => <span key={source.label} className="rounded-full bg-white px-2 py-1 text-[9px] font-outfit text-gray-500">{source.label} · {source.value}</span>)}</div></div>}
          <p className="mt-2 text-[9px] leading-relaxed text-emerald-700/70 font-outfit">Privacidad: sin IP, nombres, teléfonos ni mensajes. Retención activa: {analytics.retentionDays} días.</p>
          {!analytics.analyticsReady && <p className="mt-2 text-[10px] font-outfit text-amber-600">Aplica las migraciones 004 y 005 para registrar el recorrido detallado.</p>}
        </> : <p role={currentSnapshot ? undefined : 'status'} className="mt-3 text-xs font-outfit text-gray-400">{currentSnapshot ? 'La analítica no está disponible en esta consulta.' : 'Consultando invitados y analítica…'}</p>}
        {currentSnapshot?.error && <p role="alert" className="mt-3 text-xs font-outfit text-red-700">{currentSnapshot.error}</p>}
        {currentSnapshot && (currentSnapshot.error || !analytics) && <button type="button" onClick={retry} className="mt-3 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-outfit text-emerald-700">Reintentar consulta</button>}
      </div>

      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#272117] to-[#5d4a2e] p-4 text-white shadow-lg">
        <p className="text-[10px] font-outfit font-semibold uppercase tracking-[0.18em] text-white/55">Centro de exportación</p>
        <h3 className="mt-1 font-playfair text-xl">Todo listo para compartir</h3>
        <p className="mt-1 text-xs font-outfit leading-relaxed text-white/65">Descarga piezas útiles sin alterar la invitación publicada.</p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={copyLink} className="rounded-xl bg-white px-3 py-2 text-xs font-outfit font-medium text-[#3d3121] transition-transform hover:-translate-y-px">
            {copied ? '✓ Enlace copiado' : 'Copiar enlace'}
          </button>
          <a href={`/i/${data.slug}?full=1`} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/20 px-3 py-2 text-xs font-outfit text-white/85 hover:bg-white/10">
            Abrir invitación ↗
          </a>
        </div>
      </div>

      {busy && progress && <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-3"><span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"/><div className="min-w-0"><p className="text-xs font-semibold text-amber-800 font-outfit">Generando exportación</p><p className="truncate text-[10px] text-amber-600 font-outfit">{progress}</p></div></div>}

      <div className="space-y-2.5">
        <ExportCard icon="✦" title="Paquete completo" desc="Portada, QR, calendario, PDF, textos, respaldo y hasta 30 recursos." format="ZIP" onClick={() => void downloadPackage()} busy={busy === 'package'} disabled={!!busy} />
        <ExportCard icon="▦" title="Código QR" desc="Para tarjetas impresas, mesas y recordatorios." format="PNG" onClick={downloadQr} busy={busy === 'qr'} disabled={!!busy} />
        <ExportCard icon="▤" title="Tarjeta QR imprimible" desc="Mini landing autocontenida para imprimir o convertir a PDF." format="HTML" onClick={downloadQrCard} busy={busy === 'qr-card'} disabled={!!busy} />
        <ExportCard icon="▣" title="Portada para compartir" desc="Imagen horizontal optimizada para WhatsApp y redes." format="PNG" onClick={downloadCover} busy={busy === 'cover'} disabled={!!busy} />
        <ExportCard icon="Aa" title="Invitación estática" desc="Documento A4 multipágina, ligero y optimizado para impresión." format="PDF" onClick={downloadStaticPdf} />
        <ExportCard icon="◫" title="Kit para redes" desc="Story, post vertical y pieza horizontal listos para publicar." format="ZIP · PNG" onClick={() => void downloadSocialKit()} busy={busy === 'social'} disabled={!!busy} />
        <ExportCard icon="◉" title={`Tarjetas por invitado${guests.length ? ` · ${guests.length}` : ''}`} desc="Una tarjeta PNG con QR y enlace único para cada invitado." format="ZIP · PNG" onClick={() => void downloadGuestCards()} busy={busy === 'guest-png'} disabled={!!busy || !guestsReady} />
        <ExportCard icon="▥" title="Tarjetas personales imprimibles" desc="Un PDF individual por invitado y un documento combinado." format="ZIP · PDF" onClick={() => void downloadGuestPdf()} busy={busy === 'guest-pdf'} disabled={!!busy || !guestsReady} />
        <ExportCard icon="▦" title="Mesas y control de accesos" desc="Resumen agrupado por mesa para coordinación y puerta." format="PDF" onClick={downloadTablesPdf} disabled={!guestsReady} />
        <ExportCard icon="◷" title="Agregar al calendario" desc="Archivo compatible con Google, Apple y Outlook." format="ICS" onClick={downloadCalendar} />
        <ExportCard icon="◇" title="Copia del diseño" desc="Respaldo completo de contenido, bloques, estilos y animaciones." format="JSON" onClick={downloadBackup} />
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3.5">
        <p className="text-xs font-outfit font-medium text-indigo-800">Dos formas de conservarla</p>
        <p className="mt-1 text-[11px] font-outfit leading-relaxed text-indigo-600">El PDF estático prioriza legibilidad e impresión. La versión web conserva videos, música, animaciones, enlaces y personalización.</p>
        <div className="mt-2 flex gap-3"><button type="button" onClick={downloadStaticPdf} className="text-xs font-semibold text-indigo-700 underline underline-offset-4 font-outfit">Descargar PDF</button><a href={`/i/${data.slug}?full=1`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-indigo-700 underline underline-offset-4 font-outfit">Abrir versión web</a></div>
      </div>
    </div>
  );
}
