'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Guest, InvitationParsed } from '@/lib/types';
import { allowsService } from '@/lib/packages';
import { defaultRosterQuery, rosterListingKey, rosterParams, rosterRequestUrl } from '@/lib/roster-query';
import { parseManagedGuestPreview } from '@/lib/managed-guest-preview';
import { useHostSnapshot } from '@/components/admin/host/useHostSnapshot';
import HostRoster from '@/components/admin/host/HostRoster';
import SyncStatus from '@/components/admin/host/SyncStatus';

interface Props {
  data: InvitationParsed; onChange?: (patch: Partial<InvitationParsed>) => void;
  onPreview?: (guest: Guest | null) => void; previewGuestId?: string;
}
export default function GuestsPanel(props: Props) {
  if (!allowsService(props.data.config, 'guestManagement')) return <p className="m-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 font-outfit">Este paquete no incluye invitados personalizados. Puedes registrar el servicio como adicional en Configuración.</p>;
  return <ManagedGuestsPanel key={props.data.id} {...props} />;
}

/** Shared operational controls; demo endpoints are supplied only by development routes. */
export function ManagedGuestsPanel({ data, onChange, onPreview, previewGuestId, endpoint = '/api/guests/roster', demo = false }: Props & { endpoint?: string; demo?: boolean }) {
  const [query, change] = useState(defaultRosterQuery);
  const params = rosterParams(query); params.set('id', data.id);
  const readEndpoint = rosterRequestUrl(endpoint, params);
  const { snapshot, state, queryCurrent, receivedEndpoint, refresh } = useHostSnapshot(null, readEndpoint);
  const connected = queryCurrent && (state === 'current' || state === 'loading');
  const [previewBusy, setPreviewBusy] = useState(false), [previewError, setPreviewError] = useState('');
  const previewRequest = useRef<AbortController | null>(null), previewVersion = useRef('');
  const previewCallback = useRef(onPreview), mounted = useRef(true);
  previewCallback.current = onPreview;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; previewRequest.current?.abort(); }; }, []);
  const readPreview = useCallback(async (id: string | null, force = false) => {
    const key = `${id}:${snapshot?.syncedAt ?? ''}`;
    if (!force && previewVersion.current === key) return;
    previewRequest.current?.abort();
    if (!id) { previewVersion.current = ''; setPreviewBusy(false); setPreviewError(''); previewCallback.current?.(null); return; }
    if (!snapshot || state === 'denied') return;
    const controller = new AbortController(); previewRequest.current = controller; previewVersion.current = key;
    const timeout = setTimeout(() => controller.abort('timeout'), 12000);
    setPreviewBusy(true); setPreviewError('');
    try {
      const response = await fetch(rosterRequestUrl(endpoint, new URLSearchParams({ id: data.id, format: 'preview', guestId: id })), { cache: 'no-store', signal: controller.signal });
      const value = await response.json();
      if (controller.signal.aborted || !mounted.current) return;
      if (!response.ok) {
        if ([401,403,404].includes(response.status)) previewCallback.current?.(null);
        throw new Error(value.error || 'No se pudo cargar la vista personal.');
      }
      const guest = parseManagedGuestPreview(value, id);
      if (!controller.signal.aborted && mounted.current) previewCallback.current?.(guest);
    } catch (error) {
      if (mounted.current && (!controller.signal.aborted || controller.signal.reason === 'timeout')) { previewVersion.current = ''; setPreviewError(error instanceof Error && error.name !== 'AbortError' ? error.message : 'La vista personal tardó demasiado. Vuelve a solicitarla.'); }
    } finally { clearTimeout(timeout); if (previewRequest.current === controller && mounted.current) setPreviewBusy(false); }
  }, [data.id, endpoint, snapshot, state]);
  useEffect(() => { if (previewGuestId && snapshot && state !== 'denied') void readPreview(previewGuestId); }, [previewGuestId, snapshot, state, readPreview]);
  useEffect(() => {
    if (state === 'denied') { previewRequest.current?.abort(); previewVersion.current = ''; previewCallback.current?.(null); }
  }, [state]);
  return <div className="space-y-4 p-3 font-outfit text-gray-800">
    <h2 className="font-playfair text-xl">Invitados personalizados</h2>
    <p className="text-sm leading-relaxed text-gray-600">Gestiona la lista completa y revisa cada invitación en el lienzo. Los cambios de invitados se guardan directamente; publicar el diseño es una acción separada.</p>
    <SyncStatus state={state} at={snapshot?.syncedAt} refresh={refresh} />
    <details className="rounded-xl border border-gray-200 bg-white p-3"><summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Mensajes personalizados de WhatsApp</summary>
      <div className="mt-3 space-y-4">{(['whatsappTemplate','whatsappReminderTemplate'] as const).map((field,index) => <label key={field} className="block text-sm">{index ? 'Recordatorio' : 'Invitación'}<textarea name={field} rows={3} maxLength={1200} value={data.config[field] ?? ''} onChange={event => onChange?.({ config: { ...data.config, [field]: event.target.value } })} placeholder={index ? 'Hola {nombre}, confirma tu asistencia aquí: {link}…' : '¡Hola {nombre}! Tu invitación personal: {link}…'} className="mt-1 w-full rounded-xl border border-gray-300 p-3 text-base" /></label>)}
      <p className="text-sm leading-relaxed text-gray-600">Variables: {'{nombre}'}, {'{link}'}, {'{pases}'}, {'{mesa}'}, {'{codigo}'}. Las plantillas de mensaje siguen el guardado del diseño. Abrir WhatsApp no acredita envío, entrega ni lectura.</p></div>
    </details>
    {onPreview && <section aria-label="Vista personal del invitado" className="space-y-2 border-y border-gray-200 py-3 text-sm">
      <p role="status">{previewBusy ? 'Consultando la vista personal…' : previewGuestId ? 'Vista personal activa; se actualiza con los datos guardados.' : 'Selecciona Vista en constructor en la ficha de un invitado.'}</p>
      {previewGuestId && <div className="flex flex-wrap gap-2"><button type="button" disabled={previewBusy || !connected} onClick={() => void readPreview(previewGuestId, true)} className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 disabled:opacity-40">Actualizar vista personal</button><button type="button" onClick={() => void readPreview(null, true)} className="min-h-11 rounded-xl border border-gray-300 bg-white px-3">Volver a vista general</button></div>}
      {previewError && <p role="alert" className="text-rose-800">{previewError}</p>}
    </section>}
    {!snapshot ? <p role="status" className="py-5 text-sm text-gray-600">{state === 'denied' ? 'Tu acceso no permite gestionar estos invitados. Vuelve a ingresar con el acceso del organizador.' : state === 'loading' ? 'Preparando el padrón…' : 'No pudimos consultar el padrón. Reintenta con Actualizar ahora; no se muestran cifras parciales.'}</p>
      : <><p className="text-sm tabular-nums">{snapshot.metrics?.total ?? 0} grupos en total · {snapshot.metrics?.confirmedPasses ?? 0} cupos confirmados · {snapshot.metrics?.passes ?? 0} pases asignados</p>
      <HostRoster snapshot={snapshot} invitationId={data.id} slug={data.slug} connected={connected} refresh={refresh} demo={demo} layout="cards"
        roster={{ query, change, pending: rosterListingKey(receivedEndpoint) !== rosterListingKey(readEndpoint), selectionPending: !queryCurrent }}
        endpoints={{ csv: rosterRequestUrl(endpoint, new URLSearchParams({ format: 'csv' })), duplicates: endpoint }}
        whatsappTemplate={data.config.whatsappTemplate || data.whatsapp_template || undefined} reminderTemplate={data.config.whatsappReminderTemplate}
        guestActions={onPreview ? guest => <button type="button" disabled={!connected || previewBusy} aria-pressed={previewGuestId === guest.id} onClick={() => void readPreview(previewGuestId === guest.id ? null : guest.id, true)} className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-xs disabled:opacity-40">{previewGuestId === guest.id ? 'Vista general' : 'Vista en constructor'}</button> : undefined} />
      </>}
  </div>;
}
