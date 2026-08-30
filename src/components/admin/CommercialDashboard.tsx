'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { COMMERCIAL_LEAD_STATUSES, leadStatusLabel, type CommercialLeadStatus } from '@/lib/commercial';

type Lead = {
  id: string; reference: string; status: CommercialLeadStatus; package_key: string; design: string; event_category: string;
  placement: string; utm_source: string; utm_medium: string; utm_campaign: string; referrer_host: string;
  revenue_bs: number | null; notes: string; created_at: string; updated_at: string;
};
type Breakdown = { label: string; opens: number; contacts: number; sales: number };
type Dashboard = {
  periodDays: number;
  summary: { visits: number; landingViews: number; designViews: number; processViews: number; whatsappOpens: number; contacts: number; reserved: number; sales: number; revenue: number; intentRate: number; conversationRate: number; closeRate: number };
  sources: Breakdown[]; campaigns: Breakdown[]; packages: Breakdown[]; events: Breakdown[]; designs: Breakdown[];
  statuses: { status: CommercialLeadStatus; label: string; value: number }[];
  leads: Lead[];
};

const colors: Record<CommercialLeadStatus, string> = {
  whatsapp_open: 'border-sky-200 bg-sky-50 text-sky-700', contacted: 'border-violet-200 bg-violet-50 text-violet-700',
  reserved: 'border-amber-200 bg-amber-50 text-amber-800', won: 'border-emerald-200 bg-emerald-50 text-emerald-700', lost: 'border-gray-200 bg-gray-50 text-gray-500',
};

function LeadEditor({ lead, onSaved }: { lead: Lead; onSaved: () => void }) {
  const [status, setStatus] = useState(lead.status);
  const [revenue, setRevenue] = useState(lead.revenue_bs?.toString() ?? '');
  const [notes, setNotes] = useState(lead.notes || '');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const dirty = status !== lead.status || revenue !== (lead.revenue_bs?.toString() ?? '') || notes !== (lead.notes || '');
  const save = async () => {
    setState('saving');
    try {
      const response = await fetch('/api/admin/commercial', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: lead.id, status, revenueBs: revenue, notes }) });
      if (!response.ok) throw new Error();
      setState('saved'); onSaved();
    } catch { setState('error'); }
  };
  return <div className="grid gap-2 lg:grid-cols-[150px_110px_minmax(180px,1fr)_82px]">
    <select aria-label={`Estado de ${lead.reference}`} value={status} onChange={event => { setStatus(event.target.value as CommercialLeadStatus); setState('idle'); }} className={`min-h-10 rounded-xl border px-2 text-xs font-outfit ${colors[status]}`}>
      {COMMERCIAL_LEAD_STATUSES.map(item => <option key={item} value={item}>{leadStatusLabel(item)}</option>)}
    </select>
    <input aria-label={`Venta en bolivianos de ${lead.reference}`} type="number" min={0} step="0.01" value={revenue} onChange={event => { setRevenue(event.target.value); setState('idle'); }} placeholder="Venta Bs" className="min-h-10 rounded-xl border border-gray-200 px-3 text-xs outline-none" />
    <input aria-label={`Nota de ${lead.reference}`} maxLength={1000} value={notes} onChange={event => { setNotes(event.target.value); setState('idle'); }} placeholder="Nota breve, sin copiar conversaciones ni datos sensibles" className="min-h-10 rounded-xl border border-gray-200 px-3 text-xs outline-none" />
    <button type="button" onClick={() => void save()} disabled={!dirty || state === 'saving'} className="min-h-10 rounded-xl bg-[#8b7651] px-3 text-xs font-semibold text-white disabled:opacity-35">{state === 'saving' ? '…' : state === 'saved' ? 'Listo' : state === 'error' ? 'Reintentar' : 'Guardar'}</button>
  </div>;
}

