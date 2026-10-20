'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { PACKAGE_CATALOG, PACKAGE_ORDER } from '@/lib/packages';
import { SALES_PIPELINE, SALES_REPLY_LABELS, formatSalesQuote, validateSalesQuote, salesReply, type SalesQuoteField, type SalesQuoteInput, type SalesReplyKey } from '@/lib/sales-playbook';
import type { InvitationPackage } from '@/lib/types';
import { clearSalesDraft, copySalesText, EMPTY_SALES_DRAFT, readSalesDraft, requestSalesConfig, saveSalesDraft, type SalesConfig, type SalesDraftInput, type SalesDraftStorage } from '@/lib/sales-draft';
import { prepareSalesContactDraft, type SalesQuoteContact } from '@/lib/sales-contact';

export function SalesCopyButton({ value, label, disabled = false, writeText }: { value: string; label: string; disabled?: boolean; writeText?: (text: string) => Promise<void> }) {
  const [state, setState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const pending = useRef(false), alive = useRef(true), latest = useRef(value);
  const available = useRef(!disabled); available.current = !disabled;
  latest.current = value;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (!pending.current) setState('idle'); }, [value]);
  const copy = async () => {
    if (pending.current || disabled || !available.current || latest.current !== value || !alive.current) return;
    pending.current = true; setState('copying');
    try {
      await copySalesText(value, writeText ?? (text => navigator.clipboard.writeText(text)));
      if (alive.current) setState(latest.current === value ? 'copied' : 'idle');
    } catch { if (alive.current) setState(latest.current === value ? 'error' : 'idle'); }
    finally { pending.current = false; }
  };
  return <div className="min-w-0"><button type="button" disabled={disabled || state === 'copying'} aria-busy={state === 'copying'} onClick={() => void copy()} className="min-h-11 rounded-xl border border-[#d9d0c2] bg-white px-4 py-2 font-outfit text-sm font-semibold text-[#6d5c40] transition-colors hover:border-[#b8975a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806b48] disabled:opacity-50">{state === 'copying' ? 'Copiando…' : state === 'copied' ? 'Copiado' : label}</button><span className="sr-only" role="status">{state === 'copied' ? 'Texto copiado al portapapeles.' : ''}</span>{state === 'error' && <p role="alert" className="mt-2 max-w-sm font-outfit text-sm leading-6">No se pudo copiar. Selecciona el texto y cópialo manualmente.</p>}</div>;
}

const quoteFieldLabels: Record<SalesQuoteField, string> = { clientName: 'cliente', eventType: 'evento', eventDate: 'fecha', design: 'diseño', packageKey: 'paquete', extrasBs: 'importe de adicionales', extrasLabel: 'detalle de adicionales', paymentInstructions: 'medio de pago', commercialReference: 'referencia comercial' };
const missingQuoteFields = (missing: SalesQuoteField[]) => missing.map(field => quoteFieldLabels[field]).join(', ');

type ContactRequest = { sequence: number; contact: SalesQuoteContact };
type PendingContact = ContactRequest & { packageKey: InvitationPackage | '' };

export function SalesContactImport({ contact, packageKey, replacing, disabled = false, onPackage, onApply, onCancel }: { contact: SalesQuoteContact; packageKey: InvitationPackage | ''; replacing: boolean; disabled?: boolean; onPackage: (value: InvitationPackage | '') => void; onApply: () => void; onCancel: () => void }) {
  const id = useId();
  return <section aria-labelledby={id} className="mb-5 min-w-0 space-y-4 rounded-xl border border-amber-300 bg-amber-50 p-4 font-outfit text-sm leading-6 text-amber-950">
    <h3 id={id} className="text-base font-semibold">Preparar cotización para <span translate="no" className="font-mono">{contact.reference}</span></h3>
    <p>{replacing ? 'Se reemplazará el borrador de esta pestaña. Si necesitas conservarlo, cancela y cópialo antes de continuar.' : 'Revisa los datos del contacto antes de iniciar este borrador.'} El nombre, la fecha y los adicionales quedarán vacíos para evitar mezclar clientes.</p>
    <dl className="grid min-w-0 gap-3 sm:grid-cols-2"><div><dt>Evento</dt><dd className="break-words font-semibold">{contact.eventType || 'Por confirmar'}</dd></div><div><dt>Diseño</dt><dd className="break-words font-semibold">{contact.design || 'Por confirmar'}</dd></div></dl>
    <label className="block max-w-sm font-semibold">Paquete para cotizar<select value={packageKey} disabled={disabled} onChange={event => onPackage(event.target.value as InvitationPackage | '')} className="mt-1.5 min-h-11 w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-base font-normal text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39]"><option value="">Selecciona un paquete</option>{PACKAGE_ORDER.map(key => <option key={key} value={key}>{PACKAGE_CATALOG[key].label} · {PACKAGE_CATALOG[key].bs} Bs</option>)}</select></label>
    {!contact.packageKey && <p>El contacto no tiene paquete. Elige uno; no se asignará automáticamente.</p>}
    <div className="flex flex-wrap gap-3"><button type="button" disabled={disabled || !packageKey} onClick={onApply} className="min-h-11 rounded-xl bg-[#765f39] px-4 py-2 font-semibold text-white hover:bg-[#5d4a2c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">{replacing ? 'Reemplazar borrador y usar contacto' : 'Usar datos del contacto'}</button><button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-amber-300 bg-white px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Cancelar y conservar borrador</button></div>
    <p>Preparar o copiar no guarda una cotización en el servidor ni confirma conversaciones, reservas o pagos.</p>
  </section>;
}

