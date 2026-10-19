'use client';

import { useMemo, useState } from 'react';
import CommercialReferenceSearch from '@/components/admin/CommercialReferenceSearch';
import CommercialLeadSummary from '@/components/admin/CommercialLeadSummary';
import type { CommercialLead } from '@/lib/commercial-lookup';

type Mode = 'ok' | 'offline' | 'incomplete' | 'expired' | 'mismatch' | 'slow';
const lead: CommercialLead = { id: '30000000-0000-4000-8000-000000000001', reference: 'EK-A1B2C3D4', status: 'contacted', package_key: 'premium', design: 'Lunaria', event_category: 'Boda', placement: 'qa-lookup', utm_source: 'QA ficticio', utm_medium: '', utm_campaign: '', referrer_host: '', revenue_bs: null, notes: 'Consulta ficticia anterior a 180 días. Sin pago ni mensajes.', created_at: '2024-01-01T12:00:00Z', updated_at: '2024-01-01T12:00:00Z' };

export default function CommercialLookupWorkbench() {
  const [mode, setMode] = useState<Mode>('ok'), [requests, setRequests] = useState(0), [mount, setMount] = useState(0);
  const transport = useMemo<typeof fetch>(() => async (input, options) => {
    setRequests(value => value + 1);
    if (options?.method && options.method !== 'GET') throw Error('QA read-only');
    const url = new URL(String(input), 'https://enkarta.invalid');
    if (url.pathname !== '/api/admin/commercial/lookup') throw Error('Unexpected QA route');
    if (mode === 'slow') await new Promise(resolve => setTimeout(resolve, 1500)); // Deliberately ignores abort to exercise stale-response protection.
    if (mode === 'offline') throw new TypeError('QA sin conexión');
    if (mode === 'expired') return Response.json({ error: 'No autorizado' }, { status: 401 });
    if (mode === 'incomplete') return Response.json({});
    if (mode === 'mismatch') return Response.json({ lead: { ...lead, reference: 'EK-FFFFFFFF' } });
    const reference = url.searchParams.get('reference');
    return Response.json({ lead: reference === lead.reference ? lead : reference === 'EK-1234ABCD' ? { ...lead, id: '30000000-0000-4000-8000-000000000002', reference, design: 'Granate', status: 'whatsapp_open', notes: 'Segunda consulta ficticia.' } : null });
  }, [mode]);
  return <main className="mx-auto min-h-screen max-w-6xl space-y-6 bg-[#faf7f2] p-4 text-gray-900 sm:p-8">
    <h1 className="text-2xl font-semibold">Búsqueda comercial QA</h1><p>Solo datos ficticios en memoria. Sin consultas reales, mensajes ni pagos.</p>
    <div className="flex flex-wrap items-end gap-4"><label className="grid gap-2">Respuesta QA<select aria-label="Respuesta QA" value={mode} onChange={event => setMode(event.target.value as Mode)} className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-base"><option value="ok">Normal</option><option value="offline">Sin conexión</option><option value="incomplete">Incompleta</option><option value="expired">Sesión terminada</option><option value="mismatch">Otra referencia</option><option value="slow">Lenta (1,5 s)</option></select></label><button type="button" className="min-h-11 rounded-xl border border-gray-300 bg-white px-4" onClick={() => { setRequests(0); setMode('ok'); setMount(value => value + 1); }}>Limpiar QA</button><p role="status">Consultas simuladas: {requests}</p></div>
    <p>Referencias ficticias: EK-A1B2C3D4 (Lunaria antigua), EK-1234ABCD (Granate); las demás no existen.</p>
    <CommercialReferenceSearch key={mount} transport={transport} renderLead={found => <CommercialLeadSummary lead={found} />} />
  </main>;
}
