'use client';

import { useMemo, useRef, useState } from 'react';
import CommercialDashboard from '@/components/admin/CommercialDashboard';
import { COMMERCIAL_LEAD_STATUSES, leadStatusLabel } from '@/lib/commercial';
import { commercialTimestamp, decodeCommercialCursor, encodeCommercialCursor, type CommercialDashboard as Dashboard } from '@/lib/commercial-dashboard';
import { parseCommercialUpdate } from '@/lib/commercial-update';
import type { CommercialLead } from '@/lib/commercial-lookup';
import { clearSalesDraft } from '@/lib/sales-draft';
import { clearCommercialPending, readCommercialPending } from '@/lib/commercial-pending';
import { clearCommercialDraft, readCommercialDrafts } from '@/lib/commercial-drafts';

const anchor = '2026-10-19T12:00:00.000000Z';
function fixtures(): CommercialLead[] {
  const rows: CommercialLead[] = Array.from({ length: 1255 }, (_, index) => ({ id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, reference: `EK-${(index + 1).toString(16).toUpperCase().padStart(8, '0')}`, status: COMMERCIAL_LEAD_STATUSES[index % 5], package_key: 'premium', design: 'Lunaria', event_category: 'Boda', placement: 'qa-dashboard', utm_source: 'QA ficticio', utm_medium: '', utm_campaign: '', referrer_host: '', revenue_bs: index % 5 === 3 ? 10 : null, notes: '', revision: 0, created_at: `2026-10-18T12:00:00.${String(999999 - index).padStart(6, '0')}Z`, updated_at: '2026-10-19T12:00:00.000000Z' }));
  rows.push({ ...rows[0], id: '30000000-0000-4000-8000-000000009999', reference: 'EK-ABCDEF99', created_at: '2001-01-01T12:00:00.000000Z', notes: 'Contacto histórico ficticio', status: 'contacted' });
  rows.push({ ...rows[0], id: '30000000-0000-4000-8000-000000009998', reference: 'EK-ABCDEF98', created_at: '2001-01-01T12:00:00.000000Z', package_key: 'general', event_category: '', design: '', notes: 'Contacto sin paquete ficticio', status: 'contacted' });
  return rows;
}
type Mode = 'ok' | 'offline' | 'once' | 'truncated' | 'slow' | 'migration' | 'lost-save';
const control = 'min-h-11 rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-900';

