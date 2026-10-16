'use client';
import { useEffect, useId, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import type { HostGuest } from '@/lib/host-dashboard';
import { guestEditDirty, guestEditStale, guestEditValues, validateGuestEdit, type GuestEditCommand, type GuestEditValues } from '@/lib/guest-edit-form';
import { deliveryState, DELIVERY_LABELS, type DeliveryAction } from '@/lib/guest-delivery';
import { prepareWhatsAppMessage, whatsAppMessageUrl, messageChoiceKey, type MessagePurpose } from '@/lib/whatsapp-message';
import WhatsAppMessagePreview from './WhatsAppMessagePreview';
import { normalizeGuestPhone } from '@/lib/guest-import';
import styles from '../operations/Operations.module.css';

const fieldClass = 'min-h-11 min-w-0 rounded-xl border border-[#e4dfd4] bg-white px-3 py-2 text-base text-gray-700 focus:border-[#516749]';
const buttonClass = 'min-h-11 rounded-xl border px-3 text-sm hover:bg-gray-50 disabled:opacity-40';
const fieldNames: Record<keyof GuestEditValues, string> = { name: 'Nombre', phone: 'Teléfono de WhatsApp', group: 'Familia o grupo', eventAccess: 'Preferencia de asistencia', passes: 'Pases asignados', tableNo: 'Mesa', allowKids: 'Permitir niños' };
interface Props {
  original: HostGuest; latest?: HostGuest; tables: boolean; connected: boolean;
  save: (command: GuestEditCommand) => Promise<void>; remove: (revision: number) => Promise<void>; close: () => void;
  slug: string; whatsappTemplate?: string; reminderTemplate?: string;
  recordDelivery: (guest: HostGuest, action: DeliveryAction, url: string) => Promise<void>;
  deliveryBusy: boolean; children?: ReactNode; loading?: boolean;
}
type Confirmation = 'close' | 'reload' | 'remove';

export default function GuestEditor({ original, latest, tables, connected, save, remove, close, slug, whatsappTemplate, reminderTemplate, recordDelivery, deliveryBusy, children, loading = false }: Props) {
  const dialog = useRef<HTMLDialogElement>(null), form = useRef<HTMLFormElement>(null), confirmation = useRef<HTMLElement>(null);
  const busyRef = useRef(false), mounted = useRef(true), returnFocus = useRef<HTMLElement | null>(null);
  const confirmationTrigger = useRef<HTMLElement | null>(null), wasConfirming = useRef(false);
  const id = useId();
  const [base, setBase] = useState(original), [draft, setDraft] = useState(() => guestEditValues(original));
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [copied, setCopied] = useState(false);
  const [intent, setIntent] = useState<Confirmation | null>(null), [acknowledged, setAcknowledged] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof GuestEditValues, boolean>>>({}), [submitted, setSubmitted] = useState(false);
  const [selectedPurpose, setSelectedPurpose] = useState<MessagePurpose>('invitation'), [defaultChoice, setDefaultChoice] = useState<string | null>(null);
  const dirty = guestEditDirty(base, draft, tables), stale = guestEditStale(base, latest);
  const validation = validateGuestEdit(base, draft, tables), current = latest ?? base;
  const locked = busy || !!intent, trackingBlocked = locked || deliveryBusy || !connected || stale || dirty || loading;
  const link = typeof window !== 'undefined' ? `${window.location.origin}/i/${slug}?g=${encodeURIComponent(current.publicId)}` : '';
  const phone = normalizeGuestPhone(current.phone || '').replace(/\D/g, '');
  const purpose = current.status === 'pending' ? selectedPurpose : 'invitation';
  const template = purpose === 'reminder' ? reminderTemplate : whatsappTemplate;
  const choice = messageChoiceKey(current, purpose, template), usingDefault = defaultChoice === choice;
  const message = prepareWhatsAppMessage(usingDefault ? undefined : template, current, link, purpose);
  useEffect(() => { mounted.current = true;
    if (document.activeElement instanceof HTMLElement && !dialog.current?.contains(document.activeElement)) returnFocus.current = document.activeElement;
    dialog.current?.showModal();
    return () => { mounted.current = false; if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    if (intent) confirmation.current?.focus();
    else if (wasConfirming.current && confirmationTrigger.current?.isConnected) confirmationTrigger.current.focus();
    wasConfirming.current = !!intent;
  }, [intent]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);
  const ask = (next: Confirmation) => { confirmationTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setAcknowledged(false); setIntent(next); setError(''); };
  const cancelConfirmation = () => { setIntent(null); setAcknowledged(false); };
  const requestClose = () => { if (busyRef.current) return; if (intent) cancelConfirmation(); else if (dirty) ask('close'); else close(); };
  const reload = () => { if (!latest || busyRef.current) return; setBase(latest); setDraft(guestEditValues(latest)); setTouched({}); setSubmitted(false); cancelConfirmation(); setError(''); };
  const change = <K extends keyof GuestEditValues>(key: K, value: GuestEditValues[K]) => setDraft(previous => ({ ...previous, [key]: value }));
  const attributes = (key: keyof GuestEditValues) => ({ id: `${id}-${key}`, name: `guest-${key}`, 'aria-label': fieldNames[key], 'aria-invalid': !!validation.errors[key] && (submitted || !!touched[key]),
    'aria-describedby': validation.errors[key] && (submitted || touched[key]) ? `${id}-${key}-error` : undefined,
    // Do not move a button under the pointer between pointerdown and click.
    // Submission validates all fields and focuses the first error itself.
    onBlur: (event: FocusEvent<HTMLElement>) => { if (!(event.relatedTarget instanceof HTMLButtonElement)) setTouched(previous => ({ ...previous, [key]: true })); } });
  const fieldError = (key: keyof GuestEditValues) => (submitted || touched[key]) && validation.errors[key]
    ? <span id={`${id}-${key}-error`} className="mt-1 block text-sm text-rose-800">{validation.errors[key]}</span> : null;
  const submit = async () => {
    if (busyRef.current || deliveryBusy || stale || !connected || intent || !dirty) return;
    setSubmitted(true); setError('');
    if (!validation.command) { const first = Object.keys(validation.errors)[0]; if (!first) setError('No pudimos verificar la revisión de este registro. Actualiza la lista antes de guardar.'); (form.current?.elements.namedItem(`guest-${first}`) as HTMLElement | null)?.focus(); return; }
    busyRef.current = true; setBusy(true);
    try { await save(validation.command); if (mounted.current) close(); }
    catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'No se pudo comprobar el cambio. Conservamos tu edición.'); }
    finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  };
  const confirmRemove = async () => {
    if (busyRef.current || deliveryBusy || stale || !connected || intent !== 'remove' || !acknowledged) return;
    busyRef.current = true; setBusy(true); setError('');
    try { await remove(base.responseRevision ?? 0); if (mounted.current) close(); }
    catch (failure) { if (mounted.current) { setError(failure instanceof Error ? failure.message : 'No se pudo comprobar la eliminación. Actualiza la lista.'); cancelConfirmation(); } }
    finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  };
  const track = (action: DeliveryAction) => {
    if (trackingBlocked || busyRef.current || (!phone && action !== 'manual')) return;
    const url = whatsAppMessageUrl(message, phone);
    if (action !== 'manual' && !url) return;
    void recordDelivery(current, action, action === 'manual' ? '' : url!);
  };
  return <dialog ref={dialog} aria-label="Editar invitado" onKeyDown={event => { if (event.key === 'Escape' && !event.nativeEvent.isComposing) { event.preventDefault(); event.stopPropagation(); requestClose(); } }} onCancel={event => { event.preventDefault(); requestClose(); }} onClose={() => {
    // Some browser/assistive close requests cannot be cancelled. Keep the draft
    // visible and synchronize the parent instead of leaving a hidden dialog.
    if (!mounted.current) return;
    if (busyRef.current || dirty || intent) { dialog.current?.showModal(); requestClose(); } else close();
  }} className={`${styles.surface} m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-[#e4dfd4] bg-white p-5 font-outfit shadow-2xl backdrop:bg-[#242c27]/40 sm:p-6`}>
    <div className="flex items-center justify-between gap-3"><h2 className="font-playfair text-xl text-gray-800">Editar invitado</h2><button type="button" onClick={requestClose} disabled={busy} aria-label="Cerrar edición" className={`${buttonClass} shrink-0 text-gray-700`}>Cerrar</button></div>
    <p className="mt-3 text-sm leading-relaxed text-gray-600">Los cambios se guardan juntos. Una actualización del panel conserva lo que estás escribiendo.</p>
    <p role="status" className="mt-2 text-sm text-gray-700">{busy ? 'Comprobando el resultado…' : dirty ? 'Tienes cambios sin guardar.' : 'Estás viendo los datos guardados.'}</p>
    {intent && <section ref={confirmation} tabIndex={-1} aria-labelledby={`${id}-confirmation`} className="mt-4 space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <h3 id={`${id}-confirmation`} className="break-words font-semibold">{intent === 'remove' ? `¿Eliminar a ${base.name}?` : intent === 'reload' ? '¿Reemplazar tu edición?' : '¿Cerrar sin guardar?'}</h3>
      <p>{intent === 'remove' ? 'Se eliminarán el registro y sus pases sin usar. El servidor conservará los grupos con pases utilizados. Los cambios sin guardar no se aplicarán.' : intent === 'reload' ? 'Cargar los datos actuales descartará los cambios de este formulario.' : 'Tus cambios se perderán. Puedes volver a la edición para guardarlos.'}</p>
      {intent === 'remove' && <label className="flex min-h-11 items-start gap-2 py-2"><input type="checkbox" name="confirm-guest-removal" checked={acknowledged} disabled={busy} onChange={event => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#516749]" />Entiendo que la eliminación no se puede deshacer.</label>}
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={cancelConfirmation} className={`${buttonClass} border-amber-700`}>Conservar edición</button><button type="button" disabled={busy || (intent === 'remove' && (!acknowledged || stale || deliveryBusy || !connected)) || (intent === 'reload' && !latest)} onClick={() => intent === 'remove' ? void confirmRemove() : intent === 'reload' ? reload() : close()} className={`${buttonClass} border-amber-700 font-medium`}>{busy ? 'Comprobando…' : intent === 'remove' ? 'Confirmar eliminación' : intent === 'reload' ? 'Descartar cambios y cargar datos actuales' : 'Descartar cambios y cerrar'}</button></div>
    </section>}
    <form ref={form} noValidate onSubmit={event => { event.preventDefault(); void submit(); }} className="mt-4 space-y-4">
      <fieldset disabled={locked} className="space-y-4">
        <label className="block text-sm text-gray-700">Nombre<input {...attributes('name')} autoComplete="off" required maxLength={80} value={draft.name} onChange={event => change('name', event.target.value)} className={`${fieldClass} mt-1 w-full`} />{fieldError('name')}</label>
        <label className="block text-sm text-gray-700">Teléfono de WhatsApp<input {...attributes('phone')} type="tel" autoComplete="off" maxLength={40} value={draft.phone} onChange={event => change('phone', event.target.value)} placeholder="+591 71234567…" className={`${fieldClass} mt-1 w-full`} />{fieldError('phone')}</label>
        <label className="block text-sm text-gray-700">Familia o grupo<input {...attributes('group')} autoComplete="off" maxLength={40} value={draft.group} onChange={event => change('group', event.target.value)} placeholder="Familia, Amigos, VIP…" className={`${fieldClass} mt-1 w-full`} />{fieldError('group')}</label>
        <label className="block text-sm text-gray-700">Preferencia de asistencia<select {...attributes('eventAccess')} value={draft.eventAccess} onChange={event => change('eventAccess', event.target.value)} className={`${fieldClass} mt-1 w-full`}><option value="both">Todo el evento</option><option value="ceremony">Ceremonia</option><option value="reception">Recepción</option></select><span className="mt-1 block text-xs text-gray-600">Informativa: no restringe el QR por ubicación.</span>{fieldError('eventAccess')}</label>
        <div className="grid grid-cols-2 gap-3"><label className="block text-sm text-gray-700">Pases asignados<input {...attributes('passes')} type="number" inputMode="numeric" required min={1} max={20} step={1} value={draft.passes} onChange={event => change('passes', event.target.value)} className={`${fieldClass} mt-1 w-full`} />{fieldError('passes')}</label>{tables && <label className="block text-sm text-gray-700">Mesa<input {...attributes('tableNo')} autoComplete="off" maxLength={20} value={draft.tableNo} onChange={event => change('tableNo', event.target.value)} placeholder="Sin asignar…" className={`${fieldClass} mt-1 w-full`} />{fieldError('tableNo')}</label>}</div>
        <label className="flex min-h-11 items-center gap-2 text-sm text-gray-700"><input name="guest-allowKids" type="checkbox" checked={draft.allowKids} onChange={event => change('allowKids', event.target.checked)} className="h-4 w-4 accent-[#516749]" />Permitir niños</label>
      </fieldset>
      {stale && <div role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{latest ? 'Este registro cambió en otra sesión. Tu edición sigue aquí; revisa los datos actuales antes de guardar.' : 'Este invitado ya no está disponible. Tu edición sigue aquí.'}{latest && <button type="button" disabled={busy || !!intent} onClick={() => dirty ? ask('reload') : reload()} className="mt-2 block min-h-11 font-medium underline underline-offset-4">Cargar datos actuales</button>}</div>}
      {loading ? <p role="status" className="text-sm text-gray-600">Consultando la versión actual del invitado…</p> : !connected && <p role="alert" className="text-sm text-amber-950">Sin conexión. Conservamos tu edición; espera antes de guardar.</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <button type="submit" disabled={locked || deliveryBusy || stale || !connected || !dirty} className="min-h-11 w-full rounded-xl bg-[#516749] px-4 text-sm text-white hover:bg-[#40523a] disabled:opacity-40">{busy ? 'Comprobando…' : 'Guardar cambios'}</button>
    </form>
    <section aria-label="Seguimiento de WhatsApp" className="mt-6 space-y-3 border-t border-gray-200 pt-4 text-sm text-gray-700">
      <h3 className="font-medium">WhatsApp con los datos guardados</h3><p className="break-words">{current.name} · {current.phone || 'Sin teléfono'}</p>
      <p className="text-xs">Seguimiento: {DELIVERY_LABELS[deliveryState(current)]} · Recordatorios preparados: {current.reminderCount ?? 0}</p>
      {dirty && <p className="text-sm text-amber-950">Guarda los cambios antes de preparar WhatsApp o registrar una marca manual.</p>}
      <label className="block">Tipo de mensaje<select aria-label="Tipo de mensaje de WhatsApp" value={purpose} disabled={trackingBlocked} onChange={event => setSelectedPurpose(event.target.value as MessagePurpose)} className={`${fieldClass} mt-1 w-full`}><option value="invitation">Invitación</option>{current.status === 'pending' && <option value="reminder">Recordatorio</option>}</select></label>
      <WhatsAppMessagePreview message={message} usingDefault={usingDefault} useDefault={trackingBlocked ? undefined : () => setDefaultChoice(choice)} />
      <div className="flex flex-wrap gap-2"><button type="button" disabled={locked || stale} onClick={async () => { try { await navigator.clipboard.writeText(link); if (mounted.current) setCopied(true); } catch { if (mounted.current) setError('No se pudo copiar. Abre la invitación desde la lista y copia su dirección.'); } }} className={buttonClass}>{copied ? 'Enlace copiado' : 'Copiar enlace'}</button><button type="button" disabled={trackingBlocked || !phone || !message.ready} onClick={() => track(purpose === 'reminder' ? 'reminder' : 'opened')} className={buttonClass}>{purpose === 'reminder' ? 'Preparar recordatorio' : 'Abrir WhatsApp'}</button><button type="button" disabled={trackingBlocked || ['marked', 'responded'].includes(deliveryState(current))} onClick={() => track('manual')} className={buttonClass}>Marcar manualmente</button></div>
      <p className="text-xs leading-relaxed">Abrir WhatsApp no confirma envío, entrega ni lectura. La marca manual declara únicamente una acción del equipo.</p>
      {children}
    </section>
    <button type="button" disabled={locked || deliveryBusy || stale || !connected || current.inside > 0} onClick={() => ask('remove')} className="mt-4 min-h-11 w-full text-sm text-rose-800 hover:bg-rose-50 disabled:opacity-40">Eliminar invitado</button>
    {current.inside > 0 && <p className="text-sm text-gray-600">Hay personas dentro. No se puede eliminar este grupo ni sus pases utilizados.</p>}
  </dialog>;
}