export function SalesQuoteReview({ input, disabled = false, writeText }: { input: SalesQuoteInput; disabled?: boolean; writeText?: (text: string) => Promise<void> }) {
  const id = useId(), validation = validateSalesQuote(input), invalid = Object.keys(validation.errors).length > 0;
  const proposal = invalid || !validation.totals ? '' : formatSalesQuote(input);
  return <div className="min-w-0 rounded-2xl bg-[#29231b] p-5 text-white">
    <div className="flex flex-wrap items-start justify-between gap-3"><h3 id={id} className="font-playfair text-2xl">Resumen para revisar</h3><SalesCopyButton value={proposal} label={validation.ready ? 'Copiar propuesta' : 'Copiar borrador'} disabled={disabled || invalid || !validation.totals} writeText={writeText} /></div>
    {invalid || !validation.totals ? <p role="alert" className="mt-5 font-outfit text-sm leading-6 text-white">Corrige los campos señalados para revisar y copiar la cotización. No se generará una propuesta con datos inválidos.</p> : <>
      {!validation.ready && <p role="status" className="mt-4 font-outfit text-sm leading-6 text-[#f0d9a9]">Borrador: completa {missingQuoteFields(validation.missing)} antes de enviar una propuesta definitiva.</p>}
      <pre role="region" aria-labelledby={id} tabIndex={0} className="mt-5 max-h-[440px] overflow-auto whitespace-pre-wrap break-words font-outfit text-sm leading-6 text-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4c5b9] [overflow-wrap:anywhere]">{proposal}</pre>
    </>}
  </div>;
}