export default function CommercialDashboardWorkbench() {
  const [mode, setMode] = useState<Mode>('ok'), [mount, setMount] = useState(0), [attempts, setAttempts] = useState(0), [visible, setVisible] = useState(true);
  const [notice, setNotice] = useState('');
  const behavior = useRef(mode), server = useRef(fixtures()), receipts = useRef(new Map<string, unknown>());
  behavior.current = mode;
  const transport = useMemo<typeof fetch>(() => async (input, options) => {
    const url = new URL(String(input), 'https://enkarta.invalid');
    if (url.pathname === '/api/admin/sales-config') return Response.json({ paymentInstructions: '', paymentConfigured: false, salesHours: 'QA ficticio', draftScope: 'e'.repeat(64) });
    if (url.pathname === '/api/admin/commercial/lookup') return Response.json({ lead: server.current.find(row => row.reference === url.searchParams.get('reference')) ?? null });
    if (url.pathname !== '/api/admin/commercial') throw Error('Unexpected fictional route');
    if (options?.method === 'PATCH') {
      const command = parseCommercialUpdate(JSON.parse(String(options.body)));
      if (!command) return Response.json({ code: 'INVALID_UPDATE' }, { status: 400 });
      const prior = receipts.current.get(command.requestId); if (prior) return Response.json({ ...(prior as object), outcome: 'replayed' });
      const lead = server.current.find(row => row.id === command.id);
      if (!lead) return Response.json({ code: 'NOT_FOUND' }, { status: 404 });
      if (lead.revision !== command.expectedRevision) return Response.json({ code: 'REVISION_CONFLICT', requestId: command.requestId, lead }, { status: 409 });
      Object.assign(lead, { status: command.status, revenue_bs: command.revenueBs, notes: command.notes, revision: lead.revision + 1 });
      const result = { lead: { ...lead }, outcome: 'saved', requestId: command.requestId }; receipts.current.set(command.requestId, result);
      if (behavior.current === 'lost-save') { behavior.current = 'ok'; setMode('ok'); throw new TypeError('QA response lost after fictional commit'); }
      return Response.json(result);
    }
    setAttempts(value => value + 1);
    if (behavior.current === 'once') { behavior.current = 'ok'; setMode('ok'); throw new TypeError('QA one failed page'); }
    if (behavior.current === 'offline') throw new TypeError('QA offline');
    if (behavior.current === 'migration') return Response.json({ code: 'MIGRATION_REQUIRED' }, { status: 503 });
    if (behavior.current === 'slow') await new Promise(resolve => setTimeout(resolve, 1200));
    const status = url.searchParams.get('status') || 'all', cursor = decodeCommercialCursor(url.searchParams.get('cursor'));
    const cohort = server.current.filter(row => Date.parse(row.created_at) >= Date.parse(anchor) - 180 * 86400000);
    const rows = cohort.filter(row => status === 'all' || row.status === status), eligible = rows.filter(row => !cursor || row.created_at < cursor.createdAt || (row.created_at === cursor.createdAt && row.id < cursor.id));
    const page = eligible.slice(0, 25), hasMore = eligible.length > 25, last = page[page.length - 1];
    const contacts = cohort.filter(row => row.status !== 'whatsapp_open').length, reserved = cohort.filter(row => ['reserved', 'won'].includes(row.status)).length, sales = cohort.filter(row => row.status === 'won').length, revenue = cohort.filter(row => row.status === 'won').reduce((sum, row) => sum + (row.revenue_bs ?? 0), 0);
    const group = [{ label: 'QA ficticio', opens: 1255, contacts, sales }];
    const body: Dashboard = { periodDays: 180, asOf: cursor?.asOf ?? anchor, syncedAt: commercialTimestamp(new Date().toISOString())!, summary: { visits: 1501, landingViews: 1500, designViews: 2, processViews: 1, whatsappOpens: 1255, contacts, reserved, sales, revenue, intentRate: Math.round(1255 / 1501 * 100), conversationRate: Math.round(contacts / 1255 * 100), closeRate: Math.round(sales / contacts * 100) }, sources: group, campaigns: group, packages: group, events: group, designs: [{ ...group[0], label: 'Lunaria' }], statuses: COMMERCIAL_LEAD_STATUSES.map(value => ({ status: value, label: leadStatusLabel(value), value: cohort.filter(row => row.status === value).length })), leads: page, pagination: { size: 25, total: rows.length, hasMore, nextCursor: hasMore ? encodeCommercialCursor({ asOf: cursor?.asOf ?? anchor, createdAt: last.created_at, id: last.id, status: status as 'all' }) : null } };
    return Response.json(behavior.current === 'truncated' ? { ...body, leads: page.slice(0, 24) } : body);
  }, []);
  const clean = () => {
    const storage = { getItem: (key: string) => window.sessionStorage.getItem(key), setItem: (key: string, value: string) => window.sessionStorage.setItem(key, value), removeItem: (key: string) => window.sessionStorage.removeItem(key) };
    const pending = readCommercialPending(storage, 'e'.repeat(64));
    if (pending.kind !== 'ready' || pending.entries.some(entry => !clearCommercialPending(storage, 'e'.repeat(64), entry))) { setNotice('No se pudo completar la limpieza de operaciones ficticias. Habilita el almacenamiento y vuelve a limpiar QA.'); return; }
    const drafts = readCommercialDrafts(storage, 'e'.repeat(64));
    if (drafts.kind !== 'ready' || [...drafts.entries, ...drafts.expired].some(entry => !clearCommercialDraft(storage, 'e'.repeat(64), entry))) { setNotice('No se pudo completar la limpieza de borradores ficticios. Habilita el almacenamiento y vuelve a limpiar QA.'); return; }
    const cleared = clearSalesDraft(storage, 'e'.repeat(64));
    if (!cleared) { setNotice('No se pudo retirar el borrador ficticio. Habilita el almacenamiento y vuelve a limpiar QA.'); return; }
    server.current = fixtures(); receipts.current.clear(); setAttempts(0); setMode('ok'); setVisible(true); setMount(value => value + 1);
    setNotice('Cambios, recibos y borrador ficticios retirados. Los contactos de muestra se restablecieron.');
  };
  return <main className="mx-auto min-h-screen max-w-7xl space-y-6 bg-[#faf7f2] p-4 text-gray-900 sm:p-8">
    <h1 className="text-2xl font-semibold">Ventas QA · paginación</h1><p>1.255 contactos del período y dos históricos ficticios, solo en memoria. Sin red real, pagos ni mensajes.</p>
    <p className="text-sm leading-6">Para revisar la recuperación: elige «Fallar una consulta» y cambia de página o estado. Después pulsa «Reintentar carga solicitada». Para una falla inicial, elige «Sin conexión» y «Reiniciar carga»; la referencia ficticia EK-00000001 y el cotizador siguen disponibles.</p>
    <p className="text-sm leading-6">Seguimiento histórico: busca EK-ABCDEF99 y pulsa «Abrir seguimiento», incluso sin cargar el embudo. Guarda una nota o un estado y cambia de página: la ficha permanece abierta y las métricas de 180 días no incorporan este contacto de 2001. Los cambios y el borrador del cotizador se retiran con «Limpiar QA».</p>
    <p className="text-sm leading-6">Cotización: busca EK-ABCDEF99 y pulsa «Preparar cotización». Revisa y confirma antes de reemplazar el borrador. Vuelve al mismo código para conservar los ajustes. Con EK-ABCDEF98 debes elegir un paquete y completar evento y diseño. Cancelar conserva el borrador anterior; estas acciones no guardan un seguimiento ni envían mensajes.</p>
    <p className="text-sm leading-6">Recuperación: edita una nota o un importe incompleto y pulsa «Reiniciar carga». «Cambios sin enviar» permite recuperarlos explícitamente durante 24 horas. Para revisar operaciones, elige «Guardar y perder respuesta», guarda un cambio ficticio y reinicia la carga: conserva su identificador y exige comprobarlo. Ninguna recuperación envía cambios al abrir. Una recarga real reinicia este servidor ficticio, por lo que no representa persistencia real en Supabase.</p>
    <div className="flex flex-wrap items-end gap-3"><label className="grid gap-2">Respuesta QA<select aria-label="Respuesta QA" className={control} value={mode} onChange={event => setMode(event.target.value as Mode)}><option value="ok">Normal</option><option value="offline">Sin conexión</option><option value="once">Fallar una consulta</option><option value="truncated">Página truncada</option><option value="slow">Lenta</option><option value="migration">SQL pendiente</option><option value="lost-save">Guardar y perder respuesta</option></select></label><button type="button" className={control} onClick={() => setMount(value => value + 1)}>Reiniciar carga</button><button type="button" className={control} onClick={() => setVisible(value => !value)}>{visible ? 'Ocultar Ventas QA' : 'Volver a Ventas QA'}</button><button type="button" className={control} onClick={clean}>Limpiar QA</button><p role="status">Consultas de página: {attempts}</p></div>
    <p role="status">{notice}</p>
    <div hidden={!visible}><CommercialDashboard key={mount} transport={transport} /></div>
  </main>;
}
