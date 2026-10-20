'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { COMMERCIAL_LEAD_STATUSES, leadStatusLabel } from '@/lib/commercial';
import SalesToolkit from '@/components/admin/SalesToolkit';
import CommercialLeadEditor, { type CommercialEditorRecovery, type CommercialEditorDraftRecovery } from '@/components/admin/CommercialLeadEditor';
import CommercialLeadHistory from '@/components/admin/CommercialLeadHistory';
import CommercialReferenceSearch from '@/components/admin/CommercialReferenceSearch';
import LeadSummary from '@/components/admin/CommercialLeadSummary';
import { parseCommercialLead, type CommercialLead as Lead } from '@/lib/commercial-lookup';
import { decodeCommercialCursor, mergeCommercialPageEditors, openCommercialLeadEditor, requestCommercialDashboard, type CommercialBreakdown as Breakdown, type CommercialFilter } from '@/lib/commercial-dashboard';
import { commercialNavigationReducer, commercialRetryLocation, createCommercialNavigation, initialCommercialLocation, type CommercialNavigationState, type CommercialPageLocation } from '@/lib/commercial-navigation';
import { salesQuoteContact, type SalesQuoteContact } from '@/lib/sales-contact';
import CommercialPendingRecovery, { useCommercialPendingRecovery } from '@/components/admin/CommercialPendingRecovery';
import type { CommercialPendingEntry } from '@/lib/commercial-pending';
import CommercialDraftRecovery, { useCommercialDraftRecovery } from '@/components/admin/CommercialDraftRecovery';
import type { CommercialDraftEntry } from '@/lib/commercial-drafts';

type PendingWorkspace = { manager: ReturnType<typeof useCommercialPendingRecovery>; resumed: ReadonlyMap<string, CommercialPendingEntry> };
function recoveryForLead(lead: Lead, workspace?: PendingWorkspace): CommercialEditorRecovery | undefined {
  if (!workspace) return undefined;
  const { manager } = workspace, entry = manager.entries.find(value => value.request.id === lead.id) ?? null;
  const resumed = workspace.resumed.get(lead.id);
  return { ready: manager.ready, entry, resumed: entry && resumed && JSON.stringify(entry) === JSON.stringify(resumed) ? resumed : null, persist: manager.persist, complete: manager.complete, resume: manager.resume };
}
type DraftWorkspace = { scope: string | null; manager: ReturnType<typeof useCommercialDraftRecovery>; restored: ReadonlyMap<string, CommercialDraftEntry> };
function draftsForLead(lead: Lead, workspace?: DraftWorkspace): CommercialEditorDraftRecovery | undefined {
  if (!workspace) return undefined;
  const { manager } = workspace, entry = [...manager.entries, ...manager.expired].find(value => value.id === lead.id) ?? null;
  const restored = workspace.restored.get(lead.id);
  return { scope: workspace.scope, ready: manager.ready, entry, restored: entry && restored && JSON.stringify(entry) === JSON.stringify(restored) ? restored : null, persist: manager.persist, clear: manager.clear, restore: manager.restore };
}

