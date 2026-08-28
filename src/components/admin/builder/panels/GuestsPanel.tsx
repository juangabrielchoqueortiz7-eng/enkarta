'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Guest, GuestEventAccess, GuestMetadata, InvitationParsed } from '@/lib/types';
import { guessGuestColumn, mapGuestCsvRows, normalizeGuestPhone, parseGuestCsv, type GuestImportField, type GuestImportRow, type ParsedGuestCsv } from '@/lib/guest-import';

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
const IMPORT_FIELDS: { value: GuestImportField; label: string }[] = [
  { value: 'ignore', label: 'Ignorar columna' }, { value: 'name', label: 'Nombre' }, { value: 'phone', label: 'Teléfono' },
  { value: 'passes', label: 'Pases' }, { value: 'tableNo', label: 'Mesa' }, { value: 'group', label: 'Grupo' },
  { value: 'allowKids', label: 'Permite niños' }, { value: 'eventAccess', label: 'Acceso al evento' },
];
type StatusFilter = 'all' | Guest['status'] | 'sent' | 'unsent';

export default function GuestsPanel({ data, onChange, onPreview, previewGuestId }: Props) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [bulk, setBulk] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [csv, setCsv] = useState<ParsedGuestCsv | null>(null);
  const [mapping, setMapping] = useState<Record<number, GuestImportField>>({});
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [messageGuestId, setMessageGuestId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const metaRef = useRef<Record<string, GuestMetadata>>(data.config?.guestMeta ?? {});

  const base = typeof window !== 'undefined' ? window.location.origin : 'https://enkarta.com';
  const linkFor = (publicId: string) => `${base}/i/${data.slug}?g=${publicId}`;
  const enrich = useCallback((guest: Guest): Guest => ({ ...guest, ...(metaRef.current[guest.publicId] ?? {}) }), []);

  useEffect(() => {
    metaRef.current = data.config?.guestMeta ?? {};
    setGuests(current => current.map(enrich));
  }, [data.config?.guestMeta, enrich]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/guests?id=${data.id}`)
      .then(response => response.json())
      .then(value => setGuests(Array.isArray(value) ? value.map(enrich) : []))
      .catch(() => setGuests([]))
      .finally(() => setLoading(false));
  }, [data.id, enrich]);
  useEffect(() => { load(); }, [load]);

  const writeMetadata = (publicId: string, patch: Partial<GuestMetadata>) => {
    const nextItem = { ...(metaRef.current[publicId] ?? {}), ...patch };
    const next = { ...metaRef.current, [publicId]: nextItem };
    metaRef.current = next;
    onChange?.({ config: { ...(data.config ?? {}), guestMeta: next } });
  };

  const patchGuest = (id: string, patch: Partial<Guest>) => {
    const current = guests.find(guest => guest.id === id);
    if (!current) return;
    const updated = { ...current, ...patch };
    setGuests(items => items.map(guest => guest.id === id ? updated : guest));
    if (previewGuestId === id) onPreview?.(updated);

    const metadata: Partial<GuestMetadata> = {};
    if (patch.phone !== undefined) metadata.phone = patch.phone;
    if (patch.group !== undefined) metadata.group = patch.group;
    if (patch.eventAccess !== undefined) metadata.eventAccess = patch.eventAccess;
    if (Object.keys(metadata).length) writeMetadata(current.publicId, metadata);

    const apiPatch: Partial<Guest> = { ...patch };
    delete apiPatch.phone; delete apiPatch.group; delete apiPatch.eventAccess;
    if (Object.keys(apiPatch).length) fetch('/api/guests', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...apiPatch }),
    }).then(async response => {
      if (!response.ok) { const result = await response.json(); setNotice(result.error || 'No se guardaron los cambios.'); load(); }
    }).catch(() => { setNotice('No se pudo comprobar el cambio. Actualiza antes de continuar.'); load(); });
  };

  const removeGuest = async (guest: Guest) => {
    try {
      const response = await fetch(`/api/guests?guestId=${guest.id}`, { method: 'DELETE' });
      if (!response.ok) { const result = await response.json(); setNotice(result.error || 'No se pudo eliminar.'); return; }
    } catch { setNotice('Sin conexión. No se pudo comprobar la eliminación.'); load(); return; }
    setGuests(items => items.filter(item => item.id !== guest.id));
    if (previewGuestId === guest.id) onPreview?.(null);
    const next = { ...metaRef.current }; delete next[guest.publicId]; metaRef.current = next;
    onChange?.({ config: { ...(data.config ?? {}), guestMeta: next } });
  };

  const addGuests = async (rows: GuestImportRow[]) => {
    const response = await fetch('/api/guests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId: data.id, guests: rows.map(({ name, passes, tableNo, allowKids }) => ({ name, passes, tableNo, allowKids })) }),
    }).then(item => item.json()).catch(() => null);
    if (!Array.isArray(response?.guests)) { setNotice(response?.error || 'No se pudo completar la importación.'); return 0; }

    const created: Guest[] = response.guests.map((guest: Guest, index: number) => {
      const source = rows[index];
      return { ...guest, phone: source?.phone, group: source?.group, eventAccess: source?.eventAccess ?? 'both' };
    });
    const nextMeta = { ...metaRef.current };
    created.forEach(guest => { nextMeta[guest.publicId] = { phone: guest.phone, group: guest.group, eventAccess: guest.eventAccess }; });
    metaRef.current = nextMeta;
    onChange?.({ config: { ...(data.config ?? {}), guestMeta: nextMeta } });
    setGuests(items => [...items, ...created]);
    return created.length;
  };

  const importBulk = async () => {
    const rows: GuestImportRow[] = bulk.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const match = line.match(/^(.*?)[\s,]+(\d{1,2})\s*$/);
      return { name: (match ? match[1] : line).trim().slice(0, 80), passes: match ? Math.max(1, Math.min(20, parseInt(match[2]))) : 1, allowKids: true, eventAccess: 'both' as const };
    }).filter(row => row.name);
    const count = rows.length ? await addGuests(rows) : 0;
    setNotice(count ? `${count} invitados añadidos.` : 'No encontramos invitados válidos.');
    if (count) setBulk('');
  };

  const readCsv = async (file?: File) => {
    if (!file) return;
    const parsed = parseGuestCsv(await file.text());
    setCsv(parsed);
    setMapping(Object.fromEntries(parsed.headers.map((header, index) => [index, guessGuestColumn(header)])));
    setNotice('');
  };
  const mappedCsv = useMemo(() => csv ? mapGuestCsvRows(csv, mapping, guests) : null, [csv, mapping, guests]);
  const importCsv = async () => {
    if (!mappedCsv?.rows.length) return;
    const count = await addGuests(mappedCsv.rows);
    setNotice(`${count} añadidos · ${mappedCsv.duplicates} duplicados omitidos · ${mappedCsv.invalid} filas inválidas.`);
    if (count) { setCsv(null); setMapping({}); }
  };

  const copy = (value: string, key: string) => navigator.clipboard?.writeText(value).then(() => {
    setCopied(key); setTimeout(() => setCopied(null), 1500);
  }).catch(() => {});

  const whatsappText = (guest: Guest) => {
    const template = (data.config?.whatsappTemplate as string | undefined)?.trim() || '¡Hola {nombre}! 💌 Estás invitado(a). Aquí tienes tu invitación personal: {link}';
    return template
      .replaceAll('{nombre}', guest.name).replaceAll('{link}', linkFor(guest.publicId))
      .replaceAll('{pases}', String(guest.passes)).replaceAll('{mesa}', guest.tableNo || 'por asignar')
      .replaceAll('{codigo}', guest.accessCode || 'se generará al confirmar');
  };
  const waLink = (guest: Guest) => {
    const digits = normalizeGuestPhone(guest.phone || '').replace(/\D/g, '');
    return `https://wa.me/${digits}?text=${encodeURIComponent(whatsappText(guest))}`;
  };

  const exportCsv = () => {
    const cell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = ['Nombre', 'Teléfono', 'Grupo', 'Acceso', 'Mesa', 'Pases', 'Estado', 'Pases confirmados', 'Enviada', 'Enlace personal'];
    const rows = guests.map(guest => [guest.name, guest.phone ?? '', guest.group ?? '', EVENT_LABEL[guest.eventAccess ?? 'both'], guest.tableNo ?? '', guest.passes, STATUS_META[guest.status].label, guest.confirmedPasses ?? '', guest.sent ? 'Sí' : 'No', linkFor(guest.publicId)]);
    const url = URL.createObjectURL(new Blob(['\uFEFF' + [header, ...rows].map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${data.slug}-invitados.csv`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const stats = useMemo(() => {
    const confirmed = guests.filter(guest => guest.status === 'confirmed');
    return {
      total: guests.length, sent: guests.filter(guest => guest.sent).length, confirmed: confirmed.length,
      pending: guests.filter(guest => guest.status === 'pending').length, declined: guests.filter(guest => guest.status === 'declined').length,
      seats: confirmed.reduce((sum, guest) => sum + (guest.confirmedPasses ?? guest.passes), 0), capacity: guests.reduce((sum, guest) => sum + guest.passes, 0),
    };
  }, [guests]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return guests.filter(guest => {
      if (query && ![guest.name, guest.tableNo, guest.phone, guest.group].some(value => value?.toLowerCase().includes(query))) return false;
      if (filter === 'sent') return guest.sent;
      if (filter === 'unsent') return !guest.sent;
      return filter === 'all' || guest.status === filter;
    });
  }, [guests, search, filter]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div><h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 font-outfit">Invitados personalizados</h4><p className="mt-0.5 text-[10px] text-gray-400 font-outfit">Segmenta, simula y envía cada invitación.</p></div>
        <div className="flex gap-2"><button type="button" onClick={exportCsv} disabled={!guests.length} className="text-xs text-gray-500 disabled:opacity-30 font-outfit">↓ CSV</button><button type="button" onClick={load} className="text-xs text-enkarta-gold font-outfit">{loading ? 'Actualizando…' : '↻ Actualizar'}</button></div>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {[[stats.total, 'Total', '#5a4e34'], [stats.sent, 'Enviadas', '#3d6b78'], [stats.confirmed, 'Sí', '#357054'], [stats.pending, 'Pend.', '#9a762f'], [stats.declined, 'No', '#9a4f59']].map(([number, label, color]) => <div key={String(label)} className="rounded-xl border border-gray-100 bg-white py-2 text-center"><p className="font-playfair text-lg font-bold" style={{ color: String(color) }}>{number}</p><p className="text-[8px] uppercase tracking-wide text-gray-400 font-outfit">{label}</p></div>)}
      </div>
      <div className="rounded-2xl border border-enkarta-gold/20 bg-gradient-to-r from-enkarta-gold/5 to-white p-3 text-center"><p className="font-playfair text-2xl font-bold text-enkarta-gold">{stats.seats}<span className="text-base text-gray-300"> / {stats.capacity}</span></p><p className="text-[9px] uppercase tracking-wider text-gray-400 font-outfit">Cupos confirmados</p></div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => addGuests([{ name: 'Nuevo invitado', passes: 1, allowKids: true, eventAccess: 'both' }])} className="rounded-xl bg-enkarta-gold py-2.5 text-sm font-medium text-white font-outfit">+ Invitado</button>
        <button type="button" onClick={() => setShowImport(value => !value)} className="rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 font-outfit">Importar lista</button>
      </div>

      {showImport && <div className="space-y-3 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-3">
        <div><p className="text-xs font-semibold text-cyan-900 font-outfit">Importación inteligente CSV</p><p className="text-[10px] text-cyan-700/70 font-outfit">Reconoce coma, punto y coma o tabulaciones; después puedes corregir cada columna.</p></div>
        <label className="block cursor-pointer rounded-xl border border-dashed border-cyan-200 bg-white px-3 py-3 text-center text-xs text-cyan-700 font-outfit">Seleccionar archivo .CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={event => readCsv(event.target.files?.[0])} /></label>
        {csv && <div className="space-y-2 rounded-xl border border-cyan-100 bg-white p-2.5">
          {csv.headers.map((header, index) => <div key={`${header}-${index}`} className="grid grid-cols-[1fr_1.2fr] items-center gap-2"><span className="truncate text-[10px] font-medium text-gray-500 font-outfit">{header}</span><select className="rounded-lg border border-gray-200 px-2 py-1.5 text-[10px] font-outfit" value={mapping[index] ?? 'ignore'} onChange={event => setMapping(current => ({ ...current, [index]: event.target.value as GuestImportField }))}>{IMPORT_FIELDS.map(field => <option key={field.value} value={field.value}>{field.label}</option>)}</select></div>)}
          <p className="rounded-lg bg-gray-50 p-2 text-[10px] text-gray-500 font-outfit"><b>{mappedCsv?.rows.length ?? 0}</b> listos · {mappedCsv?.duplicates ?? 0} duplicados · {mappedCsv?.invalid ?? 0} inválidos</p>
          <button type="button" disabled={!mappedCsv?.rows.length} onClick={importCsv} className="w-full rounded-lg bg-cyan-700 py-2 text-xs font-medium text-white disabled:opacity-40 font-outfit">Importar invitados válidos</button>
        </div>}
        <details><summary className="cursor-pointer text-[10px] text-gray-500 font-outfit">Pegar una lista rápida</summary><div className="mt-2 space-y-2"><textarea value={bulk} onChange={event => setBulk(event.target.value)} rows={4} placeholder={'Ana López, 2\nCarlos Pérez, 1'} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none font-outfit"/><button type="button" onClick={importBulk} className="w-full rounded-lg bg-gray-800 py-2 text-xs text-white font-outfit">Añadir lista pegada</button></div></details>
        {notice && <p className="rounded-lg bg-white px-2.5 py-2 text-[10px] text-cyan-800 font-outfit">{notice}</p>}
      </div>}

      {!!guests.length && <div className="space-y-2"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar nombre, teléfono, grupo o mesa…" className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-enkarta-gold font-outfit"/><div className="flex flex-wrap gap-1">{([['all', 'Todos'], ['confirmed', 'Confirmados'], ['pending', 'Pendientes'], ['declined', 'No asisten'], ['sent', 'Enviadas'], ['unsent', 'Sin enviar']] as [StatusFilter, string][]).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-full px-2.5 py-1 text-[10px] font-outfit ${filter === value ? 'bg-enkarta-gold text-white' : 'bg-gray-100 text-gray-500'}`}>{label}</button>)}</div></div>}

      {!guests.length ? <div className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-400 font-outfit">Añade invitados para crear enlaces, contenido y pases personales.</div> : <div className="space-y-2">
        {visible.map(guest => <div key={guest.id} className={`space-y-2.5 rounded-2xl border bg-white p-3 transition-all ${previewGuestId === guest.id ? 'border-cyan-300 shadow-[0_8px_25px_rgba(8,145,178,.10)]' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2"><input value={guest.name} onChange={event => patchGuest(guest.id, { name: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:border-enkarta-gold font-outfit"/><button type="button" onClick={() => removeGuest(guest)} title="Eliminar" className="px-1.5 text-gray-300 hover:text-red-500">×</button></div>
          <div className="grid grid-cols-2 gap-2"><input value={guest.phone ?? ''} onChange={event => patchGuest(guest.id, { phone: event.target.value })} onBlur={event => patchGuest(guest.id, { phone: normalizeGuestPhone(event.target.value) })} placeholder="WhatsApp +591…" className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none font-outfit"/><input value={guest.group ?? ''} onChange={event => patchGuest(guest.id, { group: event.target.value })} placeholder="Grupo: Familia, VIP…" className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none font-outfit"/></div>
          <div className="grid grid-cols-[72px_72px_1fr] gap-2"><label className="text-[9px] text-gray-400 font-outfit">Mesa<input value={guest.tableNo ?? ''} onChange={event => patchGuest(guest.id, { tableNo: event.target.value })} className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1 text-center text-xs outline-none"/></label><label className="text-[9px] text-gray-400 font-outfit">Pases<input type="number" min={1} max={20} value={guest.passes} onChange={event => patchGuest(guest.id, { passes: Math.max(1, Math.min(20, parseInt(event.target.value) || 1)) })} className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1 text-center text-xs outline-none"/></label><label className="text-[9px] text-gray-400 font-outfit">Acceso<select value={guest.eventAccess ?? 'both'} onChange={event => patchGuest(guest.id, { eventAccess: event.target.value as GuestEventAccess })} className="mt-0.5 w-full rounded-lg border border-gray-200 px-1.5 py-1 text-[10px] outline-none"><option value="both">Todo</option><option value="ceremony">Ceremonia</option><option value="reception">Recepción</option></select></label></div>
          <div className="flex items-center gap-1.5"><button type="button" onClick={() => patchGuest(guest.id, { allowKids: !guest.allowKids })} className={`rounded-lg px-2 py-1 text-[10px] font-outfit ${guest.allowKids ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{guest.allowKids ? 'Niños permitidos' : 'Solo adultos'}</button><span className={`rounded-full px-2 py-1 text-[10px] font-outfit ${STATUS_META[guest.status].cls}`}>{STATUS_META[guest.status].label}</span>{guest.accessCode && <span className="text-[9px] text-gray-400 font-mono">{guest.accessCode}</span>}</div>
          <div className="grid grid-cols-4 gap-1.5"><button type="button" onClick={() => onPreview?.(previewGuestId === guest.id ? null : guest)} className={`rounded-lg border py-1.5 text-[10px] font-outfit ${previewGuestId === guest.id ? 'border-cyan-300 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-500'}`}>{previewGuestId === guest.id ? '◎ Viendo' : 'Vista'}</button><button type="button" onClick={() => patchGuest(guest.id, { sent: !guest.sent })} className={`rounded-lg border py-1.5 text-[10px] font-outfit ${guest.sent ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}>{guest.sent ? '✓ Enviada' : 'Enviar'}</button><button type="button" onClick={() => copy(linkFor(guest.publicId), guest.publicId)} className="rounded-lg border border-gray-200 py-1.5 text-[10px] text-gray-500 font-outfit">{copied === guest.publicId ? '✓ Copiado' : 'Copiar link'}</button><button type="button" onClick={() => setMessageGuestId(value => value === guest.id ? null : guest.id)} className="rounded-lg bg-[#25D366] py-1.5 text-[10px] text-white font-outfit">WhatsApp</button></div>
          {messageGuestId === guest.id && <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5"><p className="whitespace-pre-wrap text-[11px] leading-relaxed text-gray-600 font-outfit">{whatsappText(guest)}</p><div className="flex gap-2"><button type="button" onClick={() => copy(whatsappText(guest), `message-${guest.id}`)} className="flex-1 rounded-lg border border-emerald-200 bg-white py-1.5 text-[10px] text-emerald-700 font-outfit">{copied === `message-${guest.id}` ? '✓ Copiado' : 'Copiar mensaje'}</button><a href={waLink(guest)} target="_blank" rel="noopener noreferrer" onClick={() => !guest.sent && patchGuest(guest.id, { sent: true })} className="flex-1 rounded-lg bg-[#25D366] py-1.5 text-center text-[10px] text-white font-outfit">Abrir WhatsApp</a></div></div>}
          {guest.message && <p className="text-[11px] italic text-gray-400 font-cormorant">“{guest.message}”</p>}
        </div>)}
        {!visible.length && <p className="py-4 text-center text-sm text-gray-400 font-outfit">Ningún invitado coincide con el filtro.</p>}
      </div>}
    </div>
  );
}
