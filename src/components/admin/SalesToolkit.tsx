'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { PACKAGE_CATALOG, PACKAGE_ORDER } from '@/lib/packages';
import { SALES_PIPELINE, SALES_REPLY_LABELS, formatSalesQuote, salesQuoteTotals, salesReply, type SalesReplyKey } from '@/lib/sales-playbook';
import type { InvitationPackage } from '@/lib/types';
import { clearSalesDraft, copySalesText, EMPTY_SALES_DRAFT, readSalesDraft, requestSalesConfig, saveSalesDraft, type SalesConfig, type SalesDraftInput, type SalesDraftStorage } from '@/lib/sales-draft';

export function SalesCopyButton({ value, label, disabled = false, writeText }: { value: string; label: string; disabled?: boolean; writeText?: (text: string) => Promise<void> }) {
  const [state, setState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const pending = useRef(false), alive = useRef(true), latest = useRef(value);
  latest.current = value;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (!pending.current) setState('idle'); }, [value]);
  const copy = async () => {
    if (pending.current || disabled) return;
    pending.current = true; setState('copying');
    try {
      await copySalesText(value, writeText ?? (text => navigator.clipboard.writeText(text)));
      if (alive.current) setState(latest.current === value ? 'copied' : 'idle');
    } catch { if (alive.current) setState(latest.current === value ? 'error' : 'idle'); }
    finally { pending.current = false; }
  };
  return <div className="min-w-0"><button type="button" disabled={disabled || state === 'copying'} aria-busy={state === 'copying'} onClick={() => void copy()} className="min-h-11 rounded-xl border border-[#d9d0c2] bg-white px-4 py-2 font-outfit text-xs font-semibold text-[#6d5c40] transition-colors hover:border-[#b8975a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806b48] disabled:opacity-50">{state === 'copying' ? 'Copiando…' : state === 'copied' ? 'Copiado' : label}</button><span className="sr-only" role="status">{state === 'copied' ? 'Texto copiado al portapapeles.' : ''}</span>{state === 'error' && <p role="alert" className="mt-2 max-w-sm font-outfit text-xs leading-5">No se pudo copiar. Selecciona el texto y cópialo manualmente.</p>}</div>;
}