function LeadCard({ lead, onSaved, onActivityChange, onQuote, transport, recovery, draftRecovery }: { lead: Lead; onSaved: (lead: Lead) => void; onActivityChange: (id: string, active: boolean) => void; onQuote?: (lead: Lead) => void; transport: typeof fetch; recovery?: CommercialEditorRecovery; draftRecovery?: CommercialEditorDraftRecovery }) {
  const source = lead.utm_source || lead.referrer_host || 'Directo';
  return <article className="min-w-0 p-4 sm:p-5">
    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 [overflow-wrap:anywhere]"><div className="flex flex-wrap items-center gap-2"><strong translate="no" className="font-mono text-sm text-[#765f39]">{lead.reference}</strong><span className="rounded-full bg-[#f1ece3] px-2 py-1 font-outfit text-[9px] uppercase text-[#75664e]">{lead.package_key === 'general' ? 'Sin paquete' : lead.package_key}</span>{lead.event_category && <span className="rounded-full bg-rose-50 px-2 py-1 font-outfit text-[9px] text-rose-600">{lead.event_category}</span>}{lead.design && <span className="rounded-full bg-gray-50 px-2 py-1 font-outfit text-[9px] text-gray-500">{lead.design}</span>}</div><p className="mt-1 break-words font-outfit text-xs text-gray-600">{source}{lead.utm_campaign ? ` · ${lead.utm_campaign}` : ''} · {new Date(lead.created_at).toLocaleString('es-BO')}</p></div>
      {onQuote && salesQuoteContact(lead) && <button type="button" onClick={() => onQuote(lead)} aria-label={`Preparar cotización de ${lead.reference}`} className="min-h-11 shrink-0 self-start rounded-xl border border-[#765f39] bg-white px-4 py-2 font-outfit text-sm font-semibold text-[#5d4a2c] hover:bg-[#faf7f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39]">Preparar cotización</button>}
    </div>
    <CommercialLeadEditor lead={lead} onSaved={onSaved} onActivityChange={onActivityChange} transport={transport} recovery={recovery} draftRecovery={draftRecovery} />
    <div className="mt-4"><CommercialLeadHistory lead={lead} transport={transport} /></div>
  </article>;
}

const locationLabel = (location: CommercialPageLocation) => `la página ${location.index + 1} de «${location.query.status === 'all' ? 'Todos' : leadStatusLabel(location.query.status)}»`;

/** One keyed editing surface per contact, including searches outside the current page. */
export function CommercialContactList({ leads, pageIds, activeIds, openedId, onUnpin, onSaved, onActivityChange, onQuote, transport, pendingRecovery, draftRecovery }: { leads: Lead[]; pageIds: ReadonlySet<string>; activeIds: ReadonlySet<string>; openedId: string | null; onUnpin: () => void; onSaved: (lead: Lead) => void; onActivityChange: (id: string, active: boolean) => void; onQuote?: (lead: Lead) => void; transport: typeof fetch; pendingRecovery?: PendingWorkspace; draftRecovery?: DraftWorkspace }) {
  return <div className="divide-y divide-gray-100">{leads.filter(lead => pageIds.has(lead.id) || activeIds.has(lead.id) || lead.id === openedId).map(lead => <div key={lead.id} id={`commercial-lead-${lead.id}`} role="group" tabIndex={-1} aria-label={`Ficha de ${lead.reference}`} className="scroll-mt-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#765f39]">
    {lead.id === openedId ? <div className="space-y-2 border-b border-[#e4dfd4] bg-[#faf7f2] px-4 py-3 font-outfit text-sm text-gray-800 sm:px-5"><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">Ficha abierta por referencia · {lead.reference}</p><button type="button" onClick={onUnpin} disabled={activeIds.has(lead.id)} className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">Dejar de fijar ficha</button></div><p>{!pageIds.has(lead.id) && 'Este contacto está fuera de la página o el filtro actual. '}Las métricas siguen limitadas a los últimos 180 días.</p>{activeIds.has(lead.id) && <p>Guarda, comprueba o descarta sus cambios antes de dejar de fijarla.</p>}</div> : !pageIds.has(lead.id) && <p className="bg-amber-50 px-4 py-3 font-outfit text-sm text-amber-950 sm:px-5">Cambios pendientes fuera de la página actual · {lead.reference}</p>}
    <LeadCard lead={lead} onSaved={onSaved} onActivityChange={onActivityChange} onQuote={onQuote} transport={transport} recovery={recoveryForLead(lead, pendingRecovery)} draftRecovery={draftsForLead(lead, draftRecovery)} />
  </div>)}</div>;
}

export function CommercialDashboardFeedback({ navigation, onRetry }: { navigation: CommercialNavigationState; onRetry: () => void }) {
  if (!navigation.data && navigation.pending) return <div role="status" className="flex min-h-48 items-center justify-center gap-3 font-outfit text-sm text-gray-700"><div aria-hidden="true" className="h-8 w-8 animate-spin rounded-full border-2 border-enkarta-gold border-t-transparent motion-reduce:animate-none" />Cargando el embudo de Ventas…</div>;
  if (!navigation.error) return null;
  return <section aria-label="Recuperación del embudo" className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
    {!navigation.data && <h2 className="font-playfair text-2xl text-amber-950">No se pudo cargar el embudo</h2>}
    <p role="alert" className="font-outfit text-sm leading-6 text-amber-950">No se pudo cargar {locationLabel(navigation.failed ?? navigation.location)}. {navigation.data ? 'Los datos visibles corresponden a la carga anterior.' : 'Puedes seguir usando el cotizador y la búsqueda por referencia.'} {navigation.error}</p>
    <button type="button" onClick={onRetry} disabled={!!navigation.pending} className="min-h-11 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">Reintentar carga solicitada</button>
  </section>;
}

/** These independent tools keep their position and identity through every dashboard load. */
export function CommercialSalesWorkspace({ navigation, onRetry, transport, children, onOpenLead, latestLead, onQuoteLead, quoteRequest, onRecoveryScope, recoveryScope }: { navigation: CommercialNavigationState; onRetry: () => void; transport: typeof fetch; children?: ReactNode; onOpenLead?: (lead: Lead) => void; latestLead?: Lead | null; onQuoteLead?: (lead: Lead) => void; quoteRequest?: { sequence: number; contact: SalesQuoteContact } | null; onRecoveryScope?: (scope: string | null) => void; recoveryScope?: string | null }) {
  return <div className="space-y-6">
    <SalesToolkit transport={transport} contactRequest={quoteRequest} onScopeReady={onRecoveryScope} />
    <CommercialReferenceSearch transport={transport} latestLead={latestLead} recoveryScope={recoveryScope} renderLead={lead => <LeadSummary lead={lead} transport={transport} onOpen={onOpenLead ? () => onOpenLead(lead) : undefined} onQuote={onQuoteLead && salesQuoteContact(lead) ? () => onQuoteLead(lead) : undefined} />} />
    <CommercialDashboardFeedback navigation={navigation} onRetry={onRetry} />
    {children}
  </div>;
}

export default function CommercialDashboard({ transport = fetch }: { transport?: typeof fetch }) {
  const [navigation, dispatchNavigation] = useReducer(commercialNavigationReducer, undefined, createCommercialNavigation), [editors, setEditors] = useState<Lead[]>([]);
  const { data, location } = navigation, loading = !!navigation.pending;
  const currentLocation = useRef<CommercialPageLocation>(initialCommercialLocation());
  const activeIdsRef = useRef(new Set<string>()), [activeIds, setActiveIds] = useState<ReadonlySet<string>>(() => new Set());
  const openedIdRef = useRef<string | null>(null), pageIdsRef = useRef(new Set<string>()), contactsHeading = useRef<HTMLHeadingElement>(null);
  const [openedId, setOpenedId] = useState<string | null>(null), [lastSaved, setLastSaved] = useState<Lead | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ id: string } | null>(null);
  const [quoteRequest, setQuoteRequest] = useState<{ sequence: number; contact: SalesQuoteContact } | null>(null);
  const [recoveryScope, setRecoveryScope] = useState<string | null>(null), [resumedOperations, setResumedOperations] = useState<ReadonlyMap<string, CommercialPendingEntry>>(() => new Map());
  const [restoredDrafts, setRestoredDrafts] = useState<ReadonlyMap<string, CommercialDraftEntry>>(() => new Map());
  const pendingGate = useRef({ ready: false, ids: new Set<string>() });
  const loadSequence = useRef(0), activeLoad = useRef<AbortController | null>(null);
  const handleActivity = useCallback((id: string, active: boolean) => {
    if (activeIdsRef.current.has(id) === active) return;
    if (active) activeIdsRef.current.add(id); else activeIdsRef.current.delete(id);
    setActiveIds(new Set(activeIdsRef.current));
  }, []);
  const load = useCallback(async (target: CommercialPageLocation = currentLocation.current) => {
    const sequence = ++loadSequence.current;
    activeLoad.current?.abort();
    const controller = new AbortController(); activeLoad.current = controller;
    const timer = setTimeout(() => {
      controller.abort();
      if (sequence === loadSequence.current) dispatchNavigation({ type: 'failed', sequence, message: 'Ventas tardó demasiado en responder. Vuelve a intentarlo.' });
    }, 20000);
    dispatchNavigation({ type: 'start', sequence, target });
    try {
      const body = await requestCommercialDashboard(target.query, transport, controller.signal);
      if (sequence !== loadSequence.current || controller.signal.aborted) return;
      pageIdsRef.current = new Set(body.leads.map(lead => lead.id));
      setEditors(previous => mergeCommercialPageEditors(previous, body.leads, activeIdsRef.current, openedIdRef.current));
      currentLocation.current = target;
      dispatchNavigation({ type: 'loaded', sequence, data: body });
    } catch (cause) {
      if (sequence === loadSequence.current) dispatchNavigation({ type: 'failed', sequence, message: controller.signal.aborted ? 'Ventas tardó demasiado en responder. Vuelve a intentarlo.' : cause instanceof Error ? cause.message : 'No se pudo cargar Ventas. Revisa tu conexión y vuelve a intentarlo.' });
    } finally {
      clearTimeout(timer);
      if (sequence === loadSequence.current) activeLoad.current = null;
    }
  }, [transport]);
  const refresh = () => void load({ query: { status: currentLocation.current.query.status, cursor: null }, index: 0, previous: [] });
  const handleSaved = (saved: Lead) => {
    setEditors(previous => previous.map(lead => lead.id === saved.id && saved.revision >= lead.revision ? saved : lead));
    setLastSaved(saved);
    void load();
  };
  const openLead = (value: Lead) => {
    const lead = parseCommercialLead(value);
    if (!lead) return;
    const retained = new Set([...pageIdsRef.current, ...activeIdsRef.current]);
    setEditors(previous => openCommercialLeadEditor(previous, lead, retained));
    openedIdRef.current = lead.id; setOpenedId(lead.id); setFocusRequest({ id: lead.id });
  };
  const unpin = () => {
    if (openedIdRef.current && activeIdsRef.current.has(openedIdRef.current)) return;
    openedIdRef.current = null; setOpenedId(null); contactsHeading.current?.focus({ preventScroll: true });
  };
  const quoteLead = (lead: Lead) => {
    const contact = salesQuoteContact(lead);
    if (contact) setQuoteRequest(previous => ({ sequence: (previous?.sequence ?? 0) + 1, contact }));
  };
  const resumeOperation = useCallback((lead: Lead, entry: CommercialPendingEntry) => {
    if (activeIdsRef.current.has(lead.id)) return false;
    const retained = new Set([...pageIdsRef.current, ...activeIdsRef.current]);
    setEditors(previous => openCommercialLeadEditor(previous, lead, retained));
    setResumedOperations(previous => new Map(previous).set(lead.id, entry));
    openedIdRef.current = lead.id; setOpenedId(lead.id); setFocusRequest({ id: lead.id });
    return true;
  }, []);
  const pendingRecovery = useCommercialPendingRecovery(recoveryScope, transport, resumeOperation);
  pendingGate.current = { ready: pendingRecovery.ready, ids: new Set(pendingRecovery.entries.map(entry => entry.request.id)) };
  const restoreDraft = useCallback((lead: Lead, entry: CommercialDraftEntry) => {
    if (!pendingGate.current.ready || pendingGate.current.ids.has(lead.id) || activeIdsRef.current.has(lead.id)) return false;
    const retained = new Set([...pageIdsRef.current, ...activeIdsRef.current]);
    setEditors(previous => openCommercialLeadEditor(previous, lead, retained));
    setRestoredDrafts(previous => new Map(previous).set(lead.id, entry));
    openedIdRef.current = lead.id; setOpenedId(lead.id); setFocusRequest({ id: lead.id });
    return true;
  }, []);
  const draftRecovery = useCommercialDraftRecovery(recoveryScope, transport, restoreDraft);
  const restoredScope = useRef(recoveryScope);
  useEffect(() => {
    const scopeChanged = restoredScope.current !== recoveryScope;
    restoredScope.current = recoveryScope;
    setRestoredDrafts(previous => {
      if (scopeChanged) return previous.size ? new Map() : previous;
      const next = new Map([...previous].filter(([id, entry]) => draftRecovery.entries.some(current => current.id === id && JSON.stringify(current) === JSON.stringify(entry))));
      return next.size === previous.size ? previous : next;
    });
  }, [recoveryScope, draftRecovery.entries]);
  const resumedScope = useRef(recoveryScope);
  useEffect(() => {
    const scopeChanged = resumedScope.current !== recoveryScope;
    resumedScope.current = recoveryScope;
    setResumedOperations(previous => {
      if (scopeChanged) return previous.size ? new Map() : previous;
      const next = new Map([...previous].filter(([id, entry]) => pendingRecovery.entries.some(current => current.request.id === id && JSON.stringify(current) === JSON.stringify(entry))));
      return next.size === previous.size ? previous : next;
    });
  }, [recoveryScope, pendingRecovery.entries]);
  useEffect(() => {
    if (!focusRequest) return;
    const row = document.getElementById(`commercial-lead-${focusRequest.id}`);
    row?.focus({ preventScroll: true }); row?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [focusRequest]);
  useEffect(() => {
    void load();
    return () => { loadSequence.current += 1; activeLoad.current?.abort(); activeLoad.current = null; };
  }, [load]);
  const pageIds = useMemo(() => new Set(data?.leads.map(lead => lead.id) ?? []), [data]);
  const filter = location.query.status;
  const next = () => {
    const cursor = decodeCommercialCursor(data?.pagination.nextCursor);
    if (cursor && data) void load({ query: { status: filter, cursor }, index: location.index + 1, previous: [...location.previous, location.query.cursor ?? { asOf: data.asOf, createdAt: data.asOf, id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', status: filter }] });
  };
  const previous = () => {
    if (!location.previous.length) return;
    void load({ query: { status: filter, cursor: location.previous[location.previous.length - 1] }, index: location.index - 1, previous: location.previous.slice(0, -1) });
  };

  const s = data?.summary;
  const cards = s ? [
    ['Visitas', s.visits, `${s.designViews} vieron diseños`], ['Intentos de contacto', s.whatsappOpens, `${s.intentRate} por cada 100 visitas`], ['Conversaciones', s.contacts, `${s.conversationRate}% de intentos`],
    ['Reservas', s.reserved, 'Incluye ventas'], ['Ventas', s.sales, `${s.closeRate}% de conversaciones`], ['Ingresos registrados', `${s.revenue.toLocaleString('es-BO')} Bs`, 'Solo ventas marcadas'],
  ] : [];
  const latestSaved = lastSaved ? editors.reduce((latest, lead) => lead.id === latest.id && lead.revision > latest.revision ? lead : latest, lastSaved) : null;
  return <CommercialSalesWorkspace navigation={navigation} onRetry={() => void load(commercialRetryLocation(navigation))} transport={transport} onOpenLead={openLead} latestLead={latestSaved} onQuoteLead={quoteLead} quoteRequest={quoteRequest} onRecoveryScope={setRecoveryScope} recoveryScope={recoveryScope}>
    <CommercialPendingRecovery manager={pendingRecovery} />
    <CommercialDraftRecovery manager={draftRecovery} pendingIds={pendingGate.current.ids} />
    {data && <>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.2em] text-[#a48655]">Últimos {data.periodDays} días</p><h2 className="mt-1 font-playfair text-3xl text-gray-900">Embudo comercial</h2><p className="mt-1 max-w-2xl font-outfit text-xs leading-5 text-gray-500">Relaciona anuncio, diseño, paquete y resultado mediante la referencia que aparece en WhatsApp. Un intento registra la solicitud del enlace; no confirma apertura ni envío. No registra IP, teléfono ni conversación.</p></div><button type="button" onClick={refresh} disabled={loading} className="min-h-11 self-start rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40">Actualizar</button></div>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">{cards.map(([label, value, detail]) => <article key={String(label)} className="rounded-2xl border border-[#e4dfd4] bg-white p-4"><p className="font-playfair text-3xl text-[#5d513d]">{value}</p><h3 className="mt-2 font-outfit text-[11px] font-semibold text-gray-700">{label}</h3><p className="mt-1 font-outfit text-[9px] text-gray-400">{detail}</p></article>)}</section>

    <p className="font-outfit text-sm leading-6 text-gray-600">Corte de altas y eventos: {new Date(data.asOf).toLocaleString('es-BO')}. Los estados reflejan la última consulta. Cada desglose muestra las ocho categorías con más intentos, calculadas sobre el período completo.</p>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {[['Origen', data.sources], ['Campañas', data.campaigns], ['Paquetes', data.packages], ['Eventos', data.events], ['Diseños', data.designs]].map(([title, rows]) => <article key={title as string} className="rounded-2xl border border-[#e4dfd4] bg-white p-5"><h3 className="font-playfair text-xl text-gray-800">{title as string}</h3><div className="mt-4 space-y-3">{(rows as Breakdown[]).length ? (rows as Breakdown[]).map(row => <div key={row.label}><div className="font-outfit text-[11px]"><span className="block truncate text-gray-600">{row.label}</span><span className="mt-0.5 block text-[9px] text-gray-400">{row.opens} intentos · {row.contacts} conversaciones · {row.sales} ventas</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-[#b8975a]" style={{ width: `${Math.max(5, row.opens / Math.max(1, (rows as Breakdown[])[0].opens) * 100)}%` }} /></div></div>) : <p className="text-xs text-gray-400">Aún no hay datos.</p>}</div></article>)}
    </section>

    </>}
    <section className="overflow-hidden rounded-2xl border border-[#e4dfd4] bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 ref={contactsHeading} tabIndex={-1} className="font-playfair text-2xl text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Contactos de WhatsApp</h3><p className="mt-1 font-outfit text-[11px] text-gray-400">Ordenados por fecha de creación, del más reciente al más antiguo.</p></div><select aria-label="Filtrar contactos" value={filter} disabled={loading || !data} onChange={event => void load({ query: { status: event.target.value as CommercialFilter, cursor: null }, index: 0, previous: [] })} className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"><option value="all">Todos</option>{COMMERCIAL_LEAD_STATUSES.map(status => <option key={status} value={status}>{leadStatusLabel(status)}</option>)}</select></div>
      <div className="space-y-2 border-b border-gray-100 px-4 py-3 font-outfit text-sm text-gray-600 sm:px-5">
        <p>Las métricas incluyen todos los contactos y eventos del período. El filtro cambia solo esta lista.</p>
        <p role="status">{navigation.pending ? `Cargando ${locationLabel(navigation.pending)}…` : !data ? 'Usa la búsqueda por referencia para abrir un seguimiento mientras se recupera el listado.' : data.pagination.total === 0 ? 'No hay contactos en este estado.' : 'Página ' + (location.index + 1) + ' · ' + data.leads.length + ' contactos en esta página · ' + data.pagination.total.toLocaleString('es-BO') + ' en este estado'}</p>
        {activeIds.size > 0 && <p className="text-amber-900">{activeIds.size} contacto(s) con cambios o guardados pendientes. Sus editores se conservan aunque cambies de página o estado.</p>}
      </div>
      <CommercialContactList leads={editors} pageIds={pageIds} activeIds={activeIds} openedId={openedId} onUnpin={unpin} onSaved={handleSaved} onActivityChange={handleActivity} onQuote={quoteLead} transport={transport} pendingRecovery={{ manager: pendingRecovery, resumed: resumedOperations }} draftRecovery={{ scope: recoveryScope, manager: draftRecovery, restored: restoredDrafts }} />
      {data && <nav aria-label="Páginas de contactos" className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 p-4 sm:p-5">
        <button type="button" onClick={previous} disabled={loading || location.previous.length === 0} className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40">Anterior</button>
        <span className="font-outfit text-sm text-gray-700">Página {location.index + 1} · 25 por página</span>
        <button type="button" onClick={next} disabled={loading || !data.pagination.hasMore} className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40">Siguiente</button>
      </nav>}
    </section>
  </CommercialSalesWorkspace>;
}
