'use client';
import { useEffect, useRef, useState } from 'react';
import { findReceptionGuests, type ReceptionMatch, type ReceptionSearchField } from '@/lib/reception-search';
import styles from '../operations/Operations.module.css';

interface ReceptionSearchProps {
  invitationId: string; sessionKey: string; scope: 'host' | 'door'; disabled: boolean; beforeSearch: () => Promise<void>;
  selectGuest: (id: string) => void; busyChanged: (busy: boolean) => void; transport?: typeof fetch; tables?: boolean;
}
export default function ReceptionSearch(props: ReceptionSearchProps) {
  return <ReceptionSearchSurface key={`${props.invitationId}:${props.scope}:${props.sessionKey}`} {...props} />;
}
function ReceptionSearchSurface({ invitationId, sessionKey, scope, disabled, beforeSearch, selectGuest, busyChanged, transport, tables = true }: ReceptionSearchProps) {
  const [query, setQuery] = useState(''), [field, setField] = useState<ReceptionSearchField>('name');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [result, setResult] = useState<{ guests: ReceptionMatch[]; hasMore: boolean } | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); request.current = null; }, []);
  const invalidate = () => { request.current?.abort(); request.current = null; setBusy(false); busyChanged(false); setResult(null); setError(''); };
  const search = async () => {
    if (disabled || busy || query.trim().length < (field === 'table' ? 1 : 2)) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort('timeout'), 12000);
    setBusy(true); busyChanged(true); setError(''); setResult(null);
    try {
      await beforeSearch();
      const value = await findReceptionGuests(invitationId, scope, query, field, controller.signal, sessionKey, transport);
      if (request.current === controller && !controller.signal.aborted) setResult(value);
    } catch (failure) {
      if (request.current === controller && (!controller.signal.aborted || controller.signal.reason === 'timeout')) setError(failure instanceof Error && failure.name !== 'AbortError' ? failure.message : 'No pudimos consultar el evento. Comprueba la conexión y vuelve a buscar.');
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) { setBusy(false); busyChanged(false); }
    }
  };
  return <section aria-busy={busy} className={`${styles.surface} space-y-3 rounded-2xl border border-gray-200 bg-white p-4 font-outfit`}>
    <h2 className="text-sm font-medium text-gray-800">¿El invitado no encuentra su QR?</h2>
    <p className="text-xs leading-relaxed text-gray-500">Busca un grupo confirmado dentro de este evento. Abrir su ficha no registra un ingreso; verifica su identidad antes de marcar personas.</p>
    <form onSubmit={event => { event.preventDefault(); void search(); }} className="space-y-2">
      <label className="block text-xs text-gray-600">Buscar por<select aria-label="Buscar en recepción por" value={field} disabled={disabled || busy} onChange={event => { invalidate(); setField(event.target.value as ReceptionSearchField); }} className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"><option value="name">Nombre o familia</option>{tables && <option value="table">Mesa exacta</option>}</select></label>
      <label className="block text-xs text-gray-600">{field === 'name' ? 'Parte del nombre, con sus acentos' : 'Número o nombre exacto de mesa'}<input type="search" name="reception-query" autoComplete="off" aria-label="Buscar grupo confirmado" maxLength={field === 'table' ? 20 : 80} value={query} disabled={disabled} onChange={event => { invalidate(); setQuery(event.target.value); }} placeholder={field === 'name' ? 'Ej. Pérez…' : 'Ej. 7…'} className="mt-1 min-h-11 w-full rounded-xl border border-gray-200 px-3 text-sm" /></label>
      <button type="submit" disabled={disabled || busy || query.trim().length < (field === 'table' ? 1 : 2)} className="min-h-11 w-full rounded-xl bg-gray-800 px-3 text-sm text-white disabled:opacity-40">{busy ? 'Buscando en el evento…' : 'Buscar grupo confirmado'}</button>
    </form>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
    <p role="status" aria-atomic="true" className="text-sm text-gray-600">{busy ? 'Buscando grupos confirmados…' : result ? result.guests.length ? `${result.guests.length} ${result.guests.length === 1 ? 'grupo encontrado' : 'grupos encontrados'}. Verifica el nombre y abre su ficha.` : 'No hay grupos confirmados con ese dato. Prueba otra parte del nombre o su mesa.' : ''}</p>
    {result && <div className="space-y-2">{result.hasMore && <p className="text-sm text-amber-900">Hay más de 20 coincidencias. Afina la búsqueda para localizar al grupo correcto.</p>}{result.guests.map(guest => <button type="button" key={guest.id} disabled={disabled || busy} onClick={() => { invalidate(); selectGuest(guest.id); }} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-gray-200 p-3 text-left hover:border-[#516749] hover:bg-[#f7f5ef] disabled:opacity-40"><span className="min-w-0"><strong className="block break-words text-base font-medium">{guest.name}</strong><span className="text-sm text-gray-600">{guest.passes} {guest.passes === 1 ? 'cupo confirmado' : 'cupos confirmados'}{guest.tableNo ? ` · Mesa ${guest.tableNo}` : ''}</span></span><span className="shrink-0 text-sm font-medium text-[#516749]">Abrir grupo</span></button>)}</div>}
  </section>;
}