export default function SalesToolkit({ transport = fetch, storage: storageOverride, writeText }: { transport?: typeof fetch; storage?: SalesDraftStorage; writeText?: (text: string) => Promise<void> } = {}) {
  const [input, setInput] = useState<SalesDraftInput>(EMPTY_SALES_DRAFT);
  const [config, setConfig] = useState<SalesConfig | null>(null);
  const [configState, setConfigState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [configError, setConfigError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [readyScope, setReadyScope] = useState('');
  const [draftState, setDraftState] = useState<'empty' | 'recovered' | 'saved' | 'memory' | 'error'>('empty');
  const [changed, setChanged] = useState(false), [confirmDiscard, setConfirmDiscard] = useState(false);
  const persistAllowed = useRef(false);
  const storage = useMemo<SalesDraftStorage>(() => storageOverride ?? {
    getItem: key => window.sessionStorage.getItem(key), setItem: (key, value) => window.sessionStorage.setItem(key, value), removeItem: key => window.sessionStorage.removeItem(key),
  }, [storageOverride]);
  const bodyId = useId(), proposalId = useId();
  const [show, setShow] = useState(false);
  useEffect(() => {
    let active = true;
    const request = new AbortController(), timeout = window.setTimeout(() => request.abort(), 12000);
    setConfigState('loading');
    void requestSalesConfig(transport, request.signal).then(value => {
      if (active) { setConfig(value); setConfigState('ready'); setConfigError(''); }
    }).catch(cause => { if (active) { setConfigState('error'); setConfigError(cause instanceof Error ? cause.message : 'No se pudo comprobar la configuración. Inténtalo de nuevo.'); } }).finally(() => window.clearTimeout(timeout));
    return () => { active = false; request.abort(); window.clearTimeout(timeout); };
  }, [attempt, transport]);
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
  const booting = !scope || readyScope !== scope || configState !== 'ready';
  const current = useMemo(() => ({ ...input, paymentInstructions: config?.paymentInstructions || '' }), [input, config?.paymentInstructions]);
  const proposal = useMemo(() => formatSalesQuote(current), [current]);
  const totals = useMemo(() => salesQuoteTotals(current), [current]);
  const set = <K extends keyof SalesDraftInput>(key: K, value: SalesDraftInput[K]) => {
    const next = { ...input, [key]: value }; setInput(next); setChanged(true); setConfirmDiscard(false);
    if (scope && persistAllowed.current) setDraftState(saveSalesDraft(storage, scope, next) ? 'saved' : 'error');
  };
  const discard = () => {
    if (!scope || !clearSalesDraft(storage, scope)) { setDraftState('error'); return; }
    setInput(EMPTY_SALES_DRAFT); setChanged(false); setConfirmDiscard(false); setDraftState('empty'); persistAllowed.current = true;
  };
  const draftNotice = { empty: 'Los cambios se guardarán en esta pestaña y sesión. Recuperación disponible durante 24 horas.', recovered: 'Recuperamos el borrador de esta sesión. Revísalo antes de copiarlo.', saved: 'Borrador guardado en esta pestaña y sesión.', memory: 'No se pudo recuperar el borrador local. Puedes trabajar aquí, pero los cambios no se conservarán al recargar.', error: 'No se pudo guardar o descartar el borrador. Conserva esta pestaña abierta para no perder los datos.' }[draftState];

  return <section className="overflow-hidden rounded-3xl border border-[#dfd7cb] bg-white">
    <button type="button" aria-expanded={show} aria-controls={bodyId} onClick={() => setShow(value => !value)} className="flex w-full items-start justify-between gap-4 p-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#806b48] sm:p-7">
      <div><p className="font-outfit text-[10px] font-semibold uppercase tracking-[.2em] text-[#a48655]">Proceso comercial</p><h2 className="mt-1 font-playfair text-3xl text-gray-900">Cotiza y responde sin improvisar</h2><p className="mt-2 max-w-2xl font-outfit text-xs leading-5 text-gray-500">Genera el resumen escrito, calcula reserva y saldo, y copia respuestas consistentes para WhatsApp.</p></div>
      <span className="mt-1 rounded-full bg-[#f3eee6] px-3 py-1.5 font-outfit text-[10px] font-semibold text-[#765f3b]">{show ? 'Cerrar' : 'Abrir herramientas'}</span>
    </button>
    {show && <div id={bodyId} className="border-t border-[#eee8df] p-5 sm:p-7">
      {configState === 'loading' && <p role="status" className="mb-5 text-sm text-[#675d50]">Comprobando configuración y borrador…</p>}
      {configState === 'error' && <div role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p>{configError}</p><button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-3 min-h-11 rounded-xl border border-amber-300 bg-white px-4 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Reintentar configuración</button></div>}
      {!booting && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dfd7cb] bg-[#faf7f2] p-4"><p role="status" className="max-w-2xl font-outfit text-xs leading-5 text-[#675d50]">{draftNotice} No guarda instrucciones bancarias ni envía mensajes.</p>{changed && <div className="flex flex-wrap items-center gap-2">{confirmDiscard ? <><span className="text-xs text-[#675d50]">¿Descartar los datos de esta cotización?</span><button type="button" onClick={discard} className="min-h-11 rounded-xl border border-red-300 bg-white px-3 text-xs text-red-800 focus-visible:outline focus-visible:outline-2">Sí, descartar</button><button type="button" onClick={() => setConfirmDiscard(false)} className="min-h-11 rounded-xl border border-[#d9d0c2] bg-white px-3 text-xs text-[#6d5c40] focus-visible:outline focus-visible:outline-2">Conservar borrador</button></> : <button type="button" onClick={() => setConfirmDiscard(true)} className="min-h-11 rounded-xl border border-[#d9d0c2] bg-white px-3 text-xs text-[#6d5c40] focus-visible:outline focus-visible:outline-2">Descartar borrador</button>}</div>}</div>}
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)]">
        <div className="min-w-0">
          <fieldset disabled={booting} className="grid min-w-0 gap-3 sm:grid-cols-2">
            <legend className="sr-only">Datos de la cotización</legend>
            <label className="font-outfit text-[10px] font-semibold uppercase tracking-[.14em] text-gray-500">Cliente<input name="quote-client" autoComplete="off" maxLength={140} value={input.clientName || ''} onChange={e => set('clientName', e.target.value)} placeholder="Nombre o familia" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base font-normal normal-case tracking-normal outline-none focus-visible:ring-2 focus-visible:ring-[#806b48] focus:border-[#b8975a] sm:text-sm" /></label>
            <label className="font-outfit text-[10px] font-semibold uppercase tracking-[.14em] text-gray-500">Evento<input name="quote-event" autoComplete="off" maxLength={140} value={input.eventType || ''} onChange={e => set('eventType', e.target.value)} placeholder="Boda, XV años…" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base font-normal normal-case tracking-normal outline-none focus-visible:ring-2 focus-visible:ring-[#806b48] focus:border-[#b8975a] sm:text-sm" /></label>
            <label className="font-outfit text-[10px] font-semibold uppercase tracking-[.14em] text-gray-500">Fecha<input name="quote-date" autoComplete="off" type="date" value={input.eventDate || ''} onChange={e => set('eventDate', e.target.value)} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base font-normal normal-case tracking-normal outline-none focus-visible:ring-2 focus-visible:ring-[#806b48] focus:border-[#b8975a] sm:text-sm" /></label>
            <label className="font-outfit text-[10px] font-semibold uppercase tracking-[.14em] text-gray-500">Diseño<input name="quote-design" autoComplete="off" maxLength={140} value={input.design || ''} onChange={e => set('design', e.target.value)} placeholder="Lunaria, Marfil Vivo…" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base font-normal normal-case tracking-normal outline-none focus-visible:ring-2 focus-visible:ring-[#806b48] focus:border-[#b8975a] sm:text-sm" /></label>
            <label className="font-outfit text-[10px] font-semibold uppercase tracking-[.14em] text-gray-500">Paquete<select name="quote-package" value={input.packageKey} onChange={e => set('packageKey', e.target.value as InvitationPackage)} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-base font-normal normal-case tracking-normal outline-none focus-visible:ring-2 focus-visible:ring-[#806b48] focus:border-[#b8975a] sm:text-sm">{PACKAGE_ORDER.map(key => <option key={key} value={key}>{PACKAGE_CATALOG[key].label} · {PACKAGE_CATALOG[key].bs} Bs</option>)}</select></label>
            <label className="font-outfit text-[10px] font-semibold uppercase tracking-[.14em] text-gray-500">Adicionales Bs<input name="quote-extras" inputMode="decimal" autoComplete="off" type="number" min={0} step="1" value={input.extrasBs || ''} onChange={e => set('extrasBs', Math.max(0, Number(e.target.value) || 0))} className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base font-normal normal-case tracking-normal outline-none focus-visible:ring-2 focus-visible:ring-[#806b48] focus:border-[#b8975a] sm:text-sm" /></label>
            {Boolean(input.extrasBs) && <label className="font-outfit text-[10px] font-semibold uppercase tracking-[.14em] text-gray-500 sm:col-span-2">Detalle de adicionales<input name="quote-extras-detail" autoComplete="off" maxLength={140} value={input.extrasLabel || ''} onChange={e => set('extrasLabel', e.target.value)} placeholder="Entrega express, dominio…" className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-base font-normal normal-case tracking-normal outline-none focus-visible:ring-2 focus-visible:ring-[#806b48] focus:border-[#b8975a] sm:text-sm" /></label>}
          </fieldset>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[['Total', totals.total], ['Reserva', totals.reservation], ['Saldo', totals.balance]].map(([label, value]) => <div key={label} className="rounded-2xl bg-[#f6f2eb] p-3"><p className="font-playfair text-xl text-[#5d513d]">{Number(value).toLocaleString('es-BO')} Bs</p><p className="mt-1 font-outfit text-[9px] uppercase tracking-[.12em] text-gray-400">{label}</p></div>)}
          </div>
          {configState === 'ready' && config && <div className={`mt-4 rounded-2xl border p-4 ${config.paymentConfigured ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><p className={`font-outfit text-xs font-semibold ${config.paymentConfigured ? 'text-emerald-800' : 'text-amber-900'}`}>{config.paymentConfigured ? 'Instrucciones de pago configuradas' : 'Medio de pago por confirmar'}</p><p className={`mt-1 font-outfit text-xs leading-5 ${config.paymentConfigured ? 'text-emerald-700' : 'text-amber-800'}`}>{config.paymentConfigured ? 'Se incluirán en la propuesta. Esto no confirma un pago ni habilita BCP.' : 'Completa las instrucciones con el equipo antes de enviar una propuesta definitiva.'} · Horario: {config.salesHours}</p></div>}
        </div>
        <div className="min-w-0 rounded-2xl bg-[#29231b] p-5 text-white"><div className="flex flex-wrap items-start justify-between gap-3"><h3 id={proposalId} className="font-playfair text-2xl">Resumen para revisar</h3><SalesCopyButton value={proposal} label={config?.paymentConfigured ? 'Copiar propuesta' : 'Copiar borrador'} disabled={booting} writeText={writeText} /></div><pre role="region" aria-labelledby={proposalId} tabIndex={0} className="mt-5 max-h-[440px] overflow-auto whitespace-pre-wrap break-words font-outfit text-xs leading-5 text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4c5b9] [overflow-wrap:anywhere]">{proposal}</pre></div>
      </div>

      <div className="mt-7 border-t border-gray-100 pt-7"><h3 className="font-playfair text-2xl text-gray-900">Respuestas rápidas</h3><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{(Object.keys(SALES_REPLY_LABELS) as SalesReplyKey[]).map(key => <article key={key} className="flex min-w-0 flex-col rounded-2xl border border-gray-100 bg-[#faf9f6] p-4"><h4 className="font-outfit text-xs font-semibold text-gray-800">{SALES_REPLY_LABELS[key]}</h4><p className="mt-2 flex-1 break-words font-outfit text-xs leading-5 text-gray-600 [overflow-wrap:anywhere]">{salesReply(key, current)}</p><div className="mt-3"><SalesCopyButton value={salesReply(key, current)} label="Copiar" disabled={booting} writeText={writeText} /></div></article>)}</div></div>
      <div className="mt-7 border-t border-gray-100 pt-7"><h3 className="font-playfair text-2xl text-gray-900">Reglas del embudo</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{SALES_PIPELINE.map((step, index) => <article key={step.key} className="rounded-2xl bg-[#f7f3ed] p-4"><span className="font-playfair text-[#a48655]">0{index + 1}</span><h4 className="mt-2 font-outfit text-xs font-semibold text-gray-800">{step.label}</h4><p className="mt-1 font-outfit text-[10px] leading-4 text-gray-500">{step.target}</p></article>)}</div></div>
    </div>}
  </section>;
}
