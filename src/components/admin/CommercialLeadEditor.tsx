'use client';

import { useEffect, useId, useReducer, useRef, useState } from 'react';
import { COMMERCIAL_LEAD_STATUSES, leadStatusLabel, type CommercialLeadStatus } from '@/lib/commercial';
import type { CommercialLead } from '@/lib/commercial-lookup';
import { commercialDraftDirty, commercialEditorReducer, commercialDraftRevenue, createCommercialEditor, prepareCommercialDraftUpdate, saveCommercialLead, type CommercialSaveResult, type CommercialUpdate } from '@/lib/commercial-update';
import type { CommercialPendingEntry } from '@/lib/commercial-pending';
import { createCommercialDraftEntry, type CommercialDraftEntry } from '@/lib/commercial-drafts';

const control = 'min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39] disabled:bg-gray-100 disabled:text-gray-600';
const button = 'min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39] disabled:opacity-50';

export type CommercialEditorRecovery = {
  ready: boolean; entry: CommercialPendingEntry | null; resumed: CommercialPendingEntry | null;
  persist: (reference: string, update: CommercialUpdate) => CommercialPendingEntry | null;
  complete: (entry: CommercialPendingEntry) => boolean;
  resume: (entry: CommercialPendingEntry) => Promise<void>;
};
export type CommercialEditorDraftRecovery = {
  scope: string | null; ready: boolean; entry: CommercialDraftEntry | null; restored: CommercialDraftEntry | null;
  persist: (base: CommercialLead, draft: ReturnType<typeof createCommercialEditor>['draft'], expected: CommercialDraftEntry | null) => CommercialDraftEntry | null;
  clear: (entry: CommercialDraftEntry) => boolean;
  restore: (entry: CommercialDraftEntry) => Promise<void>;
};
const sameDraft = (left: CommercialDraftEntry | null | undefined, right: CommercialDraftEntry | null | undefined) => !!left && !!right && JSON.stringify(left) === JSON.stringify(right);

