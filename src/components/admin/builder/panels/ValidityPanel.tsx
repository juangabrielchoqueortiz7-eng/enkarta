'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { InvitationParsed } from '@/lib/types';
import { addDays, daysBetween, formatValidityDate, invitationValidity, packageDays, parseValidityCommand, validDay, type ValidityCommand, type ValidityFields, type ValiditySnapshot } from '@/lib/invitation-validity';
import ValidityNotice from '../../ValidityNotice';
import { eventDay } from '@/lib/rsvp-contract';

type Fields = ValidityFields & { expires_at: string | null };
interface Props { data: InvitationParsed; onSync?: (fields: Fields) => void; endpoint?: string }
const inputClass = 'mt-1 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-enkarta-gold disabled:opacity-50';
const actionLabels = { activate: 'Cálculo automático activado', extend: 'Ampliación registrada', set_expiry: 'Acuerdo manual actualizado', recalculate: 'Plazo recalculado' };

export default function ValidityPanel({ data, onSync, endpoint = '/api/admin/invitations/validity' }: Props) {
  const [snapshot, setSnapshot] = useState<ValiditySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [days, setDays] = useState('30');
  const [reason, setReason] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [confirmChange, setConfirmChange] = useState(false);
  const [action, setAction] = useState<ValidityCommand['action']>('extend');
  const pending = useRef<ValidityCommand | null>(null);
  const storageKey = `ek-validity-pending:${data.id}`;
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) { pending.current = parseValidityCommand(JSON.parse(stored)); setUncertain(true); setError('Hay un cambio pendiente de verificar de esta sesión.'); }
    } catch { /* No operation is inferred from invalid/unavailable browser storage. */ }
  }, [storageKey]);
  const syncRef = useRef(onSync); syncRef.current = onSync;
  const accept = useCallback((next: ValiditySnapshot) => {
    setSnapshot(previous => previous && previous.validity.revision > next.validity.revision ? previous : next);
    const v = next.validity;
    syncRef.current?.({ expires_at: v.expiresAt, validity_mode: v.mode, validity_extra_days: v.extraDays, validity_revision: v.revision });
  }, []);
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 12000);
    try {
      const res = await fetch(`${endpoint}?id=${encodeURIComponent(data.id)}`, { cache: 'no-store', signal: controller.signal });
      const next = await res.json();
      if (!res.ok) throw new Error(next.error || 'No se pudo consultar la vigencia.');
      if (!signal?.aborted) accept(next);
    } catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : 'No hay conexión.'); }
    finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); if (!signal?.aborted) setLoading(false); }
  }, [data.id, endpoint, accept]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => void load(controller.signal), 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [load, data.validity_revision]);

  const saved = snapshot?.validity;
  const base = packageDays(data.config);
  const unsaved = !!onSync && !!saved && (saved.eventDate !== (data.event_date?.slice(0, 10) || null) || saved.packageDays !== base);
  const preview = saved ? invitationValidity({ ...data, validity_mode: saved.mode, validity_extra_days: saved.extraDays }, undefined, true) : null;
  const amount = Number(days);
  let nextDate: string | null = null;
  if (saved && action === 'extend' && saved.expiresAt && Number.isInteger(amount) && amount >= 1 && amount <= 3650) nextDate = addDays(saved.expiresAt, amount);
  if (saved && action === 'activate' && saved.eventDate && saved.packageDays) {
    const calculated = addDays(saved.eventDate, saved.packageDays);
    nextDate = saved.expiresAt && saved.expiresAt > calculated ? saved.expiresAt : calculated;
  }
  if (action === 'set_expiry') nextDate = validDay(manualDate) ? manualDate : null;
  const validAction = saved && (action === 'set_expiry' ? saved.mode === 'legacy' && (!manualDate || validDay(manualDate)) && nextDate !== saved.expiresAt : !!nextDate);
  const canSave = !busy && !loading && !unsaved && !error && validAction && reason.trim().length >= 3 && confirmChange;

  async function submit() {
    if (!saved || (!pending.current && !canSave)) return;
    pending.current ??= { id: data.id, action, days: action === 'extend' ? amount : null,
      expiresAt: action === 'set_expiry' ? nextDate : null, reason: reason.trim(), expectedRevision: saved.revision, requestId: crypto.randomUUID() };
    try { sessionStorage.setItem(storageKey, JSON.stringify(pending.current)); } catch { /* Retry UUID also stays in memory. */ }
    setBusy(true); setError(''); setNotice('');
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending.current), signal: AbortSignal.timeout(12000) });
      const next = await res.json();
      if (!res.ok) {
        // Definite rejection may start a new command after refresh; uncertain errors keep its UUID.
        if (res.status < 500) { pending.current = null; try { sessionStorage.removeItem(storageKey); } catch {} setUncertain(false); setConfirmChange(false); await load(); }
        throw new Error(next.error || 'No se pudo registrar el cambio.');
      }
      pending.current = null; try { sessionStorage.removeItem(storageKey); } catch {} setUncertain(false); setConfirmChange(false); setReason('');
      accept(next); setAction('extend'); setNotice(next.replayed ? 'La operación ya estaba registrada. No se duplicaron días.' : 'Vigencia guardada. El diseño y las confirmaciones se conservaron.');
    } catch (e) {
      setUncertain(!!pending.current);
      setError(e instanceof Error ? e.message : 'No pudimos verificar el resultado.');
    } finally { setBusy(false); }
  }
  return <section className="space-y-4 border-t border-gray-100 pt-5 font-outfit" aria-label="Vigencia y renovaciones">
    <div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-semibold text-gray-800">Vigencia y renovaciones</h4><p className="mt-1 text-xs leading-relaxed text-gray-500">Plazos del servicio, independientes del diseño.</p></div><button type="button" disabled={loading || busy} onClick={() => void load()} className="shrink-0 rounded-lg border px-2 py-2 text-xs disabled:opacity-40">Actualizar</button></div>
    {loading && !saved && <p className="text-xs text-gray-500" role="status">Consultando vigencia guardada…</p>}
    {saved && <ValidityNotice value={saved} />}
    {unsaved && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900">La fecha o el paquete del editor aún no coincide con el guardado. Guarda los cambios y actualiza esta sección antes de renovar.{saved?.mode === 'automatic' && <p className="mt-1 font-medium">Vista previa del nuevo vencimiento: {formatValidityDate(preview?.expiresAt ?? null)}.</p>}</div>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs leading-relaxed text-red-700">{error}{uncertain && ' No sabemos si el servidor lo guardó. Reintenta la misma operación para verificarla sin duplicar días.'}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
    {uncertain && !error && <p role="status" className="text-xs text-amber-800">Verifica la operación pendiente antes de registrar otra ampliación.</p>}
    {saved && <>
      <fieldset disabled={busy || uncertain} className="space-y-3 rounded-2xl border border-gray-200 bg-[#faf9f6] p-3 disabled:opacity-60">
        <legend className="px-1 text-xs font-semibold text-gray-700">Registrar un acuerdo</legend>
        <label className="block text-xs text-gray-600">Tipo de cambio<select className={inputClass} value={action} onChange={e => { setAction(e.target.value as typeof action); setConfirmChange(false); setManualDate(saved.expiresAt || ''); }}>
          <option value="extend">Ampliar días</option>{saved.mode === 'legacy' && <><option value="activate">Activar cálculo por paquete</option><option value="set_expiry">Ajustar acuerdo manual</option></>}
        </select></label>
        {action === 'extend' && <><div className="grid grid-cols-3 gap-2">{[30, 60, 90].map(n => <button key={n} type="button" aria-pressed={days === String(n)} onClick={() => { setDays(String(n)); setConfirmChange(false); }} className={`rounded-xl border py-2 text-xs ${days === String(n) ? 'border-enkarta-gold bg-white font-semibold text-[#806330]' : 'border-gray-200 bg-white/60 text-gray-600'}`}>+{n} días</button>)}</div>
          <label className="block text-xs text-gray-600">Días de ampliación<input type="number" min={1} max={3650} step={1} className={inputClass} value={days} onChange={e => { setDays(e.target.value); setConfirmChange(false); }} /></label>
          <p className="text-[11px] leading-relaxed text-gray-500">Se suman al vencimiento actual, no a hoy. {saved.mode === 'automatic' ? 'Si cambias el evento, los días adicionales se mantienen.' : 'La fecha acordada sigue siendo manual hasta que actives el cálculo por paquete.'}</p>{!saved.expiresAt && <p className="text-xs text-amber-800">Primero define el vencimiento o activa el cálculo por paquete.</p>}</>}
        {action === 'activate' && <p className="text-xs leading-relaxed text-gray-600">Usará los {saved.packageDays ?? '30/60/90'} días del paquete desde el evento. Si tu fecha acordada es posterior, la diferencia se conserva como días adicionales. Una vigencia sin fecha pasará a tener vencimiento.</p>}
        {action === 'activate' && (!saved.packageDays || !saved.eventDate) && <p className="text-xs text-amber-800">Primero guarda el paquete vigente y la fecha del evento en el editor.</p>}
        {action === 'set_expiry' && <label className="block text-xs text-gray-600">Fecha acordada<input type="date" min={saved.eventDate || undefined} value={manualDate} onChange={e => { setManualDate(e.target.value); setConfirmChange(false); }} className={inputClass} /><span className="mt-1 block text-[11px]">Vacía únicamente si el acuerdo es sin vencimiento.</span></label>}
        <div className="rounded-xl border border-[#e7dcc7] bg-white p-3"><p className="text-[10px] uppercase tracking-wider text-gray-500">Nuevo vencimiento</p><p className="mt-1 text-sm font-semibold text-[#665132]">{nextDate ? formatValidityDate(nextDate) : action === 'set_expiry' && !manualDate ? 'Sin vencimiento' : 'Completa los datos'}</p>
          {nextDate && saved.expiresAt && saved.daysLeft !== null && saved.daysLeft + daysBetween(saved.expiresAt, nextDate) < 0 && <p className="mt-1 text-xs text-red-700">Esta fecha todavía está vencida; el enlace seguirá cerrado.</p>}</div>
        <label className="block text-xs text-gray-600">Motivo o referencia del acuerdo<textarea className={inputClass} rows={2} maxLength={300} value={reason} placeholder="Ej.: ampliación acordada con el cliente" onChange={e => setReason(e.target.value)} /></label>
        <label className="flex items-start gap-2 text-xs leading-relaxed text-gray-600"><input type="checkbox" checked={confirmChange} onChange={e => setConfirmChange(e.target.checked)} className="mt-0.5 accent-enkarta-gold" />Confirmo el nuevo plazo acordado. Registrar esto no realiza ningún cobro.</label>
      </fieldset>
      <button type="button" disabled={busy || (!uncertain && !canSave)} onClick={() => void submit()} className="w-full rounded-xl bg-[#394f43] px-3 py-3 text-xs font-semibold text-white disabled:opacity-40">{busy ? 'Verificando…' : uncertain ? 'Verificar el mismo cambio' : 'Guardar acuerdo de vigencia'}</button>
      <div className="space-y-2">
        <h5 className="text-xs font-semibold text-gray-700">Historial de vigencia</h5>
        <p className="text-[11px] text-gray-500">Últimos 30 movimientos. No se deshacen al restaurar un diseño.</p>
        {snapshot?.history.length ? <ol className="space-y-2">{snapshot.history.map(item => <li key={item.id} className="rounded-xl border border-gray-100 bg-white p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-1"><p className="font-semibold text-gray-700">{actionLabels[item.action]}{item.days ? ` · +${item.days} días` : ''}</p><span className="text-[10px] text-gray-400">{formatValidityDate(eventDay(new Date(item.created_at)))}</span></div>
          <p className="mt-1 break-words leading-relaxed text-gray-500">{item.reason}</p>
          <p className="mt-2 leading-relaxed text-[#557060]">{item.before_expires_at ? formatValidityDate(item.before_expires_at) : 'Sin fecha'} → {item.after_expires_at ? formatValidityDate(item.after_expires_at) : 'Sin fecha'}</p>
        </li>)}</ol> : <p className="rounded-xl border border-dashed p-3 text-xs text-gray-500">Sin movimientos registrados desde la activación de esta función.</p>}
      </div>
    </>}
  </section>;
}
