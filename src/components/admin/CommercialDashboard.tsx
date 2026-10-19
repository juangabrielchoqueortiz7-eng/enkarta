'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COMMERCIAL_LEAD_STATUSES, leadStatusLabel, type CommercialLeadStatus } from '@/lib/commercial';
import SalesToolkit from '@/components/admin/SalesToolkit';
import CommercialLeadEditor from '@/components/admin/CommercialLeadEditor';
import CommercialReferenceSearch from '@/components/admin/CommercialReferenceSearch';
import LeadSummary from '@/components/admin/CommercialLeadSummary';
import type { CommercialLead as Lead } from '@/lib/commercial-lookup';

type Breakdown = { label: string; opens: number; contacts: number; sales: number };
type Dashboard = {
  periodDays: number;
  summary: { visits: number; landingViews: number; designViews: number; processViews: number; whatsappOpens: number; contacts: number; reserved: number; sales: number; revenue: number; intentRate: number; conversationRate: number; closeRate: number };
  sources: Breakdown[]; campaigns: Breakdown[]; packages: Breakdown[]; events: Breakdown[]; designs: Breakdown[];
  statuses: { status: CommercialLeadStatus; label: string; value: number }[];
  leads: Lead[];
};

function LeadCard({ lead, onSaved, onActivityChange }: { lead: Lead; onSaved: (lead: Lead) => void; onActivityChange: (id: string, active: boolean) => void }) {
  const source = lead.utm_source || lead.referrer_host || 'Directo';
  return <article className="min-w-0 p-4 sm:p-5"><div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong translate="no" className="font-mono text-sm text-[#765f39]">{lead.reference}</strong><span className="rounded-full bg-[#f1ece3] px-2 py-1 font-outfit text-[9px] uppercase text-[#75664e]">{lead.package_key === 'general' ? 'Sin paquete' : lead.package_key}</span>{lead.event_category && <span className="rounded-full bg-rose-50 px-2 py-1 font-outfit text-[9px] text-rose-600">{lead.event_category}</span>}{lead.design && <span className="rounded-full bg-gray-50 px-2 py-1 font-outfit text-[9px] text-gray-500">{lead.design}</span>}</div><p className="mt-1 break-words font-outfit text-xs text-gray-600">{source}{lead.utm_campaign ? ` · ${lead.utm_campaign}` : ''} · {new Date(lead.created_at).toLocaleString('es-BO')}</p></div></div><CommercialLeadEditor lead={lead} onSaved={onSaved} onActivityChange={onActivityChange} /></article>;
}