export default function CommercialLeadEditor({ lead, onSaved, onActivityChange, transport = fetch, recovery, draftRecovery }: { lead: CommercialLead; onSaved: (lead: CommercialLead) => void; onActivityChange?: (id: string, active: boolean) => void; transport?: typeof fetch; recovery?: CommercialEditorRecovery; draftRecovery?: CommercialEditorDraftRecovery }) {
  const [state, dispatch] = useReducer(commercialEditorReducer, lead, createCommercialEditor);
  const [validation, setValidation] = useState(''), [confirmDiscard, setConfirmDiscard] = useState(false);
  const [storageFailure, setStorageFailure] = useState(false);
  const [draftNotice, setDraftNotice] = useState('');
  const id = useId(), busy = useRef(false), mounted = useRef(true), active = useRef<AbortController | null>(null), revenueInput = useRef<HTMLInputElement>(null);
  const prepared = useRef<CommercialUpdate | null>(null), resumed = useRef<string | null>(null);
  const localDraft = useRef<CommercialDraftEntry | null>(null), restoredDraft = useRef<CommercialDraftEntry | null>(null), draftScope = useRef<string | null>(null);
  const conflictOperation = useRef<CommercialPendingEntry | null>(null);
  if (draftRecovery?.scope && draftScope.current !== draftRecovery.scope) { draftScope.current = draftRecovery.scope; localDraft.current = null; restoredDraft.current = null; }
  const dirty = commercialDraftDirty(state.draft, state.base), locked = state.phase !== 'editing';
  const pendingElsewhere = !!recovery?.entry && !state.request;
  const draftElsewhere = !!draftRecovery?.entry && !sameDraft(draftRecovery.entry, localDraft.current);
  useEffect(() => { dispatch({ type: 'receive', lead }); }, [lead]);
  useEffect(() => {
    const entry = recovery?.resumed;
    if (!entry || resumed.current === entry.request.requestId || state.phase !== 'editing' || dirty) return;
    if (entry.reference !== lead.reference || entry.request.id !== lead.id || lead.revision < entry.request.expectedRevision) return;
    resumed.current = entry.request.requestId;
    dispatch({ type: 'resume', request: entry.request });
  }, [recovery?.resumed, state.phase, dirty, lead.id, lead.reference, lead.revision]);
  useEffect(() => {
    const entry = draftRecovery?.restored;
    if (!entry || sameDraft(entry, restoredDraft.current) || recovery?.entry || state.phase !== 'editing' || dirty) return;
    const next = commercialEditorReducer(state, { type: 'restore-draft', entry });
    if (next === state) return;
    restoredDraft.current = entry; localDraft.current = entry;
    setDraftNotice('Cambios recuperados en el editor. Revisa sus valores antes de guardar.');
    dispatch({ type: 'restore-draft', entry });
  }, [draftRecovery?.restored, recovery?.entry, state, dirty]);
  useEffect(() => {
    if (!draftRecovery?.ready || draftRecovery.entry || !localDraft.current) return;
    localDraft.current = null;
    setDraftNotice(dirty && !state.request ? 'La copia local se retiró. Los cambios del editor siguen en memoria; una nueva edición volverá a conservarlos.' : '');
  }, [draftRecovery?.ready, draftRecovery?.entry, dirty, state.request]);
  useEffect(() => { onActivityChange?.(lead.id, dirty || !!state.request || state.phase === 'conflict'); }, [dirty, state.request, state.phase, lead.id, onActivityChange]);
  useEffect(() => () => { onActivityChange?.(lead.id, false); }, [lead.id, onActivityChange]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; active.current?.abort(); }; }, []);
  useEffect(() => {
    if (!dirty && !state.request) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, state.request]);

  const save = async (withoutRecovery = false) => {
    if (busy.current || pendingElsewhere || (draftElsewhere && state.phase !== 'uncertain') || (state.phase !== 'editing' && state.phase !== 'uncertain')) return;
    if (state.phase === 'editing' && prepared.current && JSON.stringify(prepareCommercialDraftUpdate(state.base, state.draft, prepared.current.requestId)) !== JSON.stringify(prepared.current)) prepared.current = null;
    let command = state.phase === 'uncertain' ? state.request : prepared.current;
    if (!command) {
      if (!dirty) return;
      if (commercialDraftRevenue(state.draft.revenue) === undefined) { setValidation('Escribe un importe entre 0 y 1.000.000 Bs, con coma o punto decimal, hasta dos decimales y sin separadores de miles, o deja el campo vacío.'); revenueInput.current?.focus(); return; }
      try { command = prepareCommercialDraftUpdate(state.base, state.draft, crypto.randomUUID()); }
      catch { /* A browser without secure UUID support must not send an unsafe write. */ }
      if (!command) { setValidation('No se pudo preparar el cambio. Conserva tus datos y vuelve a cargar este contacto antes de continuar.'); return; }
    }
    prepared.current = command;
    let durable: CommercialPendingEntry | null = null;
    if (recovery && !withoutRecovery) {
      durable = recovery.ready ? recovery.persist(lead.reference, command) : null;
      if (!durable) {
        setStorageFailure(true); setValidation('No se pudo conservar esta operación en la pestaña. Todavía no se envió este intento. Reintenta o elige continuar sin recuperación local; en ese caso deberás mantener la pestaña abierta hasta comprobar el resultado.'); return;
      }
    }
    if (withoutRecovery && recovery?.entry && JSON.stringify(recovery.entry.request) === JSON.stringify(command)) durable = recovery.entry;
    // Promote the exact unsent copy only after its operation has been journaled.
    // A reload between journals can leave both; only a matching payload may be retired.
    let unsent = localDraft.current;
    if (!unsent && draftRecovery?.entry) {
      const entry = draftRecovery.entry;
      const base = { ...state.base, revision: entry.base.revision, status: entry.base.status, revenue_bs: entry.base.revenueBs, notes: entry.base.notes };
      if (JSON.stringify(prepareCommercialDraftUpdate(base, entry.draft, command.requestId)) === JSON.stringify(command)) unsent = entry;
      else if (!(state.phase === 'uncertain' && state.resumed && entry.base.revision > command.expectedRevision && entry.base.revision <= state.base.revision)) {
        setValidation('Hay otro borrador local de este contacto. Revisa «Cambios sin enviar» antes de comprobar esta operación.'); return;
      }
      // A reviewed draft from a later revision can coexist after interrupted
      // operation cleanup. Preserve it while explicitly checking the old UUID.
    }
    if (unsent && (!draftRecovery?.ready || !draftRecovery.clear(unsent))) {
      const message = 'No se pudo retirar la copia sin enviar. Este intento todavía no se envió. Habilita el almacenamiento y pulsa «Comprobar guardado» para continuar con esta misma operación.';
      setValidation(message);
      if (durable) { dispatch({ type: 'start', request: command }); dispatch({ type: 'result', result: { kind: 'uncertain', message } }); }
      return;
    }
    localDraft.current = null; setDraftNotice('');
    setStorageFailure(false);
    busy.current = true; setValidation(''); dispatch({ type: 'start', request: command });
    const controller = new AbortController(); active.current = controller;
    let result: CommercialSaveResult;
    try { result = await saveCommercialLead(command, state.base.reference, transport, controller.signal); }
    catch { result = { kind: 'uncertain', message: 'No se pudo confirmar el guardado. Pulsa «Comprobar guardado» antes de editar otra vez.' }; }
    finally { active.current = null; busy.current = false; }
    if (!mounted.current) return;
    dispatch({ type: 'result', result });
    if (result.kind !== 'uncertain') {
      prepared.current = null;
      // A recovered operation has no original field-edit mask. Keep its full intent
      // until the operator explicitly reviews it against the current version.
      const needsReview = result.kind === 'conflict' && !!state.resumed && !!draftRecovery;
      const conflictProtected = !needsReview && (result.kind !== 'conflict' || preserveDraft(commercialEditorReducer(commercialEditorReducer(state, { type: 'start', request: command }), { type: 'result', result })));
      if (durable && result.kind === 'conflict') conflictOperation.current = durable;
      if (durable && conflictProtected) {
        if (recovery?.complete(durable)) conflictOperation.current = null;
        else setValidation('El servidor respondió, pero no se pudo retirar la copia local de esta operación. Revisa «Operaciones por comprobar» antes de guardar otro cambio.');
      }
      if (!conflictProtected && !needsReview) setValidation('El contacto cambió en otro dispositivo. No se pudo conservar el nuevo borrador; se mantiene la copia de la operación para recuperarla. Mantén esta pestaña abierta.');
    }
    if (result.kind === 'confirmed') onSaved(result.lead);
  };
  const preserveDraft = (next: ReturnType<typeof createCommercialEditor>) => {
    if (!draftRecovery) return true;
    if (!commercialDraftDirty(next.draft, next.base)) {
      if (localDraft.current && (!draftRecovery.ready || !draftRecovery.clear(localDraft.current))) { setDraftNotice('No se pudo retirar la copia anterior. Revisa los borradores locales antes de cerrar.'); return false; }
      localDraft.current = null; setDraftNotice(''); return true;
    }
    let expected = localDraft.current;
    if (!expected && draftRecovery.entry) {
      const candidate = createCommercialDraftEntry(next.base, next.draft), existing = draftRecovery.entry;
      if (candidate && candidate.id === existing.id && candidate.reference === existing.reference && JSON.stringify(candidate.base) === JSON.stringify(existing.base) && JSON.stringify(candidate.draft) === JSON.stringify(existing.draft)) expected = existing;
    }
    const entry = draftRecovery.ready ? draftRecovery.persist(next.base, next.draft, expected) : null;
    if (entry) { localDraft.current = entry; setDraftNotice('Borrador conservado en esta pestaña. Aún no se envió al servidor.'); }
    else setDraftNotice('Los últimos cambios siguen solo en memoria. No se pudo conservar el borrador; mantén esta pestaña abierta.');
    return !!entry;
  };
  const edit = (field: 'status' | 'revenue' | 'notes', value: string) => {
    if (locked || pendingElsewhere || draftElsewhere) return;
    const action = { type: 'edit' as const, draft: { ...state.draft, [field]: value } };
    prepared.current = null; setStorageFailure(false); setValidation(''); preserveDraft(commercialEditorReducer(state, action)); dispatch(action);
  };
  const discard = (type: 'reset' | 'discard') => {
    if (localDraft.current && !draftElsewhere && (!draftRecovery?.ready || !draftRecovery.clear(localDraft.current))) { setValidation('No se pudo retirar tu copia local. Tus cambios se conservan para volver a intentarlo.'); return; }
    if (conflictOperation.current && !recovery?.complete(conflictOperation.current)) { setValidation('No se pudo retirar la copia de la operación revisada. Tus cambios se conservan para volver a intentarlo.'); return; }
    conflictOperation.current = null;
    localDraft.current = null; prepared.current = null; setDraftNotice(''); setValidation(''); setConfirmDiscard(false); dispatch({ type });
  };
  const rebase = () => {
    const action = { type: 'rebase' as const }, next = commercialEditorReducer(state, action);
    if (!preserveDraft(next)) return;
    if (conflictOperation.current && !recovery?.complete(conflictOperation.current)) { setValidation('Los valores revisados están conservados, pero no se pudo retirar la operación anterior. Vuelve a intentarlo antes de guardar.'); return; }
    conflictOperation.current = null;
    prepared.current = null; setValidation(''); setConfirmDiscard(false); dispatch(action);
  };

  return <div className="min-w-0 space-y-3">
    {pendingElsewhere && recovery?.entry && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><p role="alert" className="font-outfit text-sm leading-6 text-amber-950">Hay una copia de operación pendiente de comprobar para este contacto. Recupérala antes de enviar otro cambio; encontrar sus valores actuales no confirma aquella operación.</p><button type="button" className={button} onClick={() => void recovery.resume(recovery.entry!)}>Recuperar operación pendiente</button></div>}
    {draftElsewhere && !pendingElsewhere && !state.request && draftRecovery?.entry && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><p role="alert" className="font-outfit text-sm leading-6 text-amber-950">Hay un borrador local para este contacto. Recupéralo desde «Cambios sin enviar» o descarta allí su copia antes de editar. Si venció, solo podrás descartarlo.</p></div>}
    <form onSubmit={event => { event.preventDefault(); void save(); }} aria-label={`Seguimiento de ${lead.reference}`}>
      <fieldset disabled={locked || pendingElsewhere || draftElsewhere} className="grid min-w-0 gap-3 lg:grid-cols-[160px_150px_minmax(180px,1fr)_auto] lg:items-end">
        <div><label htmlFor={`${id}-status`} className="mb-1.5 block font-outfit text-sm font-medium text-gray-800">Estado</label><select id={`${id}-status`} name="lead-status" value={state.draft.status} onChange={event => edit('status', event.target.value as CommercialLeadStatus)} className={control}>{COMMERCIAL_LEAD_STATUSES.map(status => <option key={status} value={status}>{leadStatusLabel(status)}</option>)}</select></div>
        <div><label htmlFor={`${id}-revenue`} className="mb-1.5 block font-outfit text-sm font-medium text-gray-800">Ingreso (Bs)</label><input ref={revenueInput} id={`${id}-revenue`} name="lead-revenue" type="text" inputMode="decimal" autoComplete="off" maxLength={16} value={state.draft.revenue} onChange={event => edit('revenue', event.target.value)} aria-invalid={!!validation} aria-describedby={`${id}-revenue-hint ${id}-help${validation ? ` ${id}-error` : ''}`} placeholder="Ej. 930,50…" className={control} /></div>
        <div className="min-w-0"><label htmlFor={`${id}-notes`} className="mb-1.5 block font-outfit text-sm font-medium text-gray-800">Nota de seguimiento</label><input id={`${id}-notes`} name="lead-notes" type="text" autoComplete="off" maxLength={1000} value={state.draft.notes} onChange={event => edit('notes', event.target.value)} aria-describedby={`${id}-help`} placeholder="Nota breve…" className={control} /></div>
        <button type="submit" disabled={!dirty || locked || pendingElsewhere || draftElsewhere} className="min-h-11 rounded-xl bg-[#765f39] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5d4a2c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#765f39] disabled:opacity-50">{state.phase === 'saving' ? 'Guardando…' : 'Guardar cambios'}</button>
      </fieldset>
      <p id={`${id}-revenue-hint`} className="mt-2 font-outfit text-sm leading-5 text-gray-600">Usa coma o punto decimal, hasta dos decimales y sin separadores de miles. Vacío retira el ingreso registrado.</p>
    </form>
    <p id={`${id}-help`} className="font-outfit text-xs leading-5 text-gray-600">Registra solo ingresos verificados por tu equipo. Este formulario no procesa cobros. No copies conversaciones ni datos sensibles en la nota.</p>
    {validation && <p id={`${id}-error`} role="alert" className="font-outfit text-sm text-red-800">{validation}</p>}
    {storageFailure && !pendingElsewhere && <button type="button" className={button} onClick={() => void save(true)}>{state.phase === 'uncertain' ? 'Comprobar sin recuperación local' : 'Guardar sin recuperación local'}</button>}
    {draftRecovery && <p className="font-outfit text-xs leading-5 text-gray-600">Los borradores recuperables pertenecen a esta pestaña y sesión, durante 24 horas. Guardar requiere tu confirmación; cerrar la pestaña o cambiar de sesión puede perder la copia.</p>}
    {draftNotice && <p role="status" className="font-outfit text-sm leading-6 text-gray-700">{draftNotice}</p>}
    {state.phase === 'saving' && <p role="status" className="font-outfit text-sm text-gray-700">Guardando el contacto y su historial… Si la espera se agota, podrás comprobar esta misma operación.</p>}
    {state.phase === 'editing' && state.message && <p role="status" className="font-outfit text-sm text-[#3d6b4f]">{state.message}</p>}
    {state.phase === 'editing' && dirty && <div className="space-y-3"><button type="button" className={button} onClick={() => setConfirmDiscard(true)}>Descartar cambios…</button>{confirmDiscard && <div className="space-y-3"><p className="font-outfit text-sm text-gray-700">Se retirarán los cambios locales de este contacto.</p><div className="flex flex-wrap gap-3"><button type="button" className={button} onClick={() => discard('reset')}>Sí, descartar cambios</button><button type="button" className={button} onClick={() => setConfirmDiscard(false)}>Seguir editando</button></div></div>}</div>}
    {state.phase === 'uncertain' && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><p role="alert" className="font-outfit text-sm leading-6 text-amber-950">{state.message}</p><button type="button" onClick={() => void save()} className={button}>Comprobar guardado</button><p className="font-outfit text-xs leading-5 text-amber-900">Los campos quedan bloqueados hasta confirmar la operación. No se creará otro cambio al comprobar.</p></div>}
    {state.phase === 'conflict' && state.incoming && <section aria-labelledby={`${id}-conflict`} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p id={`${id}-conflict`} className="font-outfit font-semibold text-amber-950">Hay una versión más reciente</p><p role="alert" className="font-outfit text-sm leading-6 text-amber-950">{state.message}</p>
      <div className="break-words font-outfit text-sm leading-6 text-amber-950"><p>En el sistema: <strong>{leadStatusLabel(state.incoming.status)}</strong> · Ingreso: {state.incoming.revenue_bs === null ? 'Sin registrar' : `${state.incoming.revenue_bs.toLocaleString('es-BO')} Bs`}</p><p className="whitespace-pre-wrap">Nota actual: {state.incoming.notes || 'Sin nota'}</p></div>
      {state.resumed && <p className="font-outfit text-sm leading-6 text-amber-950">La solicitud recuperada contiene estado, ingreso y nota completos. Compara sus valores con la versión actual antes de preparar otro guardado.</p>}
      <div className="flex flex-wrap gap-3"><button type="button" onClick={rebase} className={button}>{state.resumed ? 'Revisar valores recuperados' : 'Revisar mis cambios'}</button><button type="button" onClick={() => setConfirmDiscard(true)} className={button}>Descartar mis cambios…</button></div>
      {confirmDiscard && <div className="space-y-3"><p className="font-outfit text-sm text-amber-950">Se retirarán tus cambios locales y se cargarán los datos actuales del sistema.</p><div className="flex flex-wrap gap-3"><button type="button" className={button} onClick={() => discard('discard')}>Sí, cargar versión actual</button><button type="button" className={button} onClick={() => setConfirmDiscard(false)}>Seguir revisando</button></div></div>}
    </section>}
  </div>;
}
