'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import type { Guest, RsvpEntry } from '@/lib/types';
import type { RsvpSessionState } from '@/lib/rsvp-contract';
import type { BlockTheme } from './blocks/theme';
import QrCard from './QrCard';
import { emitInvitationAnalytics } from './InvitationAnalytics';

interface Props {
  slug?: string;
  guest?: Guest;
  guestName?: string;
  maxPasses?: number;
  demo?: boolean;
  deadlinePassed?: boolean;
  theme: BlockTheme;
  buttonLabel?: string;
  fieldStyle?: CSSProperties;
  buttonStyle?: CSSProperties;
  noteStyle?: CSSProperties;
}

/** Una implementación para bloques y plantillas. No escribe en demos/editor. */
export default function ConfirmationForm({ slug, guest, guestName, maxPasses, demo, deadlinePassed, theme, buttonLabel = 'Confirmar asistencia', fieldStyle, buttonStyle, noteStyle }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<RsvpSessionState>({ canRespond: !deadlinePassed, guest });
  const [name, setName] = useState(guest?.confirmName || guest?.name || guestName || '');
  const [attending, setAttending] = useState<'yes' | 'no'>(guest?.status === 'declined' ? 'no' : 'yes');
  const [passes, setPasses] = useState(guest?.confirmedPasses || 1);
  const [message, setMessage] = useState(guest?.message || '');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!demo);
  const [error, setError] = useState('');
  const [mustRefresh, setMustRefresh] = useState(false);
  // Se conserva ante error de red: reintentar exactamente la misma operación.
  const pending = useRef<{ requestId: string; body: Record<string, unknown> } | null>(null);
  const inFlight = useRef(false);
  const alive = useRef(true);
  const publicId = guest?.publicId;
  const endpoint = publicId ? '/api/guests/confirm' : '/api/rsvp';
  const currentGuest = session.guest;
  const entry = session.entry;
  const done = !!entry || (!!currentGuest && currentGuest.status !== 'pending');
  const confirmed = entry ? entry.attending === 'yes' : currentGuest?.status === 'confirmed';
  const confirmedPasses = entry?.passes ?? currentGuest?.confirmedPasses ?? currentGuest?.passes ?? 0;
  const cap = currentGuest?.passes ?? maxPasses ?? 20;
  const field: CSSProperties = { background: '#fff', border: `1px solid ${theme.line}`, color: theme.text, borderRadius: 10, padding: '11px 13px', width: '100%', fontSize: 15, ...fieldStyle };

  const applyState = useCallback((value: RsvpSessionState) => {
    setSession(value);
    setName(value.entry?.name || value.guest?.confirmName || value.guest?.name || guestName || '');
    setAttending(value.entry?.attending ?? (value.guest?.status === 'declined' ? 'no' : 'yes'));
    setPasses(value.entry?.passes || value.guest?.confirmedPasses || 1);
    setMessage(value.entry?.message || value.guest?.message || '');
    setEditing(false);
  }, [guestName]);

  const refresh = useCallback(async () => {
    if (demo) { applyState({ canRespond: !deadlinePassed, guest }); setLoading(false); return; }
    if (!slug) { setError('La confirmación no está disponible en esta vista.'); setLoading(false); setMustRefresh(true); return; }
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ slug, ...(publicId ? { publicId } : {}) });
      const response = await fetch(`${endpoint}?${query}`, { cache: 'no-store' });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || 'No pudimos consultar tu respuesta.');
      if (!alive.current) return;
      applyState(value);
      pending.current = null;
      setMustRefresh(false);
    } catch (cause) {
      if (!alive.current) return;
      setError(cause instanceof TypeError ? 'Sin conexión. No se enviaron cambios.' : cause instanceof Error ? cause.message : 'No pudimos cargar el formulario.');
      setMustRefresh(true);
    } finally { if (alive.current) setLoading(false); }
  }, [demo, deadlinePassed, guest, slug, publicId, endpoint, applyState]);

  useEffect(() => { alive.current = true; void refresh(); return () => { alive.current = false; }; }, [refresh]);

  const submit = async () => {
    if (inFlight.current || loading || mustRefresh || !session.canRespond) return;
    if (!name.trim()) { setError('Escribe tu nombre para confirmar.'); return; }
    if (attending === 'yes' && (!Number.isInteger(passes) || passes < 1 || passes > cap)) { setError(`Elige entre 1 y ${cap} personas.`); return; }
    if (demo) {
      const next: RsvpEntry = { id: 'demo', name, attending, passes: attending === 'yes' ? passes : 0, message, at: new Date().toISOString(), revision: 1 };
      applyState({ ...session, entry: next }); return;
    }
    inFlight.current = true;
    setBusy(true); setError('');
    if (!pending.current) {
      const requestId = crypto.randomUUID();
      pending.current = { requestId, body: { slug, publicId, name: name.trim(), confirmName: name.trim(), attending, passes, message, requestId, expectedRevision: entry?.revision ?? currentGuest?.responseRevision ?? 0 } };
    }
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending.current.body) });
      const result = await response.json();
      if (!response.ok) {
        if (response.status < 500) { pending.current = null; setMustRefresh(true); }
        throw new Error(result.error || 'No se pudo guardar tu respuesta.');
      }
      applyState({ ...session, guest: result.guest ?? session.guest, entry: result.entry ?? session.entry });
      pending.current = null;
      emitInvitationAnalytics('rsvp_submit', { attending, passes: attending === 'yes' ? passes : 0, personalized: Boolean(publicId) });
      if (publicId) router.refresh(); // Actualiza también pases y bloques condicionales.
    } catch (cause) {
      setError(cause instanceof TypeError ? 'No pudimos comprobar el resultado. Reintenta sin cambiar los datos: no se duplicará la respuesta.' : cause instanceof Error ? cause.message : 'No se pudo guardar tu respuesta.');
    } finally { inFlight.current = false; setBusy(false); }
  };

  return <div className="mx-auto text-left" style={{ maxWidth: 420 }}>
    {loading && <p role="status" className="py-4 text-center" style={{ color: theme.muted, ...noteStyle }}>Consultando tu confirmación…</p>}
    {done && !editing && <div className="space-y-4 text-center" role="status">
      <div className="rounded-2xl border px-5 py-6" style={{ background: theme.surface, borderColor: theme.line, color: theme.text }}>
        <p className="text-lg">{confirmed ? '¡Asistencia confirmada!' : 'Gracias por avisarnos'}</p>
        <p className="mt-2" style={noteStyle}>{confirmed ? `${confirmedPasses} ${confirmedPasses === 1 ? 'lugar reservado' : 'lugares reservados'}.` : 'Lamentamos que no puedas acompañarnos.'}</p>
      </div>
      {!demo && confirmed && currentGuest?.accessToken && currentGuest.accessCode && <QrCard t={theme} accessToken={currentGuest.accessToken} accessCode={currentGuest.accessCode} guestName={currentGuest.confirmName || currentGuest.name} tableNo={currentGuest.tableNo} passes={confirmedPasses} />}
      {session.canRespond && !loading && <button type="button" className="min-h-11 underline underline-offset-4" onClick={() => setEditing(true)} style={{ color: theme.primary }}>Modificar mi respuesta</button>}
    </div>}
    {!session.canRespond && !loading && <p className="my-4 rounded-xl border p-4" style={{ borderColor: theme.line, color: theme.muted, ...noteStyle }}>{session.closedReason || 'El período de confirmación ya cerró. Contacta a los anfitriones.'}</p>}
    {(!done || editing) && session.canRespond && !loading && <form className="space-y-3" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <fieldset disabled={busy || mustRefresh || !!pending.current} className="space-y-3 disabled:opacity-60">
        <label className="block"><span className="mb-1 block text-sm">Tu nombre</span><input style={field} aria-label="Tu nombre" autoComplete="name" maxLength={publicId ? 120 : 80} value={name} onChange={event => setName(event.target.value)} required /></label>
        <label className="block"><span className="mb-1 block text-sm">¿Asistirás?</span><select style={field} aria-label="¿Asistirás?" value={attending} onChange={event => setAttending(event.target.value as 'yes' | 'no')}><option value="yes">Sí, asistiré</option><option value="no">No podré asistir</option></select></label>
        {attending === 'yes' && <label className="flex items-center justify-between gap-3"><span>N.º de personas</span><input style={{ ...field, width: 90 }} aria-label="Número de personas" type="number" min={1} max={cap} step={1} value={passes} onChange={event => setPasses(Number(event.target.value))} required /></label>}
        <textarea style={{ ...field, minHeight: 75 }} aria-label="Mensaje para los anfitriones" placeholder="Mensaje para los anfitriones (opcional)" maxLength={400} value={message} onChange={event => setMessage(event.target.value)} />
      </fieldset>
      {session.hasUsedPasses && <p className="text-sm" style={noteStyle}>Ya se utilizaron pases. Puedes corregir tus datos, pero no cancelar ni reducir esos cupos.</p>}
      <button type="submit" disabled={busy || mustRefresh} className="ek-cta min-h-11 w-full rounded-xl px-4 py-3 disabled:opacity-50" style={{ background: theme.primary, color: theme.onPrimary, ...buttonStyle }}>{busy ? 'Guardando…' : pending.current ? 'Reintentar la misma respuesta' : done ? 'Guardar cambios' : buttonLabel}</button>
      {editing && !busy && !pending.current && <button type="button" className="min-h-11 w-full text-sm underline" onClick={() => { setEditing(false); void refresh(); }}>Cancelar edición</button>}
    </form>}
    {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {mustRefresh && !loading && <button type="button" onClick={() => void refresh()} className="mt-3 min-h-11 w-full rounded-xl border px-4 text-sm" style={{ borderColor: theme.line, color: theme.text }}>Actualizar mi respuesta</button>}
    {demo && <p className="mt-3 text-center text-xs" style={{ color: theme.muted, ...noteStyle }}>Modo de muestra: no se envía ninguna respuesta.</p>}
    {!demo && !publicId && <p className="mt-4 text-center text-xs" style={{ color: theme.muted, ...noteStyle }}>Podrás modificar esta respuesta desde este navegador hasta la fecha límite. Para otra familia, utiliza otro navegador o solicita un enlace personal.</p>}
  </div>;
}
