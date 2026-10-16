'use client';
import { useMemo, useRef, useState } from 'react';
import { filterRoster, rosterCsv, type HostGuest, type HostSnapshot, type RosterFilter } from '@/lib/host-dashboard';
import { RESPONSE_LABELS } from '@/lib/response-sheet';
import { guessGuestColumn, mapGuestCsvRows, parseGuestCsv, parseQuickGuestList, type GuestImportField, type ParsedGuestCsv } from '@/lib/guest-import';
import GuestImportPreview, { GuestImportTemplate } from './GuestImportPreview';
import GuestImportRecovery, { useGuestImport } from './GuestImportRecovery';
import DeliveryRecovery, { useDeliveryTracking } from './DeliveryRecovery';
import { guestImportMessage, type GuestImportReceipt } from '@/lib/guest-import-operation';
import WhatsAppQueue from './WhatsAppQueue';
import WhatsAppReviewStatus, { useWhatsAppReview } from './WhatsAppReview';
import { whatsappQueue, type QueuePurpose } from '@/lib/whatsapp-queue';
import { deliveryState, DELIVERY_LABELS, type DeliveryAction } from '@/lib/guest-delivery';
import { rosterPage, rosterTables } from '@/lib/roster-view';
import RosterPagination from './RosterPagination';
import GuestEditor from './GuestEditor';
import { verifyGuestEditReceipt } from '@/lib/guest-edit-form';
import styles from '../operations/Operations.module.css';

