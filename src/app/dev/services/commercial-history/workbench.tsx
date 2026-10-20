'use client';

import { useMemo, useRef, useState } from 'react';
import CommercialLeadHistory from '@/components/admin/CommercialLeadHistory';
import { COMMERCIAL_LEAD_STATUSES } from '@/lib/commercial';
import type { CommercialLead } from '@/lib/commercial-lookup';
import { parseCommercialHistoryQuery, type CommercialHistoryPage } from '@/lib/commercial-history';

type Lead = Pick<CommercialLead, 'id' | 'reference' | 'revision'>;
type Mode = 'ok' | 'offline' | 'truncated' | 'slow' | 'migration' | 'hang-fetch' | 'hang-body';
type Entry = CommercialHistoryPage['entries'][number];
const leads: Lead[] = [
  { id: '91000000-0000-4000-8000-000000000001', reference: 'EK-A1B2C3D4', revision: 45 },
  { id: '92000000-0000-4000-8000-000000000001', reference: 'EK-B2C3D4E5', revision: 45 },
];
const iso = (date: Date) => date.toISOString().replace('Z', '000Z');
const control = 'min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 font-outfit text-base text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39]';

function createEntries(lead: Lead, group: number): Entry[] {
  const start = Date.now() - 300000;
  return Array.from({ length: 45 }, (_, index) => {
    const to = COMMERCIAL_LEAD_STATUSES[index % COMMERCIAL_LEAD_STATUSES.length];
    return { id: `${group === 0 ? 'a1000000' : 'a2000000'}-0000-4000-8000-${(index + 1).toString(16).padStart(12, '0')}`, lead_id: lead.id,
      from_status: index % 6 === 0 ? to : COMMERCIAL_LEAD_STATUSES[(index + 1) % COMMERCIAL_LEAD_STATUSES.length], to_status: to,
      revenue_bs: index % 5 === 0 ? null : index % 5 === 1 ? 0 : 930.25,
      note: index % 7 === 0 ? '' : index === 19 ? `QA nota extensa\n${'ReferenciaFicticiaSinEspacios'.repeat(12)}` : `QA registro ficticio ${index + 1} de ${lead.reference}.`,
      created_at: iso(new Date(start - index * 60000)) };
  });
}

function waitForSlowMode(signal?: AbortSignal | null) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, 1500);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

function Fixture() {
  const [mode, setMode] = useState<Mode>('ok'), [selected, setSelected] = useState(0), [revision, setRevision] = useState(45), [requests, setRequests] = useState(0);
  const modeRef = useRef(mode); modeRef.current = mode;
  const rows = useRef<Record<string, Entry[]> | null>(null);
  if (!rows.current) rows.current = Object.fromEntries(leads.map((lead, index) => [lead.id, createEntries(lead, index)]));
  const transport = useMemo<typeof fetch>(() => async (input, init) => {
    setRequests(value => value + 1);
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, 'https://fixture.invalid');
    if (url.pathname !== '/api/admin/commercial/history' || (init?.method && init.method !== 'GET')) throw new Error('La muestra solo admite consultas de historial en memoria.');
    if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const responseMode = modeRef.current;
    if (responseMode === 'hang-fetch') return new Promise<Response>(() => {});
    if (responseMode === 'hang-body') return { ok: true, status: 200, json: () => new Promise(() => {}) } as Response;
    if (responseMode === 'offline') throw new TypeError('QA sin conexión');
    if (responseMode === 'slow') await waitForSlowMode(init?.signal);
    if (responseMode === 'migration') return Response.json({ code: 'MIGRATION_REQUIRED' }, { status: 503 });
    const query = parseCommercialHistoryQuery(url.searchParams);
    if (!query) return Response.json({ code: 'INVALID_QUERY' }, { status: 400 });
    const lead = leads.find(item => item.id === query.leadId);
    if (!lead) return Response.json({ code: 'NOT_FOUND' }, { status: 404 });
    const cursor = query.cursor;
    const asOf = cursor?.asOf ?? query.asOf ?? iso(new Date());
    const matches = (rows.current?.[lead.id] ?? []).filter(entry => entry.created_at <= asOf && (!cursor || entry.created_at < cursor.createdAt || (entry.created_at === cursor.createdAt && entry.id < cursor.id)));
    const entries = matches.slice(0, 20), hasMore = matches.length > 20, last = entries[entries.length - 1];
    const nextCursor = hasMore ? btoa(JSON.stringify({ v: 1, leadId: lead.id, asOf, createdAt: last.created_at, id: last.id })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : null;
    if (responseMode === 'truncated') return Response.json({ lead: { id: lead.id, reference: lead.reference }, asOf, entries });
    return Response.json({ lead: { id: lead.id, reference: lead.reference }, asOf, entries, pagination: { size: 20, hasMore, nextCursor } });
  }, []);

  const revise = () => {
    const lead = leads[selected], current = rows.current?.[lead.id];
    if (current) current.unshift({ id: crypto.randomUUID(), lead_id: lead.id, from_status: 'contacted', to_status: 'contacted', revenue_bs: 0, note: 'QA nuevo seguimiento en memoria, sin cambio de estado.', created_at: iso(new Date()) });
    setRevision(value => value + 1);
  };
  return <>
    <div className="flex flex-wrap gap-3">
      <label className="flex flex-col gap-2 font-outfit text-sm text-gray-800">Respuesta simulada<select className={control} value={mode} onChange={event => setMode(event.target.value as Mode)}><option value="ok">Correcta</option><option value="offline">Sin conexión</option><option value="truncated">Respuesta incompleta</option><option value="slow">Lenta (1,5 segundos)</option><option value="migration">Migración pendiente</option><option value="hang-fetch">Transporte sin respuesta</option><option value="hang-body">Cuerpo sin respuesta</option></select></label>
      <button type="button" className={`${control} self-end`} onClick={revise}>Simular nueva revisión</button>
      <button type="button" className={`${control} self-end`} onClick={() => { setSelected(value => value === 0 ? 1 : 0); setRevision(45); }}>Cambiar contacto ficticio</button>
    </div>
    <p className="mt-4 font-outfit text-sm text-gray-700">Consultas simuladas: {requests}. Contacto: <span className="font-mono" translate="no">{leads[selected].reference}</span>. Revisión actual del contacto: {revision}.</p>
    <CommercialLeadHistory lead={{ ...leads[selected], revision }} transport={transport} />
  </>;
}

export default function Workbench() {
  const [run, setRun] = useState(0);
  return <main className="mx-auto max-w-4xl space-y-6 bg-[#faf7f2] p-4 text-gray-900 sm:p-8">
    <h1 className="font-playfair text-3xl">Muestra local del historial comercial</h1>
    <p className="max-w-2xl font-outfit text-base leading-7 text-gray-700">Datos ficticios en memoria: 45 registros por contacto para recorrer páginas de 20, 20 y 5. Esta muestra no consulta Supabase, no guarda cambios y no realiza pagos ni envíos.</p>
    <p className="max-w-2xl font-outfit text-sm leading-6 text-gray-700">Para comprobar la recuperación de una espera, elige transporte o cuerpo sin respuesta y abre el historial. Tras el aviso, vuelve a «Correcta» y pulsa «Reintentar consulta». En una página anterior, el reintento conserva el mismo cursor y las notas visibles hasta completar la consulta.</p>
    <button type="button" className={control} onClick={() => setRun(value => value + 1)}>Limpiar QA y reiniciar muestra</button>
    <Fixture key={run} />
  </main>;
}
