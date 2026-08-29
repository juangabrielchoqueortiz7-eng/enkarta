'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { filterRoster, rosterCsv, type HostGuest, type HostSnapshot, type RosterFilter } from '@/lib/host-dashboard';
import { RESPONSE_LABELS } from '@/lib/response-sheet';
import { guessGuestColumn, mapGuestCsvRows, normalizeGuestPhone, parseGuestCsv, type GuestImportField, type GuestImportRow } from '@/lib/guest-import';
import { deliveryState, DELIVERY_LABELS, guestMessage, reminderMessage, type DeliveryAction } from '@/lib/guest-delivery';

const fieldClass = 'min-h-11 min-w-0 rounded-xl border border-[#e4dfd4] bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-[#ab8950] focus:ring-2 focus:ring-[#ab8950]/15';
const statusClass = { confirmed: 'bg-emerald-50 text-emerald-800', pending: 'bg-amber-50 text-amber-800', declined: 'bg-rose-50 text-rose-700' };
const exportFile = (content: string, filename: string) => {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

function GuestEditor({ original, latest, tables, connected, save, remove, close, slug, whatsappTemplate, reminderTemplate, recordDelivery }: {
  original: HostGuest; latest?: HostGuest; tables: boolean; connected: boolean;
  save: (patch: Record<string, unknown>) => Promise<void>; remove: (revision: number) => Promise<void>; close: () => void;
  slug: string; whatsappTemplate?: string; reminderTemplate?: string; recordDelivery:(guest:HostGuest,action:DeliveryAction,url:string)=>Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(original);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const stale = !latest || latest.responseRevision !== draft.responseRevision;
  useEffect(() => { dialog.current?.showModal(); }, []);
  const submit = async (action: 'save' | 'remove') => {
    if (busy || stale || !connected) return;
    if (action === 'remove' && !window.confirm(`¿Eliminar a ${draft.name}? Esta acción elimina su registro y sus pases no utilizados.`)) return;
    setBusy(true); setError('');
    try {
      if (action === 'remove') await remove(draft.responseRevision ?? 0);
      else await save({ id: draft.id, expectedRevision: draft.responseRevision, name: draft.name.trim(), passes: draft.passes, allowKids: draft.allowKids, ...(tables ? { tableNo: draft.tableNo } : {}) });
      close();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { setBusy(false); }
  };
  const link = typeof window !== 'undefined' ? `${window.location.origin}/i/${slug}?g=${original.publicId}` : '';
  const text = guestMessage(whatsappTemplate,original,link);
  const reminder = reminderMessage(reminderTemplate,original,link);
  const phone = normalizeGuestPhone(original.phone || '').replace(/\D/g, '');
  return <dialog ref={dialog} aria-label="Editar invitado" onCancel={e => { if (busy) e.preventDefault(); else close(); }} className="w-[calc(100%_-_2rem)] max-w-md rounded-3xl border border-[#e4dfd4] bg-white p-6 font-outfit shadow-2xl backdrop:bg-[#242c27]/40">
    <form onSubmit={e => { e.preventDefault(); void submit('save'); }} className="space-y-4">
      <div className="flex items-center justify-between gap-3"><h3 className="font-playfair text-xl text-gray-800">Editar invitado</h3><button type="button" onClick={close} disabled={busy} aria-label="Cerrar edición" className="h-10 w-10 rounded-full border text-gray-500">×</button></div>
      <p className="text-xs leading-relaxed text-gray-500">Los cambios se guardan juntos. Las nuevas confirmaciones no sobrescribirán lo que estás escribiendo.</p>
      <label className="block text-xs text-gray-600">Nombre<input required maxLength={80} autoFocus value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className={`${fieldClass} mt-1 w-full`} /></label>
      <div className="grid grid-cols-2 gap-3"><label className="block text-xs text-gray-600">Pases asignados<input type="number" required min={1} max={20} value={draft.passes} onChange={e => setDraft({ ...draft, passes: Number(e.target.value) })} className={`${fieldClass} mt-1 w-full`} /></label>{tables && <label className="block text-xs text-gray-600">Mesa<input maxLength={20} value={draft.tableNo || ''} onChange={e => setDraft({ ...draft, tableNo: e.target.value })} placeholder="Sin asignar" className={`${fieldClass} mt-1 w-full`} /></label>}</div>
      <label className="flex min-h-10 items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={draft.allowKids} onChange={e => setDraft({ ...draft, allowKids: e.target.checked })} />Permitir niños</label>
      <div className="rounded-xl bg-[#f7f5ef] p-3 text-xs"><p className="font-medium text-gray-700">Seguimiento: {DELIVERY_LABELS[deliveryState(original)]}</p><p className="mt-1 text-gray-500">Recordatorios preparados: {original.reminderCount ?? 0}</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setError('No se pudo copiar. Abre la invitación y copia su dirección.'); } }} className="min-h-10 rounded-xl border px-3 text-xs text-gray-600">{copied ? 'Enlace copiado' : 'Copiar enlace'}</button><button type="button" disabled={!phone || !connected} onClick={()=>void recordDelivery(original,'opened',`https://wa.me/${phone}?text=${encodeURIComponent(text)}`)} className="min-h-10 rounded-xl border border-emerald-200 px-3 text-xs text-emerald-700 disabled:opacity-40">Abrir WhatsApp</button>{original.status==='pending' && <button type="button" disabled={!phone || !connected} onClick={()=>void recordDelivery(original,'reminder',`https://wa.me/${phone}?text=${encodeURIComponent(reminder)}`)} className="min-h-10 rounded-xl border border-amber-200 px-3 text-xs text-amber-800 disabled:opacity-40">Preparar recordatorio</button>}<button type="button" disabled={!connected || deliveryState(original)==='marked' || deliveryState(original)==='responded'} onClick={()=>void recordDelivery(original,'manual','')} className="min-h-10 rounded-xl border px-3 text-xs disabled:opacity-40">Marcar manualmente</button></div><p className="text-[11px] text-gray-500">Abrir WhatsApp o preparar un recordatorio no confirma envío, entrega ni lectura. La marca manual declara únicamente una acción del equipo.</p>
      {stale && <div role="alert" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{latest ? 'Este registro cambió en otra sesión. Revisa los datos actuales antes de guardar.' : 'Este invitado ya no está disponible.'}{latest && <button type="button" onClick={() => { setDraft(latest); setError(''); }} className="mt-2 block min-h-10 font-medium underline">Cargar datos actuales</button>}</div>}
      {!connected && <p role="alert" className="text-xs text-amber-800">Espera a recuperar la conexión antes de guardar.</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
      <button disabled={busy || stale || !connected || !draft.name.trim()} className="min-h-11 w-full rounded-xl bg-[#516749] px-4 text-sm text-white disabled:opacity-40">{busy ? 'Guardando…' : 'Guardar cambios'}</button>
      <button type="button" onClick={() => void submit('remove')} disabled={busy || stale || !connected} className="min-h-10 w-full text-xs text-rose-700 disabled:opacity-40">Eliminar invitado</button>
    </form>
  </dialog>;
}

export default function HostRoster({ snapshot, invitationId, slug, connected, refresh, demo = false, whatsappTemplate, reminderTemplate }: {
  snapshot: HostSnapshot; invitationId: string; slug: string; connected: boolean; refresh: () => void; demo?: boolean; whatsappTemplate?: string; reminderTemplate?: string;
}) {
  const { guests, services } = snapshot;
  const [filter, setFilter] = useState<RosterFilter>({ search: '', status: 'all', delivery:'all', table: 'all', access: 'all', sort: 'name' });
  const [editing, setEditing] = useState<HostGuest | null>(null);
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState('');
  const [importRows, setImportRows] = useState<GuestImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const visible = useMemo(() => filterRoster(guests, filter), [guests, filter]);
  const tables = useMemo(() => Array.from(new Set(guests.map(g => g.tableNo?.trim()).filter((v): v is string => !!v))).sort((a, b) => a.localeCompare(b, 'es', { numeric: true })), [guests]);
  const updateFilter = (key: keyof RosterFilter, value: string) => setFilter(current => ({ ...current, [key]: value }));
  const mutate = async (method: string, body?: unknown, id?: string, revision?: number) => {
    if (demo) throw new Error('Vista de prueba: no se modifican invitados reales.');
    try {
      const response = await fetch(id ? `/api/guests?guestId=${id}&expectedRevision=${revision ?? 0}` : '/api/guests', { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo completar el cambio.');
      setNotice('Cambio guardado. Actualizando el panel…');
      return result;
    } catch (error) { throw error instanceof TypeError ? new Error('No se pudo comprobar el cambio. Revisa la lista actualizada antes de reintentar.') : error; }
    finally { refresh(); }
  };
  const recordDelivery=async(guest:HostGuest,action:DeliveryAction,url:string)=>{
    if(demo){setNotice('Vista de prueba: no se registra seguimiento real.');return;}
    const popup=url ? window.open('about:blank','_blank','noopener,noreferrer') : null;
    try { const response=await fetch('/api/guests/delivery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({guestId:guest.id,action,expectedRevision:guest.responseRevision,requestId:crypto.randomUUID()})}); const result=await response.json(); if(!response.ok)throw new Error(result.error||'No se pudo registrar.'); if(popup&&url)popup.location.href=url; setNotice(action==='manual'?'Marca manual registrada.':'WhatsApp preparado. No se presume entrega.'); }
    catch(e){popup?.close();setNotice(e instanceof Error?e.message:'No se pudo registrar.');} finally{refresh();}
  };
  const readCsv = async (file?: File) => {
    if (!file) return;
    if (file.size > 1024 * 1024) { setNotice('El archivo supera 1 MB. Divide la lista antes de importarla.'); return; }
    const parsed = parseGuestCsv(await file.text());
    const mapping = Object.fromEntries(parsed.headers.map((header, index) => {
      const field = guessGuestColumn(header);
      return [index, ['name', 'passes', 'allowKids', ...(services.tableAssignment ? ['tableNo'] : [])].includes(field) ? field : 'ignore'];
    })) as Record<number, GuestImportField>;
    const mapped = mapGuestCsvRows(parsed, mapping, guests.map(g => ({ ...g, phone: undefined })));
    setImportRows(mapped.rows.slice(0, 200));
    setNotice(`${mapped.rows.length} registros válidos · ${mapped.duplicates} duplicados omitidos · ${mapped.invalid} filas inválidas. Se importan nombre, pases, niños y mesa (máximo 200 por lote).`);
  };
  const add = async () => {
    const rows = importRows.length ? importRows : input.split('\n').map(line => {
      const match = line.trim().match(/^(.*?)(?:,\s*(\d+))?$/);
      return { name: (match?.[1] || '').trim().slice(0, 80), passes: Math.max(1, Math.min(20, Number(match?.[2]) || 1)), allowKids: true };
    }).filter(r => r.name).slice(0, 200);
    if (!rows.length) { setNotice('Escribe al menos un nombre.'); return; }
    setBusy(true);
    try { await mutate('POST', { invitationId, guests: rows }); setInput(''); setImportRows([]); setAdding(false); }
    catch (e) { setNotice(e instanceof Error ? e.message : 'No se pudo importar.'); }
    finally { setBusy(false); }
  };
  const status = (g: HostGuest) => <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] ${statusClass[g.status]}`}>{RESPONSE_LABELS[g.status]}</span>;
  const action = (g: HostGuest) => <button type="button" disabled={!connected} onClick={() => setEditing(g)} className="min-h-10 rounded-xl border border-[#e4dfd4] bg-white px-3 text-xs text-[#75603d] disabled:opacity-40" aria-label={`Editar ${g.name}`}>{services.tableAssignment ? 'Editar / mesa' : 'Editar'}</button>;
  return <section className="overflow-hidden rounded-3xl border border-[#e4dfd4] bg-white font-outfit">
    <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6"><div><h2 className="font-playfair text-2xl text-[#303e32]">Lista de invitados</h2><p className="mt-1 text-xs text-gray-500">Grupos con enlace personal. Sus respuestas y accesos se actualizan juntos.</p></div><div className="flex gap-2"><button type="button" onClick={() => setAdding(v => !v)} className="min-h-11 rounded-xl border border-[#e4dfd4] px-3 text-xs text-[#75603d]">Añadir / importar</button><button type="button" disabled={!visible.length} onClick={() => exportFile(rosterCsv(visible, services), `${slug}-invitados.csv`)} className="min-h-11 rounded-xl bg-[#516749] px-3 text-xs text-white disabled:opacity-40">Exportar CSV</button></div></div>
    {notice && <p role="status" className="mx-5 mb-4 rounded-xl bg-[#f6f3eb] p-3 text-xs text-[#75603d]">{notice}</p>}
    {adding && <div className="mx-5 mb-5 space-y-3 rounded-2xl border bg-[#faf9f6] p-4"><p className="text-sm font-medium text-gray-700">Añadir invitados</p><label className="block text-xs text-gray-500">Un nombre por línea, opcionalmente seguido de coma y número de pases<textarea rows={3} value={input} onChange={e => { setInput(e.target.value); setImportRows([]); }} placeholder={'Ana López, 2\nCarlos Pérez, 1'} className={`${fieldClass} mt-2 w-full`} /></label><label className="block text-xs text-gray-600">O importar CSV con encabezados: Nombre, Pases, Mesa, Niños<input type="file" accept=".csv,text/csv" onChange={e => void readCsv(e.target.files?.[0])} className="mt-2 block w-full text-xs" /></label>{!!importRows.length && <p className="text-xs text-gray-600">Vista previa: {importRows.slice(0, 3).map(g => `${g.name} (${g.passes})`).join(' · ')}</p>}<button disabled={busy || !connected || (!input.trim() && !importRows.length)} type="button" onClick={() => void add()} className="min-h-11 rounded-xl bg-[#516749] px-4 text-sm text-white disabled:opacity-40">{busy ? 'Añadiendo…' : `Añadir${importRows.length ? ` ${importRows.length} invitados` : ' lista'}`}</button><p className="text-[11px] text-gray-500">Teléfonos y grupos preparados en el editor se muestran para consulta. Esta importación no modifica esos datos.</p></div>}
    <div className="space-y-3 border-y border-[#eee9df] bg-[#fbfaf7] p-5">
      <input aria-label="Buscar invitados" value={filter.search} onChange={e => updateFilter('search', e.target.value)} placeholder="Buscar nombre, grupo, teléfono, mesa o código…" className={`${fieldClass} w-full`} />
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <select aria-label="Respuesta del invitado" value={filter.status} onChange={e => updateFilter('status', e.target.value)} className={fieldClass}><option value="all">Todas las respuestas</option>{Object.entries(RESPONSE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select aria-label="Seguimiento de envío" value={filter.delivery} onChange={e=>updateFilter('delivery',e.target.value)} className={fieldClass}><option value="all">Todo seguimiento</option>{Object.entries(DELIVERY_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
        {services.tableAssignment && <select aria-label="Filtrar por mesa" value={filter.table} onChange={e => updateFilter('table', e.target.value)} className={fieldClass}><option value="all">Todas las mesas</option><option value="unassigned">Sin mesa</option>{tables.map(t => <option key={t} value={t}>Mesa {t}</option>)}</select>}
        {services.qrAccess && <select aria-label="Filtrar ingresos" value={filter.access} onChange={e => updateFilter('access', e.target.value)} className={fieldClass}><option value="all">Todos los accesos</option><option value="inside">Dentro ahora</option><option value="waiting">Con pases por ingresar</option></select>}
        <select aria-label="Orden de invitados" value={filter.sort} onChange={e => updateFilter('sort', e.target.value)} className={fieldClass}><option value="name">Orden: nombre</option><option value="recent">Respuesta reciente</option>{services.tableAssignment && <option value="table">Orden: mesa</option>}</select>
      </div>
    </div>
    {services.tableAssignment && tables.length > 0 && <div className="flex flex-wrap gap-2 px-5 pt-4" aria-label="Resumen de mesas">{tables.map(t => <button type="button" key={t} onClick={() => updateFilter('table', t)} className={`min-h-10 rounded-xl border px-3 text-xs ${filter.table === t ? 'border-[#516749] bg-[#eff3ec] text-[#516749]' : 'border-[#e4dfd4] text-gray-500'}`}>Mesa {t} · {guests.filter(g => g.tableNo === t && g.status === 'confirmed').reduce((sum, g) => sum + (g.confirmedPasses ?? g.passes), 0)} confirmados</button>)}</div>}
    <ul className="divide-y divide-[#eee9df] px-5 md:hidden">{visible.map(g => <li key={g.id} className="space-y-3 py-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words text-sm font-medium text-gray-800">{g.name}</h3>{g.group && <p className="mt-1 text-xs text-gray-400">{g.group}</p>}</div>{status(g)}</div><div className="grid grid-cols-2 gap-2 rounded-xl bg-[#faf9f6] p-3 text-xs text-gray-600"><p>Pases: {g.status === 'confirmed' ? g.confirmedPasses ?? g.passes : 0} / {g.passes}</p>{services.tableAssignment && <p>Mesa: {g.tableNo || 'sin asignar'}</p>}{services.qrAccess && <p>Dentro ahora: {g.inside}</p>}<p>{DELIVERY_LABELS[deliveryState(g)]}</p></div><div className="flex items-center justify-between gap-3"><a href={`/i/${slug}?g=${g.publicId}`} target="_blank" rel="noopener noreferrer" className="min-h-10 py-3 text-xs text-[#75603d] underline">Ver invitación</a>{action(g)}</div></li>)}</ul>
    <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><caption className="sr-only">Invitados y estado de acceso</caption><thead className="text-xs text-gray-500"><tr>{['Invitado', 'Respuesta', 'Seguimiento', 'Pases', ...(services.tableAssignment ? ['Mesa'] : []), ...(services.qrAccess ? ['Dentro'] : []), 'Acciones'].map(h => <th scope="col" key={h} className="px-5 py-4 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-[#eee9df]">{visible.map(g => <tr key={g.id}><td className="max-w-xs px-5 py-4"><p className="break-words font-medium text-gray-800">{g.name}</p>{g.group && <p className="mt-1 text-xs text-gray-400">{g.group}</p>}<a href={`/i/${slug}?g=${g.publicId}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block py-1 text-xs text-[#75603d] underline">Ver invitación</a></td><td className="px-5 py-4">{status(g)}</td><td className="px-5 py-4 text-xs text-gray-600">{DELIVERY_LABELS[deliveryState(g)]}</td><td className="whitespace-nowrap px-5 py-4 text-gray-600">{g.status === 'confirmed' ? g.confirmedPasses ?? g.passes : 0} / {g.passes}</td>{services.tableAssignment && <td className="px-5 py-4 text-gray-600">{g.tableNo || <span className="text-amber-700">Sin asignar</span>}</td>}{services.qrAccess && <td className="px-5 py-4 text-gray-600">{g.inside}</td>}<td className="px-5 py-4">{action(g)}</td></tr>)}</tbody></table></div>
    {!visible.length && <p className="p-8 text-center text-sm text-gray-500">{guests.length ? 'No hay invitados con estos filtros.' : 'Todavía no hay invitados. Añade tu primera lista.'}</p>}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-4 text-xs text-gray-500"><p>{visible.length} de {guests.length} grupos · El CSV respeta los filtros.</p><button type="button" onClick={() => setFilter({ search: '', status: 'all', delivery:'all', table: 'all', access: 'all', sort: 'name' })} className="min-h-10 underline">Limpiar filtros</button></div>
    {editing && <GuestEditor original={editing} latest={guests.find(g => g.id === editing.id)} tables={services.tableAssignment} connected={connected} slug={slug} whatsappTemplate={whatsappTemplate} reminderTemplate={reminderTemplate} recordDelivery={recordDelivery} close={() => setEditing(null)} save={async patch => { await mutate('PATCH', patch); }} remove={async revision => { await mutate('DELETE', undefined, editing.id, revision); }} />}
  </section>;
}