export default function CommercialDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | CommercialLeadStatus>('all');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/commercial', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.code === 'MIGRATION_REQUIRED' ? 'Ejecuta migrations/012_commercial_funnel.sql en Supabase para activar este panel.' : body.error || 'No se pudo cargar.');
      setData(body); setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const leads = useMemo(() => data?.leads.filter(lead => filter === 'all' || lead.status === filter) ?? [], [data, filter]);

  if (loading && !data) return <div className="flex min-h-72 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-enkarta-gold border-t-transparent" /></div>;
  if (error && !data) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="font-playfair text-2xl text-amber-950">Embudo comercial pendiente</h2><p className="mt-2 font-outfit text-sm text-amber-800">{error}</p><button type="button" onClick={() => void load()} className="mt-4 rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-900">Volver a comprobar</button></div>;
  if (!data) return null;

  const s = data.summary;
  const cards = [
    ['Visitas', s.visits, `${s.designViews} vieron diseños`], ['WhatsApp abiertos', s.whatsappOpens, `${s.intentRate}% de visitas`], ['Conversaciones', s.contacts, `${s.conversationRate}% de aperturas`],
    ['Reservas', s.reserved, 'Incluye ventas'], ['Ventas', s.sales, `${s.closeRate}% de conversaciones`], ['Ingresos registrados', `${s.revenue.toLocaleString('es-BO')} Bs`, 'Solo ventas marcadas'],
  ];
  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.2em] text-[#a48655]">Últimos {data.periodDays} días</p><h2 className="mt-1 font-playfair text-3xl text-gray-900">Embudo comercial</h2><p className="mt-1 max-w-2xl font-outfit text-xs leading-5 text-gray-500">Relaciona anuncio, diseño, paquete y resultado mediante la referencia que aparece en WhatsApp. No registra IP, teléfono ni conversación.</p></div><button type="button" onClick={() => void load()} className="self-start rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">Actualizar</button></div>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">{cards.map(([label, value, detail]) => <article key={String(label)} className="rounded-2xl border border-[#e4dfd4] bg-white p-4"><p className="font-playfair text-3xl text-[#5d513d]">{value}</p><h3 className="mt-2 font-outfit text-[11px] font-semibold text-gray-700">{label}</h3><p className="mt-1 font-outfit text-[9px] text-gray-400">{detail}</p></article>)}</section>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {[['Origen', data.sources], ['Campañas', data.campaigns], ['Paquetes', data.packages], ['Eventos', data.events], ['Diseños', data.designs]].map(([title, rows]) => <article key={title as string} className="rounded-2xl border border-[#e4dfd4] bg-white p-5"><h3 className="font-playfair text-xl text-gray-800">{title as string}</h3><div className="mt-4 space-y-3">{(rows as Breakdown[]).length ? (rows as Breakdown[]).map(row => <div key={row.label}><div className="font-outfit text-[11px]"><span className="block truncate text-gray-600">{row.label}</span><span className="mt-0.5 block text-[9px] text-gray-400">{row.opens} aperturas · {row.contacts} conversaciones · {row.sales} ventas</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#b8975a]" style={{ width: `${Math.max(5, row.opens / Math.max(1, (rows as Breakdown[])[0].opens) * 100)}%` }} /></div></div>) : <p className="text-xs text-gray-400">Aún no hay datos.</p>}</div></article>)}
    </section>

    <section className="overflow-hidden rounded-2xl border border-[#e4dfd4] bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-playfair text-2xl text-gray-800">Contactos de WhatsApp</h3><p className="mt-1 font-outfit text-[11px] text-gray-400">Busca la referencia en la conversación y actualiza su avance.</p></div><select aria-label="Filtrar contactos" value={filter} onChange={event => setFilter(event.target.value as typeof filter)} className="rounded-xl border border-gray-200 px-3 py-2 text-xs"><option value="all">Todos</option>{COMMERCIAL_LEAD_STATUSES.map(status => <option key={status} value={status}>{leadStatusLabel(status)}</option>)}</select></div>
      {leads.length === 0 ? <p className="p-10 text-center font-outfit text-sm text-gray-400">No hay contactos en este estado.</p> : <div className="divide-y divide-gray-100">{leads.map(lead => {
        const source = lead.utm_source || lead.referrer_host || 'Directo';
        return <article key={lead.id} className="p-4 sm:p-5"><div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="font-mono text-sm text-[#765f39]">{lead.reference}</strong><span className="rounded-full bg-[#f1ece3] px-2 py-1 font-outfit text-[9px] uppercase text-[#75664e]">{lead.package_key === 'general' ? 'Sin paquete' : lead.package_key}</span>{lead.event_category && <span className="rounded-full bg-rose-50 px-2 py-1 font-outfit text-[9px] text-rose-600">{lead.event_category}</span>}{lead.design && <span className="rounded-full bg-gray-50 px-2 py-1 font-outfit text-[9px] text-gray-500">{lead.design}</span>}</div><p className="mt-1 truncate font-outfit text-[10px] text-gray-400">{source}{lead.utm_campaign ? ` · ${lead.utm_campaign}` : ''} · {new Date(lead.created_at).toLocaleString('es-BO')}</p></div></div><LeadEditor lead={lead} onSaved={() => void load()} /></article>;
      })}</div>}
    </section>
  </div>;
}
