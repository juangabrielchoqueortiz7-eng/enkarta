'use client';

import { useMemo, useRef, useState } from 'react';
import CommercialLeadEditor from '@/components/admin/CommercialLeadEditor';
import { leadStatusLabel } from '@/lib/commercial';
import type { CommercialLead } from '@/lib/commercial-lookup';
import { parseCommercialUpdate } from '@/lib/commercial-update';

const initial: CommercialLead = { id: '30000000-0000-4000-8000-000000000001', reference: 'EK-A1B2C3D4', status: 'whatsapp_open', package_key: 'premium', design: 'Lunaria', event_category: 'Boda', placement: 'qa-commercial-update', utm_source: '', utm_medium: '', utm_campaign: '', referrer_host: '', revenue_bs: null, notes: '', revision: 0, created_at: '2026-10-19T12:00:00Z', updated_at: '2026-10-19T12:00:00Z' };
type Mode = 'ok' | 'offline' | 'lost' | 'incomplete' | 'slow' | 'migration';
const control = 'min-h-11 rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-900';

export default function CommercialUpdateWorkbench() {
  const [mode, setMode] = useState<Mode>('ok'), [a, setA] = useState(initial), [b, setB] = useState(initial), [mount, setMount] = useState(0);
  const [snapshot, setSnapshot] = useState(initial), [history, setHistory] = useState(0), [attempts, setAttempts] = useState(0), [pending, setPending] = useState(0);
  const server = useRef(initial), behavior = useRef(mode), receipts = useRef(new Map<string, { body: string; result: unknown }>()), epoch = useRef(0);
  behavior.current = mode;
  const transport = useMemo<typeof fetch>(() => async (url, options) => {
    if (url !== '/api/admin/commercial' || options?.method !== 'PATCH') throw Error('Unexpected QA route');
    const command = parseCommercialUpdate(JSON.parse(String(options.body))), currentMode = behavior.current, generation = epoch.current;
    setAttempts(value => value + 1); setPending(value => value + 1);
    try {
      if (!command) return Response.json({ code: 'INVALID_UPDATE' }, { status: 400 });
      if (currentMode === 'offline') throw new TypeError('QA offline');
      if (currentMode === 'migration') return Response.json({ code: 'MIGRATION_REQUIRED' }, { status: 503 });
      if (currentMode === 'slow') await new Promise(resolve => setTimeout(resolve, 1200));
      if (generation !== epoch.current) throw Error('QA reset');
      const prior = receipts.current.get(command.requestId);
      if (prior) return prior.body === JSON.stringify(command) ? Response.json({ ...(prior.result as object), outcome: 'replayed' }) : Response.json({ code: 'REQUEST_REUSED', requestId: command.requestId }, { status: 409 });
      if (command.expectedRevision !== server.current.revision) return Response.json({ code: 'REVISION_CONFLICT', requestId: command.requestId, lead: server.current }, { status: 409 });
      const changed = command.status !== server.current.status || command.revenueBs !== server.current.revenue_bs || command.notes !== server.current.notes;
      const saved = changed ? { ...server.current, status: command.status, revenue_bs: command.revenueBs, notes: command.notes, revision: server.current.revision + 1, updated_at: new Date().toISOString() } : server.current;
      server.current = saved; setSnapshot(saved); if (changed) setHistory(value => value + 1);
      const result = { outcome: changed ? 'saved' : 'unchanged', requestId: command.requestId, lead: saved };
      receipts.current.set(command.requestId, { body: JSON.stringify(command), result });
      if (currentMode === 'lost') throw new TypeError('QA response lost after fictional commit');
      return currentMode === 'incomplete' ? Response.json({}) : Response.json(result);
    } finally { setPending(value => value - 1); }
  }, []);
  const reset = () => { epoch.current += 1; server.current = initial; receipts.current.clear(); setSnapshot(initial); setA(initial); setB(initial); setHistory(0); setAttempts(0); setMode('ok'); setMount(value => value + 1); };
  return <main className="mx-auto min-h-screen max-w-7xl space-y-6 bg-[#faf7f2] p-4 text-gray-900 sm:p-8">
    <h1 className="text-2xl font-semibold">Seguimiento comercial QA</h1><p>Dos pantallas ficticias del mismo contacto. Solo memoria local; sin red real, mensajes ni pagos.</p>
    <p className="text-sm leading-6">Importes QA: prueba 930,50 y 930.50, cero y el campo vacío. Un decimal incompleto como 930, o un separador de miles como 1.000,50 debe conservarse para corregirlo, sin solicitud. Cambiar solo coma por punto en el mismo importe no crea un cambio.</p>
    <div className="flex flex-wrap items-end gap-4"><label className="grid gap-2">Transporte QA<select aria-label="Transporte QA" value={mode} onChange={event => setMode(event.target.value as Mode)} className={control}><option value="ok">Normal</option><option value="offline">Sin conexión antes de guardar</option><option value="lost">Respuesta perdida después de guardar</option><option value="incomplete">Respuesta incompleta después de guardar</option><option value="slow">Lento (1,2 s)</option><option value="migration">Migración pendiente</option></select></label><button type="button" disabled={pending > 0} onClick={reset} className={control}>Limpiar QA</button></div>
    <p role="status">Sistema ficticio: revisión {snapshot.revision} · {leadStatusLabel(snapshot.status)} · Historial: {history} · Operaciones: {receipts.current.size} · Intentos HTTP: {attempts}</p>
    <div className="grid min-w-0 gap-6">{([['A', a, setA], ['B', b, setB]] as const).map(([name, lead, setLead]) => <section key={`${name}-${mount}`} aria-label={`Pantalla ${name}`} className="min-w-0 rounded-2xl border border-[#e4dfd4] bg-white p-4 sm:p-5"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="font-playfair text-2xl">Pantalla {name} · Lunaria · EK-A1B2C3D4</h2><button type="button" className={control} onClick={() => setLead(server.current)}>Cargar actual en pantalla {name}</button></div><CommercialLeadEditor lead={lead} transport={transport} onSaved={saved => setLead(previous => saved.revision >= previous.revision ? saved : previous)} /></section>)}</div>
  </main>;
}