export default function CommercialDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | CommercialLeadStatus>('all');
  const activeIdsRef = useRef(new Set<string>());
  const [activeIds, setActiveIds] = useState<ReadonlySet<string>>(() => new Set());
  const loadSequence = useRef(0), activeLoad = useRef<AbortController | null>(null);
  const handleActivity = useCallback((id: string, active: boolean) => {
    if (activeIdsRef.current.has(id) === active) return;
    if (active) activeIdsRef.current.add(id); else activeIdsRef.current.delete(id);
    setActiveIds(new Set(activeIdsRef.current));
  }, []);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    activeLoad.current?.abort();
    const controller = new AbortController(); activeLoad.current = controller;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/commercial', { cache: 'no-store', signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.code === 'MIGRATION_REQUIRED' ? 'Comprueba migrations/012_commercial_funnel.sql y migrations/019_commercial_lead_updates.sql en Supabase para activar este panel.' : body.error || 'No se pudo cargar.');
      if (sequence !== loadSequence.current || controller.signal.aborted) return;
      setData(current => {
        const previous = new Map(current?.leads.map(lead => [lead.id, lead]) ?? []);
        const received = new Set<string>();
        const leads = (body as Dashboard).leads.map(lead => {
          received.add(lead.id);
          const prior = previous.get(lead.id);
          return prior && prior.revision > lead.revision ? prior : lead;
        });
        for (const prior of previous.values()) if (activeIdsRef.current.has(prior.id) && !received.has(prior.id)) leads.push(prior);
        return { ...body, leads };
      });
      setError('');
    } catch (cause) {
      if (sequence === loadSequence.current && !controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo cargar.');
    } finally {
      if (sequence === loadSequence.current) { activeLoad.current = null; setLoading(false); }
    }
  }, []);
  const handleSaved = (saved: Lead) => {
    setData(current => current ? { ...current, leads: current.leads.map(lead => lead.id === saved.id && saved.revision >= lead.revision ? saved : lead) } : current);
    void load();
  };
  useEffect(() => {
    void load();
    return () => { loadSequence.current += 1; activeLoad.current?.abort(); activeLoad.current = null; };
  }, [load]);
  const visibleCount = useMemo(() => data?.leads.reduce((count, lead) => count + Number(filter === 'all' || lead.status === filter), 0) ?? 0, [data, filter]);

  if (loading && !data) return <div className="flex min-h-72 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-enkarta-gold border-t-transparent" /></div>;
  if (error && !data) return <div className="space-y-6"><CommercialReferenceSearch renderLead={lead => <LeadSummary lead={lead} />} /><div className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="font-playfair text-2xl text-amber-950">No se pudo cargar el embudo</h2><p role="alert" className="mt-2 font-outfit text-sm text-amber-800">{error}</p><button type="button" onClick={() => void load()} className="mt-4 min-h-11 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Volver a comprobar</button></div></div>;
  if (!data) return null;

  const s = data.summary;
  const cards = [
    ['Visitas', s.visits, `${s.designViews} vieron diseños`], ['Intentos de contacto', s.whatsappOpens, `${s.intentRate} por cada 100 visitas`], ['Conversaciones', s.contacts, `${s.conversationRate}% de intentos`],
    ['Reservas', s.reserved, 'Incluye ventas'], ['Ventas', s.sales, `${s.closeRate}% de conversaciones`], ['Ingresos registrados', `${s.revenue.toLocaleString('es-BO')} Bs`, 'Solo ventas marcadas'],
  ];
  return <div className="space-y-6">
    <SalesToolkit />
    <CommercialReferenceSearch renderLead={lead => <LeadSummary lead={lead} />} />
    {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 font-outfit text-sm text-amber-900">No se pudo actualizar el embudo. Los datos visibles corresponden a la carga anterior. {error}</p>}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.2em] text-[#a48655]">Últimos {data.periodDays} días</p><h2 className="mt-1 font-playfair text-3xl text-gray-900">Embudo comercial</h2><p className="mt-1 max-w-2xl font-outfit text-xs leading-5 text-gray-500">Relaciona anuncio, diseño, paquete y resultado mediante la referencia que aparece en WhatsApp. Un intento registra la solicitud del enlace; no confirma apertura ni envío. No registra IP, teléfono ni conversación.</p></div><button type="button" onClick={() => void load()} className="self-start rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">Actualizar</button></div>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">{cards.map(([label, value, detail]) => <article key={String(label)} className="rounded-2xl border border-[#e4dfd4] bg-white p-4"><p className="font-playfair text-3xl text-[#5d513d]">{value}</p><h3 className="mt-2 font-outfit text-[11px] font-semibold text-gray-700">{label}</h3><p className="mt-1 font-outfit text-[9px] text-gray-400">{detail}</p></article>)}</section>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {[['Origen', data.sources], ['Campañas', data.campaigns], ['Paquetes', data.packages], ['Eventos', data.events], ['Diseños', data.designs]].map(([title, rows]) => <article key={title as string} className="rounded-2xl border border-[#e4dfd4] bg-white p-5"><h3 className="font-playfair text-xl text-gray-800">{title as string}</h3><div className="mt-4 space-y-3">{(rows as Breakdown[]).length ? (rows as Breakdown[]).map(row => <div key={row.label}><div className="font-outfit text-[11px]"><span className="block truncate text-gray-600">{row.label}</span><span className="mt-0.5 block text-[9px] text-gray-400">{row.opens} intentos · {row.contacts} conversaciones · {row.sales} ventas</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#b8975a]" style={{ width: `${Math.max(5, row.opens / Math.max(1, (rows as Breakdown[])[0].opens) * 100)}%` }} /></div></div>) : <p className="text-xs text-gray-400">Aún no hay datos.</p>}</div></article>)}
    </section>

    <section className="overflow-hidden rounded-2xl border border-[#e4dfd4] bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-playfair text-2xl text-gray-800">Contactos de WhatsApp</h3><p className="mt-1 font-outfit text-[11px] text-gray-400">Busca la referencia en la conversación y actualiza su avance.</p></div><select aria-label="Filtrar contactos" value={filter} onChange={event => setFilter(event.target.value as typeof filter)} className="rounded-xl border border-gray-200 px-3 py-2 text-xs"><option value="all">Todos</option>{COMMERCIAL_LEAD_STATUSES.map(status => <option key={status} value={status}>{leadStatusLabel(status)}</option>)}</select></div>
      {activeIds.size > 0 && filter !== 'all' && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 p-4"><p role="status" className="font-outfit text-sm leading-6 text-amber-950">Hay cambios o guardados pendientes. Se conservan aunque este filtro oculte el contacto.</p><button type="button" onClick={() => setFilter('all')} className="min-h-11 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39]">Ver todos</button></div>}
      {visibleCount === 0 && <p className="p-10 text-center font-outfit text-sm text-gray-400">No hay contactos en este estado.</p>}
      <div className="divide-y divide-gray-100">{data.leads.map(lead => <div key={lead.id} hidden={filter !== 'all' && lead.status !== filter}><LeadCard lead={lead} onSaved={handleSaved} onActivityChange={handleActivity} /></div>)}</div>
    </section>
  </div>;
}
