'use client';

import { useEffect, useRef, useState } from 'react';
import type { Guest } from '@/lib/types';
import type { HostGuest } from '@/lib/host-dashboard';
import { deliveryState, DELIVERY_LABELS } from '@/lib/guest-delivery';
import { prepareWhatsAppMessage, whatsAppMessageUrl, messageChoiceKey } from '@/lib/whatsapp-message';
import WhatsAppMessagePreview from './WhatsAppMessagePreview';
import { normalizeGuestPhone } from '@/lib/guest-import';
import type { useWhatsAppReview } from './WhatsAppReview';
import DeliveryRecovery, { type useDeliveryTracking } from './DeliveryRecovery';
import styles from '../operations/Operations.module.css';

export default function WhatsAppQueue({ controller, guests, slug, template, connected, tracker, close, demo = false, loading = false }: {
  controller: ReturnType<typeof useWhatsAppReview>; guests: HostGuest[]; slug: string; template?: string;
  connected: boolean; tracker: ReturnType<typeof useDeliveryTracking>; close: () => void; demo?: boolean; loading?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = tracker.busy;
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copiedText, setCopiedText] = useState('');
  const [defaultChoice, setDefaultChoice] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, Guest>>({});
  useEffect(() => { dialog.current?.showModal(); }, []);
  const review = controller.review;
  if (!review) return null;
  const { ids, purpose, position, prepared } = review;
  const latest = guests.find(item => item.id === ids[position]);
  const local = saved[ids[position]];
  const guest = latest && local && (local.responseRevision ?? 0) > (latest.responseRevision ?? 0) ? local : latest;
  const canPrepare = guest?.status === 'pending' && !prepared.includes(guest.id) && (purpose === 'reminder' || deliveryState(guest) === 'pending');
  const phone = normalizeGuestPhone(guest?.phone || '').replace(/\D/g, '');
  const link = guest && typeof window !== 'undefined' ? `${window.location.origin}/i/${slug}?g=${encodeURIComponent(guest.publicId)}` : '';
  const choice = guest ? messageChoiceKey(guest, purpose, template) : '';
  const usingDefault = defaultChoice === choice;
  const message = guest ? prepareWhatsAppMessage(usingDefault ? undefined : template, guest, link, purpose) : null;
  const text = message?.text ?? '';
  const act = async (action: 'prepare' | 'manual') => {
    if (tracker.blocked || controller.blocked || !connected || loading || !guest) return;
    if (demo) { setNotice('Vista de prueba: puedes revisar el mensaje; no se abre WhatsApp ni se registra seguimiento.'); return; }
    const url = message ? whatsAppMessageUrl(message, phone) : null;
    if (action === 'prepare' && (!canPrepare || !url)) return;
    if (action === 'manual' && (guest.status !== 'pending' || deliveryState(guest) === 'marked')) return;
    if (action === 'prepare' && !controller.prepare(guest.id)) return;
    const result = await tracker.start(guest, action === 'manual' ? 'manual' : purpose === 'reminder' ? 'reminder' : 'opened',
      action === 'prepare' ? url! : undefined);
    if (!result) return;
    setSaved(current => ({ ...current, [result.id]: result }));
    setNotice(action === 'manual' ? 'Marca manual guardada. Puedes continuar al siguiente.' : 'Apertura solicitada y seguimiento guardado. El envío se completa dentro de WhatsApp.');
  };
  const next = () => { if (!connected || loading || tracker.blocked || controller.blocked || !controller.advance()) return; setError(''); setNotice(''); setCopiedText(''); };
  const requestClose = () => {
    if (busy) return;
    close();
  };
  return <dialog ref={dialog} aria-label="Cola de WhatsApp" onCancel={event => { event.preventDefault(); requestClose(); }} className={`${styles.surface} m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto overscroll-contain rounded-3xl border bg-white p-5 font-outfit shadow-2xl backdrop:bg-gray-900/40`}>
    <div className="flex items-start justify-between gap-3"><h3 className="text-xl font-semibold text-gray-900">{purpose === 'reminder' ? 'Preparar recordatorios' : 'Preparar invitaciones'}</h3><button type="button" aria-label="Cerrar cola" disabled={busy} onClick={requestClose} className="h-11 w-11 shrink-0 rounded-full border text-xl hover:bg-gray-50 disabled:opacity-40">×</button></div>
    <p className="mt-2 text-xs leading-relaxed text-gray-600">Un contacto por vez, con revisión previa. Cada apertura requiere un clic; revisa y envía el mensaje dentro de WhatsApp.</p>
    <div className="my-4 border-y border-gray-200 py-3"><p role="status" aria-atomic="true" className="text-sm tabular-nums text-gray-700">{Math.min(position, ids.length)} de {ids.length} contactos revisados</p><progress aria-label="Contactos revisados" value={Math.min(position, ids.length)} max={Math.max(1, ids.length)} className="mt-2 block h-2 w-full accent-emerald-700" /></div>
    {controller.error && <p role="alert" className="my-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{controller.error}</p>}
    {!controller.persisted && <p role="alert" className="my-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">No se pudo guardar el progreso. Mantén esta pantalla abierta; una recarga puede recuperar una posición anterior.</p>}
    {position >= ids.length ? <div role="status" className="my-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">Revisión terminada. Los registros omitidos no se marcaron como enviados.<button type="button" disabled={tracker.blocked || controller.blocked} onClick={() => { if (controller.clear()) close(); }} className="mt-3 block min-h-11 underline disabled:opacity-50">Finalizar revisión y volver a invitados</button></div> : <>
      <p className="my-4 text-xs text-gray-500">Registro {position + 1} de {ids.length} · lista elegida al iniciar</p>
      {loading ? <p role="status" className="my-4">Consultando los datos actuales del contacto…</p> : guest && message ? <div className="space-y-3"><h4 className="break-words text-lg font-semibold text-gray-900">{guest.name}</h4><p className="text-sm text-gray-600">{guest.phone || 'Sin teléfono'} · {guest.passes} {guest.passes === 1 ? 'pase' : 'pases'}</p><p className="text-sm font-medium text-gray-700">{DELIVERY_LABELS[deliveryState(guest)]}</p><WhatsAppMessagePreview message={message} usingDefault={usingDefault} useDefault={() => setDefaultChoice(choice)} /><button type="button" disabled={!message.ready} onClick={async () => { if (!message.ready) return; try { await navigator.clipboard.writeText(text); setCopiedText(text); } catch { setError('No se pudo copiar el mensaje. Puedes seleccionarlo en la vista previa.'); } }} className="min-h-11 text-sm text-emerald-800 underline underline-offset-4 disabled:opacity-40">{copiedText === text ? 'Mensaje copiado' : 'Copiar mensaje'}</button>{guest.status !== 'pending' && <p role="status" className="text-sm text-amber-900">Este invitado ya respondió. Omítelo para continuar.</p>}{guest.status === 'pending' && !phone && <p className="text-sm text-amber-900">No tiene un teléfono válido. Puedes omitirlo y corregir el contacto en su ficha.</p>}</div> : <p role="status" className="my-4">Este invitado ya no está disponible. Omítelo para continuar.</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <DeliveryRecovery tracker={tracker} disabled={!connected || demo} />
      {guest && prepared.includes(guest.id) && <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950">Ya se solicitó preparar este contacto en esta revisión. No se abrirá WhatsApp otra vez desde aquí. Puedes copiar el mensaje o continuar; esto no acredita envío.</p>}
      {notice && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
      {!connected && !loading && <p role="alert" className="mt-3 text-sm text-amber-900">Espera a recuperar la conexión antes de registrar el seguimiento.</p>}
      <div className="mt-4 flex flex-col gap-2">
        <button type="button" disabled={tracker.blocked || controller.blocked || !connected || loading || !canPrepare || !phone || !message?.ready} onClick={() => void act('prepare')} className="min-h-11 rounded-xl bg-emerald-700 px-3 text-sm text-white disabled:opacity-40">{busy ? 'Guardando seguimiento…' : 'Abrir WhatsApp con este mensaje'}</button>
        <button type="button" disabled={tracker.blocked || controller.blocked || !connected || loading || !guest || guest.status !== 'pending' || deliveryState(guest) === 'marked'} onClick={() => void act('manual')} className="min-h-11 rounded-xl border px-3 text-sm disabled:opacity-40">Ya lo envié: marcar manualmente</button>
        <button type="button" disabled={tracker.blocked || controller.blocked || !connected || loading} onClick={next} className="min-h-11 rounded-xl border px-3 text-sm hover:bg-gray-50 disabled:opacity-40">{guest && (prepared.includes(guest.id) || deliveryState(guest) === 'marked') ? 'Continuar al siguiente contacto' : 'Omitir y continuar'}</button>
      </div>
    </>}
    <p className="mt-4 text-xs leading-relaxed text-gray-600">La apertura y la marca manual no acreditan entrega ni lectura. Cerrar pausa esta revisión; puedes continuar desde la lista de invitados. Los reintentos de seguimiento se comprueban por separado.</p>
  </dialog>;
}
