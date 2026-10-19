'use client';

import { useEffect, useId, useReducer, useRef, useState } from 'react';
import { COMMERCIAL_LEAD_STATUSES, leadStatusLabel, type CommercialLeadStatus } from '@/lib/commercial';
import type { CommercialLead } from '@/lib/commercial-lookup';
import { commercialDraftDirty, commercialEditorReducer, commercialDraftRevenue, createCommercialEditor, prepareCommercialDraftUpdate, saveCommercialLead, type CommercialSaveResult } from '@/lib/commercial-update';

const control = 'min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39] disabled:bg-gray-100 disabled:text-gray-600';
const button = 'min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39] disabled:opacity-50';

export default function CommercialLeadEditor({ lead, onSaved, onActivityChange, transport = fetch }: { lead: CommercialLead; onSaved: (lead: CommercialLead) => void; onActivityChange?: (id: string, active: boolean) => void; transport?: typeof fetch }) {
  const [state, dispatch] = useReducer(commercialEditorReducer, lead, createCommercialEditor);
  const [validation, setValidation] = useState(''), [confirmDiscard, setConfirmDiscard] = useState(false);
  const id = useId(), busy = useRef(false), mounted = useRef(true), active = useRef<AbortController | null>(null), revenueInput = useRef<HTMLInputElement>(null);
  const dirty = commercialDraftDirty(state.draft, state.base), locked = state.phase !== 'editing';
  useEffect(() => { dispatch({ type: 'receive', lead }); }, [lead]);
  useEffect(() => { onActivityChange?.(lead.id, dirty || !!state.request || state.phase === 'conflict'); }, [dirty, state.request, state.phase, lead.id, onActivityChange]);
  useEffect(() => () => { onActivityChange?.(lead.id, false); }, [lead.id, onActivityChange]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; active.current?.abort(); }; }, []);
  useEffect(() => {
    if (!dirty && !state.request) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, state.request]);

  const save = async () => {
    if (busy.current || (state.phase !== 'editing' && state.phase !== 'uncertain')) return;
    let command = state.phase === 'uncertain' ? state.request : null;
    if (!command) {
      if (!dirty) return;
      if (commercialDraftRevenue(state.draft.revenue) === undefined) { setValidation('Escribe un importe entre 0 y 1.000.000 Bs, con coma o punto decimal, hasta dos decimales y sin separadores de miles, o deja el campo vacío.'); revenueInput.current?.focus(); return; }
      try { command = prepareCommercialDraftUpdate(state.base, state.draft, crypto.randomUUID()); }
      catch { /* A browser without secure UUID support must not send an unsafe write. */ }
      if (!command) { setValidation('No se pudo preparar el cambio. Conserva tus datos y vuelve a cargar este contacto antes de continuar.'); return; }
    }
    busy.current = true; setValidation(''); dispatch({ type: 'start', request: command });
    const controller = new AbortController(); active.current = controller;
    const timer = setTimeout(() => controller.abort(), 20000);
    let result: CommercialSaveResult;
    try { result = await saveCommercialLead(command, state.base.reference, transport, controller.signal); }
    catch { result = { kind: 'uncertain', message: 'No se pudo confirmar el guardado. Pulsa «Comprobar guardado» antes de editar otra vez.' }; }
    finally { clearTimeout(timer); active.current = null; busy.current = false; }
    if (!mounted.current) return;
    dispatch({ type: 'result', result });
    if (result.kind === 'confirmed') onSaved(result.lead);
  };
  const edit = (field: 'status' | 'revenue' | 'notes', value: string) => { setValidation(''); dispatch({ type: 'edit', draft: { ...state.draft, [field]: value } }); };

  return <div className="min-w-0 space-y-3">
    <form onSubmit={event => { event.preventDefault(); void save(); }} aria-label={`Seguimiento de ${lead.reference}`}>
      <fieldset disabled={locked} className="grid min-w-0 gap-3 lg:grid-cols-[160px_150px_minmax(180px,1fr)_auto] lg:items-end">
        <div><label htmlFor={`${id}-status`} className="mb-1.5 block font-outfit text-sm font-medium text-gray-800">Estado</label><select id={`${id}-status`} name="lead-status" value={state.draft.status} onChange={event => edit('status', event.target.value as CommercialLeadStatus)} className={control}>{COMMERCIAL_LEAD_STATUSES.map(status => <option key={status} value={status}>{leadStatusLabel(status)}</option>)}</select></div>
        <div><label htmlFor={`${id}-revenue`} className="mb-1.5 block font-outfit text-sm font-medium text-gray-800">Ingreso (Bs)</label><input ref={revenueInput} id={`${id}-revenue`} name="lead-revenue" type="text" inputMode="decimal" autoComplete="off" maxLength={16} value={state.draft.revenue} onChange={event => edit('revenue', event.target.value)} aria-invalid={!!validation} aria-describedby={`${id}-revenue-hint ${id}-help${validation ? ` ${id}-error` : ''}`} placeholder="Ej. 930,50…" className={control} /></div>
        <div className="min-w-0"><label htmlFor={`${id}-notes`} className="mb-1.5 block font-outfit text-sm font-medium text-gray-800">Nota de seguimiento</label><input id={`${id}-notes`} name="lead-notes" type="text" autoComplete="off" maxLength={1000} value={state.draft.notes} onChange={event => edit('notes', event.target.value)} aria-describedby={`${id}-help`} placeholder="Nota breve…" className={control} /></div>
        <button type="submit" disabled={!dirty || locked} className="min-h-11 rounded-xl bg-[#765f39] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5d4a2c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39] disabled:opacity-50">{state.phase === 'saving' ? 'Guardando…' : 'Guardar cambios'}</button>
      </fieldset>
      <p id={`${id}-revenue-hint`} className="mt-2 font-outfit text-sm leading-5 text-gray-600">Usa coma o punto decimal, hasta dos decimales y sin separadores de miles. Vacío retira el ingreso registrado.</p>
    </form>
    <p id={`${id}-help`} className="font-outfit text-xs leading-5 text-gray-600">Registra solo ingresos verificados por tu equipo. Este formulario no procesa cobros. No copies conversaciones ni datos sensibles en la nota.</p>
    {validation && <p id={`${id}-error`} role="alert" className="font-outfit text-sm text-red-800">{validation}</p>}
    {state.phase === 'saving' && <p role="status" className="font-outfit text-sm text-gray-700">Guardando el contacto y su historial…</p>}
    {state.phase === 'editing' && state.message && <p role="status" className="font-outfit text-sm text-[#3d6b4f]">{state.message}</p>}
    {state.phase === 'editing' && dirty && <div className="space-y-3"><button type="button" className={button} onClick={() => setConfirmDiscard(true)}>Descartar cambios…</button>{confirmDiscard && <div className="space-y-3"><p className="font-outfit text-sm text-gray-700">Se retirarán los cambios locales de este contacto.</p><div className="flex flex-wrap gap-3"><button type="button" className={button} onClick={() => { setValidation(''); setConfirmDiscard(false); dispatch({ type: 'reset' }); }}>Sí, descartar cambios</button><button type="button" className={button} onClick={() => setConfirmDiscard(false)}>Seguir editando</button></div></div>}</div>}
    {state.phase === 'uncertain' && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><p role="alert" className="font-outfit text-sm leading-6 text-amber-950">{state.message}</p><button type="button" onClick={() => void save()} className={button}>Comprobar guardado</button><p className="font-outfit text-xs leading-5 text-amber-900">Los campos quedan bloqueados hasta confirmar la operación. No se creará otro cambio al comprobar.</p></div>}
    {state.phase === 'conflict' && state.incoming && <section aria-labelledby={`${id}-conflict`} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p id={`${id}-conflict`} className="font-outfit font-semibold text-amber-950">Hay una versión más reciente</p><p role="alert" className="font-outfit text-sm leading-6 text-amber-950">{state.message}</p>
      <div className="break-words font-outfit text-sm leading-6 text-amber-950"><p>En el sistema: <strong>{leadStatusLabel(state.incoming.status)}</strong> · Ingreso: {state.incoming.revenue_bs === null ? 'Sin registrar' : `${state.incoming.revenue_bs.toLocaleString('es-BO')} Bs`}</p><p className="whitespace-pre-wrap">Nota actual: {state.incoming.notes || 'Sin nota'}</p></div>
      <div className="flex flex-wrap gap-3"><button type="button" onClick={() => { setValidation(''); setConfirmDiscard(false); dispatch({ type: 'rebase' }); }} className={button}>Revisar mis cambios</button><button type="button" onClick={() => setConfirmDiscard(true)} className={button}>Descartar mis cambios…</button></div>
      {confirmDiscard && <div className="space-y-3"><p className="font-outfit text-sm text-amber-950">Se retirarán tus cambios locales y se cargarán los datos actuales del sistema.</p><div className="flex flex-wrap gap-3"><button type="button" className={button} onClick={() => { setValidation(''); setConfirmDiscard(false); dispatch({ type: 'discard' }); }}>Sí, cargar versión actual</button><button type="button" className={button} onClick={() => setConfirmDiscard(false)}>Seguir revisando</button></div></div>}
    </section>}
  </div>;
}