const fieldClass = 'min-h-11 min-w-0 rounded-xl border border-[#e4dfd4] bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#ab8950] focus:ring-2 focus:ring-[#ab8950]/15';
const statusClass = { confirmed: 'bg-emerald-50 text-emerald-800', pending: 'bg-amber-50 text-amber-800', declined: 'bg-rose-50 text-rose-700' };
const exportFile = (content: string, filename: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function HostRoster({ snapshot, invitationId, slug, connected, refresh, demo = false, whatsappTemplate, reminderTemplate }: {
  snapshot: HostSnapshot; invitationId: string; slug: string; connected: boolean; refresh: () => void; demo?: boolean; whatsappTemplate?: string; reminderTemplate?: string;
}) {
  const { guests, services } = snapshot;
  const [filter, setFilter] = useState<RosterFilter>({ search: '', status: 'all', delivery:'all', table: 'all', access: 'all', sort: 'name' });
  const [page, setPage] = useState(1);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const [editing, setEditing] = useState<HostGuest | null>(null);
  const [notice, setNotice] = useState('');
  const [queueOpen, setQueueOpen] = useState(false);
  const queueReview = useWhatsAppReview(invitationId);
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState('');
  const [csv, setCsv] = useState<ParsedGuestCsv | null>(null);
  const [mapping, setMapping] = useState<Record<number, GuestImportField>>({});
  const mapped = useMemo(() => csv ? mapGuestCsvRows(csv, mapping, guests) : null, [csv, mapping, guests]);
  const importRows = mapped?.rows ?? [];
  const importer = useGuestImport(invitationId);
  const busy = importer.busy;
  const delivery = useDeliveryTracking((_saved, _submitted, operation) => {
    if (operation.action !== 'manual') queueReview.prepare(operation.guestId);
    setNotice(operation.action === 'manual' ? 'Marca manual registrada.' : 'WhatsApp solicitado. No se confirma envío ni entrega.');
  }, refresh, undefined, demo ? undefined : invitationId);
  const deliveryBusy = delivery.blocked;
  const startQueue = (ids: string[], purpose: QueuePurpose) => { if (queueReview.begin(ids, purpose)) setQueueOpen(true); };
  const visible = useMemo(() => filterRoster(guests, filter), [guests, filter]);
  const listing = rosterPage(visible, page);
  const invitationQueue = useMemo(() => whatsappQueue(visible, 'invitation'), [visible]);
  const reminderQueue = useMemo(() => whatsappQueue(visible, 'reminder'), [visible]);
  const groups = useMemo(() => Array.from(new Set(guests.map(guest => guest.group).filter((group): group is string => !!group))).sort((a,b) => a.localeCompare(b,'es')), [guests]);
  const tableSummary = useMemo(() => rosterTables(guests), [guests]);
  const tables = tableSummary.map(table => table.name);
  const activeFilters = [filter.search.trim(), filter.group && filter.group !== 'all', filter.status !== 'all', filter.delivery !== 'all', filter.table !== 'all', filter.access !== 'all'].filter(Boolean).length;
  const updateFilter = (key: keyof RosterFilter, value: string) => { setPage(1); setFilter(current => ({ ...current, [key]: value })); };
  const clearFilters = () => { setPage(1); setFilter({ search: '', status: 'all', delivery: 'all', table: 'all', access: 'all', sort: 'name', group: 'all' }); };
  const changePage = (next: number) => {
    setPage(next);
    resultsHeading.current?.focus({ preventScroll: true });
    resultsHeading.current?.scrollIntoView({ block: 'start' });
  };
  const mutate = async (method: string, body?: unknown, id?: string, revision?: number) => {
    if (demo) throw new Error('Vista de prueba: no se modifican invitados reales.');
    setNotice('');
    try {
      const response = await fetch(id ? `/api/guests?guestId=${id}&expectedRevision=${revision ?? 0}` : '/api/guests', { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const result = await response.json();
      if (!response.ok || result?.ok !== true) throw new Error(result?.error || 'No se pudo comprobar el cambio. Conservamos tu edición; actualiza la lista.');
      return result;
    } catch (error) { throw error instanceof TypeError ? new Error('No se pudo comprobar el cambio. Revisa la lista actualizada antes de reintentar.') : error; }
    finally { refresh(); }
  };
  const recordDelivery=async(guest:HostGuest,action:DeliveryAction,url:string)=>{
    if(demo){setNotice('Vista de prueba: no se registra seguimiento real.');return;}
    if (delivery.blocked || !connected) return;
    await delivery.start(guest, action, url);
  };
  const readCsv = async (file?: File) => {
    if (!file) return;
    setInput(''); setCsv(null);
    if (file.size > 1024 * 1024) { setNotice('El archivo supera 1 MB. Divide la lista antes de importarla.'); return; }
    let parsed;
    try { parsed = parseGuestCsv(await file.text()); } catch (error) { setCsv(null); setNotice(error instanceof Error ? error.message : 'No se pudo leer el CSV.'); return; }
    setCsv(parsed); setMapping(Object.fromEntries(parsed.headers.map((header,index) => [index, guessGuestColumn(header) === 'tableNo' && !services.tableAssignment ? 'ignore' : guessGuestColumn(header)])));
    setNotice('Revisa las columnas y los registros antes de importar.');
  };
  const add = async () => {
    if (importer.busy || importer.pending || !importer.ready || !connected || (csv && (!mapped?.rows.length || mapped.mappingErrors.length || mapped.rows.length > 200))) return;
    if (demo) { setNotice('Vista de prueba: no se modifican invitados reales.'); return; }
    let rows;
    try { rows = importRows.length ? importRows : parseQuickGuestList(input); } catch (error) { setNotice(error instanceof Error ? error.message : 'Revisa la lista.'); return; }
    if (!rows.length) { setNotice('Escribe al menos un nombre.'); return; }
    const result = await importer.submit(rows);
    if (result) acceptImport(result);
    refresh();
  };
  const acceptImport = (result: GuestImportReceipt) => {
    setNotice(guestImportMessage(result)); setInput(''); setCsv(null); setAdding(false); refresh();
  };
  const status = (g: HostGuest) => <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] ${statusClass[g.status]}`}>{RESPONSE_LABELS[g.status]}</span>;
  const action = (g: HostGuest) => <button type="button" disabled={!connected} onClick={() => setEditing(g)} className="min-h-11 rounded-xl border border-[#e4dfd4] bg-white px-3 text-xs text-[#75603d] disabled:opacity-40" aria-label={`Editar ${g.name}`}>{services.tableAssignment ? 'Editar / mesa' : 'Editar'}</button>;
  return <section className={`${styles.surface} overflow-hidden rounded-3xl border border-[#e4dfd4] bg-white font-outfit`}>
    <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6"><div><h2 className="font-playfair text-2xl text-[#303e32]">Lista de invitados</h2><p className="mt-1 text-xs text-gray-500">Grupos con enlace personal. Sus respuestas y accesos se actualizan juntos.</p></div><div className="flex gap-2"><button type="button" onClick={() => setAdding(v => !v)} className="min-h-11 rounded-xl border border-[#e4dfd4] px-3 text-xs text-[#75603d]">Añadir / importar</button><button type="button" disabled={!visible.length} onClick={() => exportFile(rosterCsv(visible, services), `${slug}-invitados.csv`)} className="min-h-11 rounded-xl bg-[#516749] px-3 text-xs text-white disabled:opacity-40">Exportar CSV</button></div></div>
    {notice && <p role="status" className="mx-5 mb-4 rounded-xl bg-[#f6f3eb] p-3 text-xs text-[#75603d]">{notice}</p>}
    <div className="mx-5 mb-4"><GuestImportRecovery importer={importer} recovered={acceptImport} disabled={!connected || demo} /></div>
    {!editing && <div className="mx-5 mb-4"><DeliveryRecovery tracker={delivery} disabled={!connected || demo} /></div>}
    <div className="mx-5 mb-4 space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4"><h3 className="text-sm font-medium text-emerald-900">WhatsApp de la lista filtrada</h3><p className="text-xs leading-relaxed text-gray-600">Revisa un contacto por vez. Invitaciones: solo pendientes sin seguimiento; recordatorios: solo quienes no respondieron.</p><div className="flex flex-wrap gap-2"><button type="button" disabled={!connected || deliveryBusy || queueReview.blocked || !!queueReview.review || !invitationQueue.ids.length} onClick={() => startQueue(invitationQueue.ids,'invitation')} className="min-h-11 rounded-xl bg-emerald-700 px-3 text-xs text-white disabled:opacity-40">Preparar {invitationQueue.ids.length} {invitationQueue.ids.length === 1 ? 'invitación' : 'invitaciones'}</button><button type="button" disabled={!connected || deliveryBusy || queueReview.blocked || !!queueReview.review || !reminderQueue.ids.length} onClick={() => startQueue(reminderQueue.ids,'reminder')} className="min-h-11 rounded-xl border border-emerald-200 bg-white px-3 text-xs text-emerald-900 disabled:opacity-40">Revisar {reminderQueue.ids.length} {reminderQueue.ids.length === 1 ? 'recordatorio' : 'recordatorios'}</button></div><p className="text-[11px] text-gray-500">{reminderQueue.invalidPhone} pendientes sin teléfono válido · {reminderQueue.excluded} con respuesta. Máximo 200 contactos por revisión.{!!reminderQueue.overflow && ` Quedan ${reminderQueue.overflow} fuera de esta revisión; ajusta los filtros.`}</p></div>
    <div className="mx-5 mb-4"><WhatsAppReviewStatus controller={queueReview} resume={() => setQueueOpen(true)} disabled={!connected || deliveryBusy} /></div>
    {adding && <fieldset disabled={busy || !!importer.pending || !importer.ready || !connected} className="mx-5 mb-5 min-w-0 space-y-3 rounded-2xl border bg-[#faf9f6] p-4"><p className="text-sm font-medium text-gray-700">Añadir invitados</p><label className="block text-xs text-gray-500">Un nombre por línea, opcionalmente seguido de coma y número de pases<textarea rows={3} value={input} onChange={e => { setInput(e.target.value); setCsv(null); }} placeholder={'Ana López, 2\nCarlos Pérez, 1'} className={`${fieldClass} mt-2 w-full`} /></label><label className="block text-xs text-gray-600">O importar CSV: Nombre, Teléfono, Grupo, Preferencia, Pases, Mesa, Niños<input type="file" accept=".csv,text/csv" onChange={e => void readCsv(e.target.files?.[0])} className="mt-2 block w-full text-xs" /></label><GuestImportTemplate />{csv && mapped && <GuestImportPreview parsed={csv} mapping={mapping} changeMapping={(index,field) => setMapping(current => ({...current,[index]:field}))} result={mapped} tables={services.tableAssignment} />}<button disabled={busy || !connected || (!input.trim() && !importRows.length) || (csv !== null && (!mapped?.rows.length || !!mapped.mappingErrors.length || mapped.rows.length > 200))} type="button" onClick={() => void add()} className="min-h-11 rounded-xl bg-[#516749] px-4 text-sm text-white disabled:opacity-40">{busy ? 'Añadiendo…' : `Añadir${importRows.length ? ` ${importRows.length} ${importRows.length === 1 ? 'invitado' : 'invitados'}` : ' lista'}`}</button><p className="text-[11px] text-gray-500">Los datos de contacto se guardan junto con cada invitado. No hace falta publicar el diseño.</p></fieldset>}
    <div className="space-y-3 border-y border-[#eee9df] bg-[#fbfaf7] p-5">
      <label className="block text-sm font-medium text-gray-700">Buscar invitados<input name="guest-search" autoComplete="off" type="search" value={filter.search} onChange={e => updateFilter('search', e.target.value)} placeholder="Nombre, grupo, teléfono, mesa o código…" className={`${fieldClass} mt-2 w-full`} /></label>
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-1 text-sm font-medium text-gray-700 hover:text-[#516749]">Filtros y orden<span className="text-xs font-normal text-gray-600">{activeFilters ? `${activeFilters} ${activeFilters === 1 ? 'filtro activo' : 'filtros activos'}` : 'Todas las respuestas'} <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="ml-2 inline-block h-4 w-4 group-open:rotate-180"><path d="m4 6 4 4 4-4" /></svg></span></summary>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <select aria-label="Filtrar por grupo" value={filter.group ?? 'all'} onChange={event => updateFilter('group',event.target.value)} className={fieldClass}><option value="all">Todos los grupos</option><option value="unassigned">Sin grupo</option>{groups.map(group => <option key={group} value={group}>{group}</option>)}</select>
        <select aria-label="Respuesta del invitado" value={filter.status} onChange={e => updateFilter('status', e.target.value)} className={fieldClass}><option value="all">Todas las respuestas</option>{Object.entries(RESPONSE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select aria-label="Seguimiento de envío" value={filter.delivery} onChange={e=>updateFilter('delivery',e.target.value)} className={fieldClass}><option value="all">Todo seguimiento</option>{Object.entries(DELIVERY_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
        {services.tableAssignment && <select aria-label="Filtrar por mesa" value={filter.table} onChange={e => updateFilter('table', e.target.value)} className={fieldClass}><option value="all">Todas las mesas</option><option value="unassigned">Sin mesa</option>{tables.map(t => <option key={t} value={t}>Mesa {t}</option>)}</select>}
        {services.qrAccess && <select aria-label="Filtrar ingresos" value={filter.access} onChange={e => updateFilter('access', e.target.value)} className={fieldClass}><option value="all">Todos los accesos</option><option value="inside">Dentro ahora</option><option value="waiting">Con pases por ingresar</option></select>}
        <select aria-label="Orden de invitados" value={filter.sort} onChange={e => updateFilter('sort', e.target.value)} className={fieldClass}><option value="name">Orden: nombre</option><option value="recent">Respuesta reciente</option>{services.tableAssignment && <option value="table">Orden: mesa</option>}</select>
      </div>
      </details>
      {!!activeFilters && <button type="button" onClick={clearFilters} className="min-h-11 text-sm text-[#75603d] underline underline-offset-4">Limpiar filtros ({activeFilters})</button>}
    </div>
    {services.tableAssignment && tables.length > 0 && <details className="mx-5 pt-3"><summary className="min-h-11 cursor-pointer py-3 text-sm text-gray-700">Resumen de {tables.length} {tables.length === 1 ? 'mesa' : 'mesas'}</summary><div className="flex flex-wrap gap-2 pb-3" aria-label="Resumen de mesas">{tableSummary.map(table => <button type="button" key={table.name} aria-pressed={filter.table === table.name} onClick={() => updateFilter('table', table.name)} className={`min-h-11 rounded-xl border px-3 text-sm ${filter.table === table.name ? 'border-[#516749] bg-[#eff3ec] text-[#516749]' : 'border-[#e4dfd4] text-gray-600 hover:bg-[#f7f5ef]'}`}>Mesa {table.name} · {table.confirmed} confirmados</button>)}</div></details>}
    <div className="space-y-3 px-5 py-4"><h3 ref={resultsHeading} tabIndex={-1} className="scroll-mt-4 text-sm font-medium text-gray-800">Resultados de invitados</h3><p role="status" aria-atomic="true" className="text-sm tabular-nums text-gray-600">{listing.total ? `Mostrando ${listing.from}–${listing.to} de ${listing.total} grupos` : 'Sin resultados'}{activeFilters ? ' con los filtros elegidos.' : '.'}</p><RosterPagination page={listing.page} pages={listing.pages} changePage={changePage} /></div>
    <ul className="divide-y divide-[#eee9df] px-5 md:hidden">{listing.items.map(g => <li key={g.id} className="space-y-3 py-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-sm font-medium text-gray-800">{g.name}</h3>{g.group && <p className="mt-1 text-xs text-gray-400">{g.group}</p>}</div>{status(g)}</div><div className="grid grid-cols-2 gap-2 rounded-xl bg-[#faf9f6] p-3 text-xs text-gray-600"><p>Pases: {g.status === 'confirmed' ? g.confirmedPasses ?? g.passes : 0} / {g.passes}</p>{services.tableAssignment && <p>Mesa: {g.tableNo || 'sin asignar'}</p>}{services.qrAccess && <p>Dentro ahora: {g.inside}</p>}<p>{DELIVERY_LABELS[deliveryState(g)]}</p></div><div className="flex items-center justify-between gap-3"><a href={`/i/${slug}?g=${g.publicId}`} target="_blank" rel="noopener noreferrer" className="min-h-11 py-3 text-xs text-[#75603d] underline">Ver invitación</a>{action(g)}</div></li>)}</ul>
    <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><caption className="sr-only">Invitados y estado de acceso</caption><thead className="text-xs text-gray-500"><tr>{['Invitado', 'Respuesta', 'Seguimiento', 'Pases', ...(services.tableAssignment ? ['Mesa'] : []), ...(services.qrAccess ? ['Dentro'] : []), 'Acciones'].map(h => <th scope="col" key={h} className="px-5 py-4 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#eee9df]">{listing.items.map(g => <tr key={g.id}><td className="max-w-xs px-5 py-4"><p className="break-words font-medium text-gray-800">{g.name}</p>{g.group && <p className="mt-1 text-xs text-gray-400">{g.group}</p>}<a href={`/i/${slug}?g=${g.publicId}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block py-1 text-xs text-[#75603d] underline">Ver invitación</a></td><td className="px-5 py-4">{status(g)}</td><td className="px-5 py-4 text-xs text-gray-600">{DELIVERY_LABELS[deliveryState(g)]}</td><td className="whitespace-nowrap px-5 py-4 text-gray-600">{g.status === 'confirmed' ? g.confirmedPasses ?? g.passes : 0} / {g.passes}</td>{services.tableAssignment && <td className="px-5 py-4 text-gray-600">{g.tableNo || <span className="text-amber-700">Sin asignar</span>}</td>}{services.qrAccess && <td className="px-5 py-4 text-gray-600">{g.inside}</td>}<td className="px-5 py-4">{action(g)}</td></tr>)}</tbody></table></div>
    {!visible.length && <p className="p-8 text-center text-sm text-gray-500">{guests.length ? 'No hay invitados con estos filtros.' : 'Todavía no hay invitados. Añade tu primera lista.'}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-4 text-xs text-gray-500"><p>{visible.length} de {guests.length} grupos. CSV y WhatsApp incluyen todos los resultados filtrados, también los de otras páginas.</p><button type="button" onClick={clearFilters} className="min-h-11 underline">Limpiar filtros</button></div>
    <div className="px-5 pb-5"><RosterPagination page={listing.page} pages={listing.pages} changePage={changePage} /></div>
    {queueOpen && queueReview.review && <WhatsAppQueue key={queueReview.review.id} controller={queueReview} guests={guests} slug={slug} template={queueReview.review.purpose === 'reminder' ? reminderTemplate : whatsappTemplate} connected={connected} tracker={delivery} close={() => setQueueOpen(false)} demo={demo} />}
    {editing && <GuestEditor key={editing.id} original={editing} latest={guests.find(g => g.id === editing.id)} tables={services.tableAssignment} connected={connected} slug={slug} whatsappTemplate={whatsappTemplate} reminderTemplate={reminderTemplate} recordDelivery={recordDelivery} deliveryBusy={deliveryBusy} close={() => setEditing(null)} save={async command => { const result = await mutate('PATCH', command); verifyGuestEditReceipt(result, command); setNotice('Cambios comprobados. Actualizando el panel…'); }} remove={async revision => { await mutate('DELETE', undefined, editing.id, revision); setNotice('Invitado eliminado. Actualizando el panel…'); }}><DeliveryRecovery tracker={delivery} disabled={!connected || demo} /></GuestEditor>}
  </section>;
}