export default function SalesToolkit({ transport = fetch, storage: storageOverride, writeText, contactRequest, onScopeReady }: { transport?: typeof fetch; storage?: SalesDraftStorage; writeText?: (text: string) => Promise<void>; contactRequest?: ContactRequest | null; onScopeReady?: (scope: string | null) => void } = {}) {
  const [input, setInput] = useState<SalesDraftInput>(EMPTY_SALES_DRAFT);
  const [config, setConfig] = useState<SalesConfig | null>(null);
  const [configState, setConfigState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [configError, setConfigError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [readyScope, setReadyScope] = useState('');
  const [draftState, setDraftState] = useState<'empty' | 'recovered' | 'saved' | 'memory' | 'error'>('empty');
  const [changed, setChanged] = useState(false), [confirmDiscard, setConfirmDiscard] = useState(false);
  const [pendingContact, setPendingContact] = useState<PendingContact | null>(null), [contactNotice, setContactNotice] = useState('');
  const [contactFocusSequence, setContactFocusSequence] = useState(0);
  const handledContact = useRef<number | null>(null), contactFocus = useRef<HTMLDivElement>(null), quoteHeading = useRef<HTMLButtonElement>(null);
  const persistAllowed = useRef(false);
  const storage = useMemo<SalesDraftStorage>(() => storageOverride ?? {
    getItem: key => window.sessionStorage.getItem(key), setItem: (key, value) => window.sessionStorage.setItem(key, value), removeItem: key => window.sessionStorage.removeItem(key),
  }, [storageOverride]);
  const bodyId = useId(), proposalId = useId();
  const [show, setShow] = useState(false);
  const configLifetime = useRef({ attempt, transport, onScopeReady, epoch: 0 });
  if (configLifetime.current.attempt !== attempt || configLifetime.current.transport !== transport || configLifetime.current.onScopeReady !== onScopeReady) configLifetime.current = { attempt, transport, onScopeReady, epoch: configLifetime.current.epoch + 1 };
  const configEpoch = configLifetime.current.epoch;
  const [configViewEpoch, setConfigViewEpoch] = useState(configEpoch), [readyConfigEpoch, setReadyConfigEpoch] = useState<number | null>(null);
  const visibleConfigState = configViewEpoch === configEpoch ? configState : 'loading';
  useEffect(() => {
    let active = true;
    const request = new AbortController();
    setConfigViewEpoch(configEpoch);
    setConfigState('loading');
    onScopeReady?.(null);
    void requestSalesConfig(transport, request.signal).then(value => {
      if (active && configLifetime.current.epoch === configEpoch) { setConfig(value); setReadyConfigEpoch(configEpoch); setConfigState('ready'); setConfigError(''); onScopeReady?.(value.draftScope); }
    }).catch(cause => { if (active && configLifetime.current.epoch === configEpoch) { setConfigState('error'); setConfigError(cause instanceof Error ? cause.message : 'No se pudo comprobar la configuración. Inténtalo de nuevo.'); } });
    return () => { active = false; request.abort(); onScopeReady?.(null); };
  }, [attempt, transport, onScopeReady, configEpoch]);
  const scope = config?.draftScope;
  useEffect(() => {
    if (!scope) return;
    const result = readSalesDraft(storage, scope);
    const expiredCleared = result.kind !== 'expired' || clearSalesDraft(storage, scope);
    persistAllowed.current = ['ready', 'empty', 'expired'].includes(result.kind) && expiredCleared;
    setInput(result.kind === 'ready' ? result.input : EMPTY_SALES_DRAFT);
    setChanged(!['empty', 'expired'].includes(result.kind));
    setDraftState(result.kind === 'ready' ? 'recovered' : persistAllowed.current ? 'empty' : 'memory');
    setReadyScope(scope);
  }, [scope, storage]);
  const booting = !scope || readyScope !== scope || visibleConfigState !== 'ready' || readyConfigEpoch !== configEpoch;
  useEffect(() => {
    if (!contactRequest || handledContact.current === contactRequest.sequence) return;
    setShow(true);
    if (booting) return;
    handledContact.current = contactRequest.sequence;
    setContactFocusSequence(contactRequest.sequence);
    setConfirmDiscard(false);
    if (input.commercialReference === contactRequest.contact.reference) {
      setPendingContact(null); setContactNotice(`Continuamos la cotización de ${contactRequest.contact.reference}. Se conservaron tus datos y ajustes.`);
    } else {
      setContactNotice(''); setPendingContact({ ...contactRequest, packageKey: contactRequest.contact.packageKey ?? '' });
    }
  }, [contactRequest, booting, input.commercialReference]);
  const hasPendingContact = !!pendingContact;
  useEffect(() => {
    const target = hasPendingContact ? contactFocus.current : contactNotice ? quoteHeading.current : null;
    target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'start', behavior: 'auto' });
  }, [hasPendingContact, contactNotice, contactFocusSequence]);
  const current = useMemo(() => ({ ...input, paymentInstructions: !booting ? config?.paymentInstructions || '' : '' }), [input, config?.paymentInstructions, booting]);
  const validation = useMemo(() => validateSalesQuote(current), [current]);
  const totals = validation.totals, invalid = Object.keys(validation.errors).length > 0;
  const fieldError = (field: SalesQuoteField) => validation.errors[field] && <span id={`${proposalId}-${field}-error`} role="alert" className="mt-2 block font-outfit text-sm font-normal normal-case leading-6 tracking-normal text-red-800">{validation.errors[field]}</span>;
  const fieldProps = (field: SalesQuoteField) => ({ 'aria-invalid': !!validation.errors[field], 'aria-describedby': validation.errors[field] ? `${proposalId}-${field}-error` : undefined });
  const set = <K extends keyof SalesDraftInput>(key: K, value: SalesDraftInput[K]) => {
    if (booting || pendingContact || configLifetime.current.epoch !== configEpoch) return;
    const next = { ...input, [key]: value }; setInput(next); setChanged(true); setConfirmDiscard(false);
    if (scope && persistAllowed.current) setDraftState(saveSalesDraft(storage, scope, next) ? 'saved' : 'error');
  };
  const discard = () => {
    if (booting || pendingContact || configLifetime.current.epoch !== configEpoch) return;
    if (!scope || !clearSalesDraft(storage, scope)) { setDraftState('error'); return; }
    setInput(EMPTY_SALES_DRAFT); setChanged(false); setConfirmDiscard(false); setDraftState('empty'); persistAllowed.current = true;
    setContactNotice('');
  };
  const applyContact = () => {
    if (!pendingContact || booting || !scope || !pendingContact.packageKey || configLifetime.current.epoch !== configEpoch) return;
    const next = prepareSalesContactDraft(pendingContact.contact, pendingContact.packageKey);
    if (!next) return;
    setInput(next); setChanged(true); setConfirmDiscard(false); persistAllowed.current = true;
    const stored = saveSalesDraft(storage, scope, next);
    setDraftState(stored ? 'saved' : 'error');
    setContactNotice(stored ? `Cotización preparada para ${pendingContact.contact.reference}. Completa los datos pendientes antes de copiar una propuesta definitiva.` : `Cotización de ${pendingContact.contact.reference} preparada solo en memoria. Conserva esta pestaña abierta: al recargar puede reaparecer el borrador anterior.`); setPendingContact(null);
  };
  const quoteBlocked = booting || !!pendingContact;
  const draftNotice = { empty: 'Los cambios se guardarán en esta pestaña y sesión. Recuperación disponible durante 24 horas.', recovered: 'Recuperamos el borrador de esta sesión. Revísalo antes de copiarlo.', saved: 'Borrador guardado en esta pestaña y sesión.', memory: 'No se pudo recuperar el borrador local. Puedes trabajar aquí, pero los cambios no se conservarán al recargar.', error: 'No se pudo guardar o descartar el borrador. Conserva esta pestaña abierta para no perder los datos.' }[draftState];

  return <section className="overflow-hidden rounded-3xl border border-[#dfd7cb] bg-white">
    <button ref={quoteHeading} type="button" aria-expanded={show} aria-controls={bodyId} onClick={() => setShow(value => !value)} className="flex w-full scroll-mt-6 items-start justify-between gap-4 p-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#806b48] sm:p-7">
      <div><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.2em] text-[#a48655]">Proceso comercial</p><h2 className="mt-1 font-playfair text-3xl text-gray-900">Cotiza y responde sin improvisar</h2><p className="mt-2 max-w-2xl font-outfit text-xs leading-5 text-gray-500">Genera el resumen escrito, calcula reserva y saldo, y copia respuestas consistentes para WhatsApp.</p></div>
      <span className="mt-1 rounded-full bg-[#f3eee6] px-3 py-1.5 font-outfit text-[10px] font-semibold text-[#765f3b]">{show ? 'Cerrar' : 'Abrir herramientas'}</span>
    </button>
    {show && <div id={bodyId} className="border-t border-[#eee8df] p-5 sm:p-7">
      {visibleConfigState === 'loading' && <p role="status" className="mb-5 text-sm text-[#675d50]">Comprobando configuración y borrador…</p>}
      {visibleConfigState === 'error' && <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p>{configError}</p><button type="button" onClick={() => { if (configLifetime.current.epoch === configEpoch) setAttempt(value => value + 1); }} className="mt-3 min-h-11 rounded-xl border border-amber-300 bg-white px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Reintentar configuración</button></div>}
      {pendingContact && <div ref={contactFocus} tabIndex={-1} role="group" aria-label={`Revisar cotización para ${pendingContact.contact.reference}`} className="scroll-mt-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39]"><SalesContactImport contact={pendingContact.contact} packageKey={pendingContact.packageKey} replacing={changed} disabled={booting} onPackage={value => setPendingContact(previous => previous ? { ...previous, packageKey: value } : null)} onApply={applyContact} onCancel={() => { setPendingContact(null); setContactNotice('Conservamos el borrador anterior sin cambios.'); }} /></div>}
      {contactNotice && <p role="status" className="mb-5 font-outfit text-sm leading-6 text-gray-700">{contactNotice}</p>}
      {input.commercialReference && <div className="mb-5 space-y-1 font-outfit text-sm leading-6 text-gray-700"><p>Referencia comercial: <strong translate="no" className="font-mono">{input.commercialReference}</strong></p><p>Identifica el contacto; no es una referencia de pago. Se incluirá en la cotización copiada.</p>{fieldError('commercialReference')}</div>}
      {!booting && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dfd7cb] bg-[#faf7f2] p-4"><p role="status" className="max-w-2xl font-outfit text-xs leading-5 text-[#675d50]">{draftNotice} No guarda instrucciones bancarias ni envía mensajes.</p>{changed && !pendingContact && <div className="flex flex-wrap items-center gap-2">{confirmDiscard ? <><span className="text-xs text-[#675d50]">¿Descartar los datos de esta cotización?</span><button type="button" onClick={discard} className="min-h-11 rounded-xl border border-red-300 bg-white px-3 text-xs text-red-800 focus-visible:outline focus-visible:outline-2">Sí, descartar</button><button type="button" onClick={() => setConfirmDiscard(false)} className="min-h-11 rounded-xl border border-[#d9d0c2] bg-white px-3 text-xs text-[#6d5c40] focus-visible:outline focus-visible:outline-2">Conservar borrador</button></> : <button type="button" onClick={() => setConfirmDiscard(true)} className="min-h-11 rounded-xl border border-[#d9d0c2] bg-white px-3 text-xs text-[#6d5c40] focus-visible:outline focus-visible:outline-2">Descartar borrador</button>}</div>}</div>}
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
        <div className="min-w-0">
          <fieldset disabled={quoteBlocked} className="grid min-w-0 gap-3 sm:grid-cols-2">
            <legend className="sr-only">Datos de la cotización</legend>
            <label className="font-outfit text-sm font-semibold text-gray-700">Cliente<input {...fieldProps('clientName')} name="quote-client" autoComplete="off" maxLength={140} value={input.clientName || ''} onChange={e => set('clientName', e.target.value)} placeholder="Nombre o familia" className="mt-1.5 min-h-11 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#806b48] focus:border-[#b8975a]" />{fieldError('clientName')}</label>
            <label className="font-outfit text-sm font-semibold text-gray-700">Evento<input {...fieldProps('eventType')} name="quote-event" autoComplete="off" maxLength={140} value={input.eventType || ''} onChange={e => set('eventType', e.target.value)} placeholder="Boda, XV años…" className="mt-1.5 min-h-11 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#806b48] focus:border-[#b8975a]" />{fieldError('eventType')}</label>
            <label className="font-outfit text-sm font-semibold text-gray-700">Fecha<input {...fieldProps('eventDate')} name="quote-date" autoComplete="off" type="date" value={input.eventDate || ''} onChange={e => set('eventDate', e.target.value)} className="mt-1.5 min-h-11 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#806b48] focus:border-[#b8975a]" />{fieldError('eventDate')}</label>
            <label className="font-outfit text-sm font-semibold text-gray-700">Diseño<input {...fieldProps('design')} name="quote-design" autoComplete="off" maxLength={140} value={input.design || ''} onChange={e => set('design', e.target.value)} placeholder="Lunaria, Marfil Vivo…" className="mt-1.5 min-h-11 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#806b48] focus:border-[#b8975a]" />{fieldError('design')}</label>
            <label className="font-outfit text-sm font-semibold text-gray-700">Paquete<select {...fieldProps('packageKey')} name="quote-package" value={input.packageKey} onChange={e => set('packageKey', e.target.value as InvitationPackage)} className="mt-1.5 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#806b48] focus:border-[#b8975a]">{PACKAGE_ORDER.map(key => <option key={key} value={key}>{PACKAGE_CATALOG[key].label} · {PACKAGE_CATALOG[key].bs} Bs</option>)}</select>{fieldError('packageKey')}</label>
            <label className="font-outfit text-sm font-semibold text-gray-700">Adicionales Bs<input {...fieldProps('extrasBs')} name="quote-extras" inputMode="decimal" autoComplete="off" type="text" maxLength={24} value={input.extrasBs ?? ''} onChange={e => set('extrasBs', e.target.value)} placeholder="Ej. 120,50" className="mt-1.5 min-h-11 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#806b48] focus:border-[#b8975a]" />{fieldError('extrasBs')}<span className="mt-2 block font-outfit text-sm font-normal leading-6 text-gray-600">Usa coma o punto decimal, sin separadores de miles.</span></label>
            {(Boolean(input.extrasBs) || !!input.extrasLabel || !!validation.errors.extrasLabel) && <label className="font-outfit text-sm font-semibold text-gray-700 sm:col-span-2">Detalle de adicionales<input {...fieldProps('extrasLabel')} name="quote-extras-detail" autoComplete="off" maxLength={140} value={input.extrasLabel || ''} onChange={e => set('extrasLabel', e.target.value)} placeholder="Entrega express, dominio…" className="mt-1.5 min-h-11 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#806b48] focus:border-[#b8975a]" />{fieldError('extrasLabel')}</label>}
          </fieldset>
          {!invalid && validation.missing.length > 0 && <p role="status" className="mt-4 font-outfit text-sm leading-6 text-amber-900">Borrador: completa {missingQuoteFields(validation.missing)} antes de enviar una propuesta definitiva.</p>}
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {([['Total', totals?.total], ['Reserva', totals?.reservation], ['Saldo', totals?.balance]] as const).map(([label, value]) => <div key={label} className="min-w-0 rounded-2xl bg-[#f6f2eb] p-3"><p className="break-words font-playfair text-xl text-[#5d513d] [overflow-wrap:anywhere]">{value === undefined ? 'Por corregir' : `${value.toLocaleString('es-BO', { maximumFractionDigits: 2 })} Bs`}</p><p className="mt-1 font-outfit text-sm text-gray-600">{label}</p></div>)}
          </div>
          {!booting && config && <div className={`mt-4 rounded-2xl border p-4 ${config.paymentConfigured ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><p className={`font-outfit text-sm font-semibold ${config.paymentConfigured ? 'text-emerald-800' : 'text-amber-900'}`}>{config.paymentConfigured ? 'Instrucciones de pago configuradas' : 'Medio de pago por confirmar'}</p><p className={`mt-1 font-outfit text-sm leading-6 ${config.paymentConfigured ? 'text-emerald-700' : 'text-amber-800'}`}>{config.paymentConfigured ? 'Se incluirán en la propuesta. Esto no confirma un pago ni habilita BCP.' : 'Completa las instrucciones con el equipo antes de enviar una propuesta definitiva.'} · Horario: {config.salesHours}</p>{fieldError('paymentInstructions')}</div>}
        </div>
        <SalesQuoteReview input={current} disabled={quoteBlocked} writeText={writeText} />
      </div>

      <div className="mt-7 border-t border-gray-100 pt-7"><h3 className="font-playfair text-2xl text-gray-900">Respuestas rápidas</h3><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{(Object.keys(SALES_REPLY_LABELS) as SalesReplyKey[]).map(key => {
        const needsReady = key === 'reservation' || key === 'materials';
        const blocked = invalid || (needsReady && !validation.ready);
        const reply = blocked ? '' : salesReply(key, current);
        return <article key={key} className="flex min-w-0 flex-col rounded-2xl border border-gray-100 bg-[#faf9f6] p-4"><h4 className="font-outfit text-sm font-semibold text-gray-800">{SALES_REPLY_LABELS[key]}</h4><p className="mt-2 flex-1 break-words font-outfit text-sm leading-6 text-gray-600 [overflow-wrap:anywhere]">{invalid ? 'Corrige los campos señalados para preparar esta respuesta.' : blocked ? `Completa ${missingQuoteFields(validation.missing)} para preparar esta respuesta.` : reply}</p><div className="mt-3"><SalesCopyButton value={reply} label="Copiar" disabled={quoteBlocked || blocked} writeText={writeText} /></div></article>;
      })}</div></div>
      <div className="mt-7 border-t border-gray-100 pt-7"><h3 className="font-playfair text-2xl text-gray-900">Reglas del embudo</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{SALES_PIPELINE.map((step, index) => <article key={step.key} className="rounded-2xl bg-[#f7f3ed] p-4"><span className="font-playfair text-[#a48655]">0{index + 1}</span><h4 className="mt-2 font-outfit text-xs font-semibold text-gray-800">{step.label}</h4><p className="mt-1 font-outfit text-[10px] leading-4 text-gray-500">{step.target}</p></article>)}</div></div>
    </div>}
  </section>;
}
