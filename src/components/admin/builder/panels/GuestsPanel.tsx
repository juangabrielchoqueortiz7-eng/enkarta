'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { allowsService } from '@/lib/packages';
import type { Guest, GuestEventAccess, InvitationParsed } from '@/lib/types';
import { guessGuestColumn, mapGuestCsvRows, normalizeGuestPhone, parseGuestCsv, parseQuickGuestList, type GuestImportField, type GuestImportRow, type ParsedGuestCsv } from '@/lib/guest-import';
import { deliveryState, DELIVERY_LABELS, guestMessage, type DeliveryAction } from '@/lib/guest-delivery';
import { csvCell } from '@/lib/host-dashboard';
import { mergeSavedGuest } from '@/lib/guest-edits';
import GuestImportPreview, { GuestImportTemplate } from '@/components/admin/host/GuestImportPreview';
import GuestImportRecovery, { useGuestImport } from '@/components/admin/host/GuestImportRecovery';
import { guestImportMessage, type GuestImportReceipt } from '@/lib/guest-import-operation';
import DeliveryRecovery, { useDeliveryTracking } from '@/components/admin/host/DeliveryRecovery';

interface Props {
  data: InvitationParsed;
  onChange?: (patch: Partial<InvitationParsed>) => void;
  onPreview?: (guest: Guest | null) => void;
  previewGuestId?: string;
}

const STATUS_META: Record<Guest['status'], { label: string; cls: string }> = {
  confirmed: { label: 'Confirmado', cls: 'bg-emerald-50 text-emerald-700' },
  declined: { label: 'No asiste', cls: 'bg-rose-50 text-rose-600' },
  pending: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700' },
};
const EVENT_LABEL: Record<GuestEventAccess, string> = { both: 'Todo el evento', ceremony: 'Solo ceremonia', reception: 'Solo recepción' };
type StatusFilter = 'all' | Guest['status'] | 'sent' | 'unsent';

export default function GuestsPanel({ data, onChange, onPreview, previewGuestId }: Props) {
  const included = allowsService(data.config, 'guestManagement');
  const tables = allowsService(data.config, 'tableAssignment');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [bulk, setBulk] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [csv, setCsv] = useState<ParsedGuestCsv | null>(null);
  const [mapping, setMapping] = useState<Record<number, GuestImportField>>({});
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [messageGuestId, setMessageGuestId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const importer = useGuestImport(data.id);
  const adding = importer.busy;
  const [busyEdits, setBusyGuests] = useState<Set<string>>(new Set());
  const locked = useRef(new Set<string>());
  const addingRef = useRef(false);
  addingRef.current = adding || !!importer.pending;
  const revisions = useRef(new Map<string, number>());
  const loadRequest = useRef<AbortController | null>(null);
  const delivery = useDeliveryTracking((saved, submitted, operation) => {
    revisions.current.set(saved.id, saved.responseRevision ?? 0);
    setGuests(items => items.map(item => item.id === saved.id ? mergeSavedGuest(item, submitted ?? saved, saved) : item));
    setNotice(operation.action === 'manual' ? 'Marca manual registrada.' : 'WhatsApp solicitado. No se confirma envío ni entrega.');
  }, undefined, undefined, included ? data.id : undefined);
  const busyGuests = new Set(busyEdits);
  if (delivery.pending) busyGuests.add(delivery.pending.operation.guestId);

  const base = typeof window !== 'undefined' ? window.location.origin : 'https://enkarta.com';
  const linkFor = (publicId: string) => `${base}/i/${data.slug}?g=${publicId}`;
  const load = useCallback(() => {
    if (locked.current.size || addingRef.current) return;
    if (!included) { setGuests([]); setLoading(false); return; }
    loadRequest.current?.abort();
    const controller = new AbortController(); loadRequest.current = controller;
    setLoading(true); setLoadFailed(false);
    fetch(`/api/guests?id=${data.id}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || 'No se pudieron cargar los invitados'); return body; })
      .then(value => { if (controller.signal.aborted) return; if (!Array.isArray(value)) throw new Error('No se pudo leer la lista de invitados.'); const loaded: Guest[] = value; revisions.current = new Map(loaded.map(guest => [guest.id, guest.responseRevision ?? 0])); setGuests(loaded); })
      .catch(error => { if (!controller.signal.aborted) { setNotice(error.message); setLoadFailed(true); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
  }, [data.id, included]);
  useEffect(() => { load(); return () => loadRequest.current?.abort(); }, [load]);

  const patchGuest = (id: string, patch: Partial<Guest>) => {
    if (locked.current.has(id) || delivery.pending?.operation.guestId === id) return;
    const current = guests.find(guest => guest.id === id);
    if (!current) return;
    if (patch.passes !== undefined && (!Number.isInteger(patch.passes) || patch.passes < 1 || patch.passes > 20)) { setNotice('Pases: escribe un entero entre 1 y 20 antes de guardar.'); return; }
    if (patch.phone) { const phone = normalizeGuestPhone(patch.phone); if (!phone) { setNotice('Revisa el teléfono: usa un número con código de país y hasta 15 dígitos.'); return; } patch = { ...patch, phone }; }
    const updated = { ...current, ...patch };
    setGuests(items => items.map(guest => guest.id === id ? updated : guest));
    if (previewGuestId === id) onPreview?.(updated);

    const apiPatch = patch;
    if (Object.keys(apiPatch).length) {
      locked.current.add(id); setBusyGuests(new Set(locked.current));
      fetch('/api/guests', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, expectedRevision: revisions.current.get(id), ...apiPatch }),
    }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se guardaron los cambios.');
      revisions.current.set(id, result.guest.responseRevision);
      setGuests(items => items.map(guest => guest.id === id ? mergeSavedGuest(guest, updated, result.guest) : guest));
      setNotice('Cambios del invitado guardados.');
    }).catch(error => { setNotice(`${error.message || 'No se pudo comprobar el cambio.'} Conservamos lo escrito; copia tus cambios antes de actualizar la lista.`); })
      .finally(() => { locked.current.delete(id); setBusyGuests(new Set(locked.current)); });
    }
  };

  const editGuest = (id: string, patch: Partial<Guest>) => setGuests(items => items.map(guest => guest.id === id ? { ...guest, ...patch } : guest));

  const removeGuest = async (guest: Guest) => {
    if (locked.current.has(guest.id) || delivery.pending?.operation.guestId === guest.id || !window.confirm(`¿Eliminar a ${guest.name} y sus pases no utilizados?`)) return;
    locked.current.add(guest.id); setBusyGuests(new Set(locked.current));
    try {
      const response = await fetch(`/api/guests?guestId=${guest.id}&expectedRevision=${revisions.current.get(guest.id)}`, { method: 'DELETE' });
      if (!response.ok) { const result = await response.json(); setNotice(result.error || 'No se pudo eliminar.'); return; }
    } catch { setNotice('Sin conexión. Actualiza la lista para comprobar la eliminación antes de repetir.'); return; }
    finally { locked.current.delete(guest.id); setBusyGuests(new Set(locked.current)); }
    setGuests(items => items.filter(item => item.id !== guest.id));
    if (previewGuestId === guest.id) onPreview?.(null);
  };

  const acceptImport = (result: GuestImportReceipt) => {
    result.guests.forEach(guest => revisions.current.set(guest.id, Math.max(revisions.current.get(guest.id) ?? 0, guest.responseRevision ?? 0)));
    setGuests(items => {
      const existing = new Map(items.map(guest => [guest.id, guest]));
      result.guests.forEach(guest => { if ((existing.get(guest.id)?.responseRevision ?? -1) <= (guest.responseRevision ?? 0)) existing.set(guest.id, guest); });
      return Array.from(existing.values());
    });
    setNotice(guestImportMessage(result));
  };
  const addGuests = async (rows: GuestImportRow[]) => {
    if (addingRef.current || !importer.ready) return null;
    if (rows.length > 200) { setNotice('Importa hasta 200 invitados por lote. Divide la lista para continuar.'); return null; }
    loadRequest.current?.abort(); setLoading(false);
    const result = await importer.submit(rows);
    if (result) acceptImport(result);
    return result;
  };

  const importBulk = async () => {
    let rows: GuestImportRow[];
    try { rows = parseQuickGuestList(bulk); } catch (error) { setNotice((error as Error).message); return; }
    if (!rows.length) { setNotice('Escribe al menos un nombre.'); return; }
    const result = await addGuests(rows);
    if (result) setBulk('');
  };

  const readCsv = async (file?: File) => {
    if (!file) return;
    if (file.size > 1024 * 1024) { setNotice('El CSV supera 1 MB. Divide la lista antes de importarla.'); return; }
    let parsed: ParsedGuestCsv;
    try { parsed = parseGuestCsv(await file.text()); } catch (error) { setCsv(null); setNotice(error instanceof Error ? error.message : 'No se pudo leer el CSV.'); return; }
    setCsv(parsed);
    setMapping(Object.fromEntries(parsed.headers.map((header, index) => [index, guessGuestColumn(header)])));
    setNotice('');
  };
  const mappedCsv = useMemo(() => csv ? mapGuestCsvRows(csv, mapping, guests) : null, [csv, mapping, guests]);
  const importCsv = async () => {
    if (!mappedCsv?.rows.length) return;
    const result = await addGuests(mappedCsv.rows);
    if (result) setNotice(`${guestImportMessage(result)} ${mappedCsv.duplicates} duplicados omitidos · ${mappedCsv.invalid} filas inválidas.`);
    if (result) { setCsv(null); setMapping({}); }
  };

  const copy = (value: string, key: string) => navigator.clipboard?.writeText(value).then(() => {
    setCopied(key); setTimeout(() => setCopied(null), 1500);
  }).catch(() => {});

  const whatsappText = (guest: Guest) => {
    return guestMessage(data.config?.whatsappTemplate,guest,linkFor(guest.publicId));
  };
  const waLink = (guest: Guest) => {
    const digits = normalizeGuestPhone(guest.phone || '').replace(/\D/g, '');
    return `https://wa.me/${digits}?text=${encodeURIComponent(whatsappText(guest))}`;
  };

  const recordDelivery = async (guest: Guest, action: DeliveryAction, url?: string) => {
    if (locked.current.has(guest.id) || delivery.blocked || loading) return;
    loadRequest.current?.abort();
    await delivery.start({ ...guest, responseRevision: revisions.current.get(guest.id) ?? guest.responseRevision }, action, url);
  };

  const exportCsv = () => {
    const header = ['Nombre', 'Teléfono', 'Grupo', 'Preferencia informativa', 'Mesa', 'Pases', 'Estado', 'Pases confirmados', 'Seguimiento', 'Recordatorios', 'Enlace personal'];
    const rows = guests.map(guest => [guest.name, guest.phone ?? '', guest.group ?? '', EVENT_LABEL[guest.eventAccess ?? 'both'], guest.tableNo ?? '', guest.passes, STATUS_META[guest.status].label, guest.confirmedPasses ?? '', DELIVERY_LABELS[deliveryState(guest)], guest.reminderCount ?? 0, linkFor(guest.publicId)]);
    const url = URL.createObjectURL(new Blob(['\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${data.slug}-invitados.csv`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const stats = useMemo(() => {
    const confirmed = guests.filter(guest => guest.status === 'confirmed');
    return {
      total: guests.length, sent: guests.filter(guest => deliveryState(guest) === 'marked').length, confirmed: confirmed.length,
      pending: guests.filter(guest => guest.status === 'pending').length, declined: guests.filter(guest => guest.status === 'declined').length,
      seats: confirmed.reduce((sum, guest) => sum + (guest.confirmedPasses ?? guest.passes), 0), capacity: guests.reduce((sum, guest) => sum + guest.passes, 0),
    };
  }, [guests]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return guests.filter(guest => {
      if (query && ![guest.name, guest.tableNo, guest.phone, guest.group].some(value => value?.toLowerCase().includes(query))) return false;
      if (filter === 'sent') return deliveryState(guest) === 'marked';
      if (filter === 'unsent') return deliveryState(guest) === 'pending';
      return filter === 'all' || guest.status === filter;
    });
  }, [guests, search, filter]);

  if (!included) return <p className="m-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 font-outfit">Este paquete no incluye invitados personalizados. Puedes registrar el servicio como adicional en Configuración.</p>;

  return (
    <div className="space-y-4 p-4">
      {notice && <p role="status" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{notice}</p>}
      <GuestImportRecovery importer={importer} recovered={result => { acceptImport(result); setBulk(''); setCsv(null); setMapping({}); }} />
      <DeliveryRecovery tracker={delivery} />
      <div className="flex items-center justify-between">
        <div><h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 font-outfit">Invitados personalizados</h4><p className="mt-0.5 text-[10px] text-gray-400 font-outfit">Segmenta, simula y prepara cada invitación.</p></div>
        <div className="flex gap-2"><button type="button" onClick={exportCsv} disabled={!guests.length} className="text-xs text-gray-500 disabled:opacity-30 font-outfit">↓ CSV</button><button type="button" onClick={load} disabled={loading || adding || busyGuests.size > 0} className="text-xs text-enkarta-gold font-outfit">{loading ? 'Actualizando…' : '↻ Actualizar'}</button></div>
      </div>
      <details className="rounded-2xl border border-gray-100 bg-white p-3"><summary className="cursor-pointer text-xs font-semibold text-gray-600 font-outfit">Mensajes personalizados de WhatsApp</summary><div className="mt-3 space-y-3"><label className="block text-[10px] text-gray-500 font-outfit">Invitación<textarea rows={3} maxLength={1200} value={data.config?.whatsappTemplate ?? ''} onChange={event=>onChange?.({config:{...(data.config??{}),whatsappTemplate:event.target.value}})} placeholder="¡Hola {nombre}! Aquí tienes tu invitación: {link}" className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-xs"/></label><label className="block text-[10px] text-gray-500 font-outfit">Recordatorio<textarea rows={3} maxLength={1200} value={data.config?.whatsappReminderTemplate ?? ''} onChange={event=>onChange?.({config:{...(data.config??{}),whatsappReminderTemplate:event.target.value}})} placeholder="Hola {nombre}, te recordamos confirmar aquí: {link}" className="mt-1 w-full rounded-xl border border-gray-200 p-2 text-xs"/></label><p className="text-[9px] leading-relaxed text-gray-400">Variables: {'{nombre}'}, {'{link}'}, {'{pases}'}, {'{mesa}'}, {'{codigo}'}. Sin proveedor externo no podemos confirmar envío, entrega o lectura.</p></div></details>

      <div className="grid grid-cols-5 gap-1.5">
        {[[stats.total, 'Total', '#5a4e34'], [stats.sent, 'Marcadas', '#3d6b78'], [stats.confirmed, 'Sí', '#357054'], [stats.pending, 'Pend.', '#9a762f'], [stats.declined, 'No', '#9a4f59']].map(([number, label, color]) => <div key={String(label)} className="rounded-xl border border-gray-100 bg-white py-2 text-center"><p className="font-playfair text-lg font-bold" style={{ color: String(color) }}>{number}</p><p className="text-[8px] uppercase tracking-wide text-gray-400 font-outfit">{label}</p></div>)}
      </div>
      <div className="rounded-2xl border border-enkarta-gold/20 bg-gradient-to-r from-enkarta-gold/5 to-white p-3 text-center"><p className="font-playfair text-2xl font-bold text-enkarta-gold">{stats.seats}<span className="text-base text-gray-300"> / {stats.capacity}</span></p><p className="text-[9px] uppercase tracking-wider text-gray-400 font-outfit">Cupos confirmados</p></div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={adding || !!importer.pending || !importer.ready || loading || loadFailed} onClick={() => addGuests([{ name: 'Nuevo invitado', passes: 1, allowKids: true, eventAccess: 'both' }])} className="rounded-xl bg-enkarta-gold py-2.5 text-sm font-medium text-white font-outfit">+ Invitado</button>
        <button type="button" onClick={() => setShowImport(value => !value)} className="rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 font-outfit">Importar lista</button>
      </div>

      {showImport && <fieldset disabled={adding || !!importer.pending || !importer.ready || loading || loadFailed} className="min-w-0 space-y-3 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-3 disabled:opacity-60">
        <div><p className="text-xs font-semibold text-cyan-900 font-outfit">Importación inteligente CSV</p><GuestImportTemplate /><p className="text-[10px] text-cyan-700/70 font-outfit">Reconoce coma, punto y coma o tabulaciones; después puedes corregir cada columna.</p></div>
        <label className="block cursor-pointer rounded-xl border border-dashed border-cyan-200 bg-white px-3 py-3 text-center text-xs text-cyan-700 font-outfit">Seleccionar archivo .CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={event => readCsv(event.target.files?.[0])} /></label>
        {csv && <div className="space-y-2 rounded-xl border border-cyan-100 bg-white p-2.5">
          {mappedCsv && <GuestImportPreview parsed={csv} mapping={mapping} changeMapping={(index,field) => setMapping(current => ({...current,[index]:field}))} result={mappedCsv} tables={tables} />}
          <p className="text-[10px] text-cyan-800">Máximo 200 registros por lote. Divide los archivos mayores.</p><button type="button" disabled={adding || !mappedCsv?.rows.length || mappedCsv.rows.length > 200} onClick={importCsv} className="w-full rounded-lg bg-cyan-700 py-2 text-xs font-medium text-white disabled:opacity-40 font-outfit">Importar invitados válidos</button>
        </div>}
        <details><summary className="cursor-pointer text-[10px] text-gray-500 font-outfit">Pegar una lista rápida</summary><div className="mt-2 space-y-2"><textarea value={bulk} onChange={event => setBulk(event.target.value)} rows={4} placeholder={'Ana López, 2\nCarlos Pérez, 1'} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none font-outfit"/><button type="button" disabled={adding || loading || loadFailed} onClick={importBulk} className="w-full rounded-lg bg-gray-800 py-2 text-xs text-white font-outfit">Añadir lista pegada</button></div></details>
        {notice && <p className="rounded-lg bg-white px-2.5 py-2 text-[10px] text-cyan-800 font-outfit">{notice}</p>}
      </fieldset>}

      {!!guests.length && <div className="space-y-2"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar nombre, teléfono, grupo o mesa…" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-enkarta-gold font-outfit"/><div className="flex flex-wrap gap-1">{([['all', 'Todos'], ['confirmed', 'Confirmados'], ['pending', 'Pendientes'], ['declined', 'No asisten'], ['sent', 'Marca manual'], ['unsent', 'Sin seguimiento']] as [StatusFilter, string][]).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-2.5 py-1 text-[10px] font-outfit ${filter === value ? 'bg-enkarta-gold text-white' : 'bg-gray-100 text-gray-500'}`}>{label}</button>)}</div></div>}

      {!guests.length ? <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-400 font-outfit">{loading ? 'Cargando invitados…' : loadFailed ? 'No pudimos consultar la lista. Pulsa Actualizar para reintentar.' : 'Añade invitados para crear enlaces, contenido y pases personales.'}</div> : <div className="space-y-2">
        {visible.map(guest => <div key={guest.id} className={`space-y-2.5 rounded-2xl border bg-white p-3 transition-all ${previewGuestId === guest.id ? 'border-cyan-300 shadow-[0_8px_25px_rgba(8,145,178,.10)]' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2"><input aria-label="Nombre del invitado" maxLength={80} value={guest.name} disabled={busyGuests.has(guest.id)} onChange={event => editGuest(guest.id, { name: event.target.value })} onBlur={event => patchGuest(guest.id, { name: event.target.value.trim() })} className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-enkarta-gold font-outfit"/><button type="button" disabled={busyGuests.has(guest.id)} onClick={() => removeGuest(guest)} title="Eliminar" className="px-1.5 text-gray-300 hover:text-red-500">×</button></div>
          <div className="grid grid-cols-2 gap-2"><input aria-label="Teléfono del invitado" disabled={busyGuests.has(guest.id)} value={guest.phone ?? ''} onChange={event => editGuest(guest.id, { phone: event.target.value })} onBlur={event => patchGuest(guest.id, { phone: event.target.value })} placeholder="WhatsApp +591…" className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none font-outfit"/><input aria-label="Grupo del invitado" maxLength={40} disabled={busyGuests.has(guest.id)} value={guest.group ?? ''} onChange={event => editGuest(guest.id, { group: event.target.value })} onBlur={event => patchGuest(guest.id, { group: event.target.value.trim() })} placeholder="Grupo: Familia, VIP…" className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none font-outfit"/></div>
          <div className="grid grid-cols-[72px_72px_1fr] gap-2"><label className="text-[9px] text-gray-400 font-outfit">Mesa<input disabled={!tables || busyGuests.has(guest.id)} title={tables ? "Mesa del invitado" : "No incluida en este paquete"} value={guest.tableNo ?? ''} onChange={event => editGuest(guest.id, { tableNo: event.target.value })} onBlur={event => patchGuest(guest.id, { tableNo: event.target.value })} className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1 text-center text-xs outline-none"/></label><label className="text-[9px] text-gray-400 font-outfit">Pases<input type="number" min={1} max={20} value={guest.passes} disabled={busyGuests.has(guest.id)} onChange={event => editGuest(guest.id, { passes: Number(event.target.value) })} onBlur={event => patchGuest(guest.id, { passes: Number(event.target.value) })} className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1 text-center text-xs outline-none"/></label><label className="text-[9px] text-gray-400 font-outfit">Preferencia informativa<select disabled={busyGuests.has(guest.id)} title="Información de asistencia; no restringe el QR por ubicación" value={guest.eventAccess ?? 'both'} onChange={event => patchGuest(guest.id, { eventAccess: event.target.value as GuestEventAccess })} className="mt-0.5 w-full rounded-lg border border-gray-200 px-1.5 py-1 text-[10px] outline-none"><option value="both">Todo</option><option value="ceremony">Ceremonia</option><option value="reception">Recepción</option></select></label></div>
          <div className="flex items-center gap-1.5"><button type="button" disabled={busyGuests.has(guest.id)} onClick={() => patchGuest(guest.id, { allowKids: !guest.allowKids })} className={`rounded-lg px-2 py-1 text-[10px] font-outfit ${guest.allowKids ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{guest.allowKids ? 'Niños permitidos' : 'Solo adultos'}</button><span className={`rounded-full px-2 py-1 text-[10px] font-outfit ${STATUS_META[guest.status].cls}`}>{STATUS_META[guest.status].label}</span>{guest.accessCode && <span className="text-[9px] text-gray-400 font-mono">{guest.accessCode}</span>}</div>
          <div className="grid grid-cols-4 gap-1.5"><button type="button" onClick={() => onPreview?.(previewGuestId === guest.id ? null : guest)} className={`rounded-lg border py-1.5 text-[10px] font-outfit ${previewGuestId === guest.id ? 'border-cyan-300 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-500'}`}>{previewGuestId === guest.id ? '◎ Viendo' : 'Vista'}</button><button type="button" disabled={delivery.blocked || busyGuests.has(guest.id) || ['marked', 'responded'].includes(deliveryState(guest))} title="Marcar envío manualmente" onClick={() => void recordDelivery(guest, 'manual')} className={`rounded-lg border py-1.5 text-[10px] font-outfit disabled:opacity-50 ${deliveryState(guest)!=='pending' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>{DELIVERY_LABELS[deliveryState(guest)]}</button><button type="button" onClick={() => copy(linkFor(guest.publicId), guest.publicId)} className="rounded-lg border border-gray-200 py-1.5 text-[10px] text-gray-500 font-outfit">{copied === guest.publicId ? '✓ Copiado' : 'Copiar link'}</button><button type="button" onClick={() => setMessageGuestId(value => value === guest.id ? null : guest.id)} className="rounded-lg bg-[#25D366] py-1.5 text-[10px] text-white font-outfit">WhatsApp</button></div>
          {messageGuestId === guest.id && <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5"><p className="whitespace-pre-wrap text-[11px] leading-relaxed text-gray-600 font-outfit">{whatsappText(guest)}</p><div className="flex gap-2"><button type="button" onClick={() => copy(whatsappText(guest), `message-${guest.id}`)} className="flex-1 rounded-lg border border-emerald-200 bg-white py-1.5 text-[10px] text-emerald-700 font-outfit">{copied === `message-${guest.id}` ? '✓ Copiado' : 'Copiar mensaje'}</button><button type="button" disabled={delivery.blocked || busyGuests.has(guest.id) || !normalizeGuestPhone(guest.phone || '')} onClick={() => void recordDelivery(guest, 'opened', waLink(guest))} className="flex-1 rounded-lg bg-[#25D366] py-1.5 text-center text-[10px] text-white font-outfit">Abrir WhatsApp</button></div><p className="text-[9px] text-emerald-800">Abrir no confirma envío ni entrega. Requiere un teléfono válido. El seguimiento se registra aquí; los recordatorios se preparan desde el panel del anfitrión.</p></div>}
          {guest.message && <p className="text-[11px] italic text-gray-400 font-cormorant">“{guest.message}”</p>}
        </div>)}
        {!visible.length && <p className="py-4 text-center text-sm text-gray-400 font-outfit">Ningún invitado coincide con el filtro.</p>}
      </div>}
    </div>
  );
}
