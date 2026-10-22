'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import type { Guest, InvitationLocale, RsvpEntry } from '@/lib/types';
import { isRsvpAcknowledgement, isRsvpSession, type RsvpSessionState, type RsvpAcknowledgement } from '@/lib/rsvp-contract';
import { InvitationRequestError, invitationJson } from '@/lib/invitation-request';
import type { BlockTheme } from './blocks/theme';
import QrCard from './QrCard';
import { emitInvitationAnalytics } from './InvitationAnalytics';
import { invitationCopy } from '@/lib/invitation-i18n';

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
  locale?: InvitationLocale;
}
interface ResponseCommand {
  slug?: string; publicId?: string; name: string; confirmName: string; attending: 'yes' | 'no'; passes: number;
  message: string; requestId: string; expectedRevision: number;
}

/** Una implementación para bloques y plantillas. No escribe en demos/editor. */
export default function ConfirmationForm({ slug, guest, guestName, maxPasses, demo, deadlinePassed, theme, buttonLabel, fieldStyle, buttonStyle, noteStyle, locale = 'es-BO' }: Props) {
  const router = useRouter();
  const copy = invitationCopy(locale);
  const submitLabel = buttonLabel || copy.confirmAttendance;
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
  const pending = useRef<{ requestId: string; body: ResponseCommand } | null>(null);
  const inFlight = useRef(false);
  const alive = useRef(true);
  const read = useRef<{ controller: AbortController } | null>(null);
  const write = useRef<AbortController | null>(null);
  const scope = JSON.stringify([slug, guest?.publicId, !!demo, locale]);
  const [loadedScope, setLoadedScope] = useState(scope);
  const visible = loadedScope === scope;
  const waiting = loading || !visible;
  const context = useRef({ scope });
  if (context.current.scope !== scope) context.current = { scope };
  const owner = context.current;
  const isCurrent = () => alive.current && context.current === owner;
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
    if (context.current !== owner || !alive.current || inFlight.current) return;
    read.current?.controller.abort();
    const operation = { controller: new AbortController() };
    read.current = operation;
    const current = () => alive.current && context.current === owner && read.current === operation;
    if (demo) { applyState({ canRespond: !deadlinePassed, guest }); setLoading(false); return; }
    if (!slug) { setError(copy.unavailable); setLoading(false); setMustRefresh(true); return; }
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ slug, ...(publicId ? { publicId } : {}) });
      const value = await invitationJson<RsvpSessionState>(`${endpoint}?${query}`, { signal: operation.controller.signal }, (value): value is RsvpSessionState => isRsvpSession(value, publicId), 12000);
      if (!current()) return;
      applyState(value);
      pending.current = null;
      setMustRefresh(false);
    } catch (cause) {
      if (!current()) return;
      setError(cause instanceof TypeError ? copy.offline : cause instanceof InvitationRequestError && cause.status ? cause.message : copy.queryFailed);
      setMustRefresh(true);
    } finally { if (current()) setLoading(false); }
  }, [owner, demo, deadlinePassed, guest, slug, publicId, endpoint, applyState, copy]);

  useEffect(() => {
    alive.current = true;
    inFlight.current = false;
    write.current = null;
    pending.current = null;
    setBusy(false); setError(''); setMustRefresh(false);
    applyState({ canRespond: !deadlinePassed, guest });
    setLoadedScope(scope);
    void refresh();
    return () => { alive.current = false; read.current?.controller.abort(); write.current?.abort(); };
  }, [refresh, applyState, deadlinePassed, guest, scope]);

  const submit = async () => {
    if (!isCurrent() || inFlight.current || waiting || mustRefresh || !session.canRespond) return;
    if (!name.trim()) { setError(copy.nameRequired); return; }
    if (attending === 'yes' && (!Number.isInteger(passes) || passes < 1 || passes > cap)) { setError(copy.passesBetween(cap)); return; }
    if (demo) {
      const next: RsvpEntry = { id: 'demo', name, attending, passes: attending === 'yes' ? passes : 0, message, at: new Date().toISOString(), revision: 1 };
      applyState({ ...session, entry: next }); return;
    }
    inFlight.current = true;
    setBusy(true); setError('');
    const controller = new AbortController();
    write.current = controller;
    if (!pending.current) {
      const requestId = crypto.randomUUID();
      pending.current = { requestId, body: { slug, publicId, name: name.trim(), confirmName: name.trim(), attending, passes, message, requestId, expectedRevision: entry?.revision ?? currentGuest?.responseRevision ?? 0 } };
    }
    try {
      const operation = pending.current;
      const expectedRevision = Number(operation.body.expectedRevision);
      const result = await invitationJson<RsvpAcknowledgement>(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(operation.body), signal: controller.signal }, (value): value is RsvpAcknowledgement => isRsvpAcknowledgement(value, publicId, expectedRevision, entry?.id), 15000);
      if (!isCurrent() || write.current !== controller) return;
      applyState({ ...session, guest: result.guest ?? session.guest, entry: result.entry ?? session.entry });
      pending.current = null;
      emitInvitationAnalytics('rsvp_submit', { attending: operation.body.attending, passes: operation.body.attending === 'yes' ? operation.body.passes : 0, personalized: Boolean(publicId) });
      if (publicId) router.refresh(); // Actualiza también pases y bloques condicionales.
    } catch (cause) {
      if (!isCurrent() || write.current !== controller) return;
      const definitive = cause instanceof InvitationRequestError && cause.status !== undefined && cause.status < 500;
      if (definitive) { pending.current = null; setMustRefresh(true); }
      setError(definitive ? cause.message : copy.uncertain);
    } finally {
      if (isCurrent() && write.current === controller) { write.current = null; inFlight.current = false; setBusy(false); }
    }
  };

  return <div className="mx-auto text-left" style={{ maxWidth: 420 }} aria-busy={waiting || busy}>
    {waiting && <p role="status" className="py-4 text-center" style={{ color: theme.muted, ...noteStyle }}>{copy.loading}</p>}
    {done && !editing && visible && <div className="space-y-4 text-center" role="status">
      <div className="rounded-2xl border px-5 py-6" style={{ background: theme.surface, borderColor: theme.line, color: theme.text }}>
        <p className="text-lg">{confirmed ? copy.confirmed : copy.thanks}</p>
        <p className="mt-2" style={noteStyle}>{confirmed ? copy.placesReserved(confirmedPasses) : copy.cannotAttend}</p>
      </div>
      {!demo && confirmed && currentGuest?.accessToken && currentGuest.accessCode && <QrCard t={theme} accessToken={currentGuest.accessToken} accessCode={currentGuest.accessCode} guestName={currentGuest.confirmName || currentGuest.name} tableNo={currentGuest.tableNo} passes={confirmedPasses} />}
      {session.canRespond && !waiting && <button type="button" className="min-h-11 underline underline-offset-4" onClick={() => { if (isCurrent()) setEditing(true); }} style={{ color: theme.primary }}>{copy.editAnswer}</button>}
    </div>}
    {!session.canRespond && !waiting && <p className="my-4 rounded-xl border p-4" style={{ borderColor: theme.line, color: theme.muted, ...noteStyle }}>{session.closedReason || copy.closed}</p>}
    {(!done || editing) && session.canRespond && !waiting && <form className="space-y-3" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <fieldset disabled={busy || mustRefresh || !!pending.current} className="space-y-3 disabled:opacity-60">
        <label className="block"><span className="mb-1 block text-sm">{copy.yourName}</span><input style={field} aria-label={copy.yourName} autoComplete="name" name="rsvp-name" maxLength={publicId ? 120 : 80} value={name} onChange={event => setName(event.target.value)} required /></label>
        <label className="block"><span className="mb-1 block text-sm">{copy.attendingQuestion}</span><select style={field} aria-label={copy.attendingQuestion} name="rsvp-attending" value={attending} onChange={event => setAttending(event.target.value as 'yes' | 'no')}><option value="yes">{copy.yes}</option><option value="no">{copy.no}</option></select></label>
        {attending === 'yes' && <label className="flex items-center justify-between gap-3"><span>{copy.people}</span><input style={{ ...field, width: 90 }} aria-label={copy.people} name="rsvp-passes" inputMode="numeric" type="number" min={1} max={cap} step={1} value={passes} onChange={event => setPasses(Number(event.target.value))} required /></label>}
        <textarea style={{ ...field, minHeight: 75 }} name="rsvp-message" aria-label={copy.hostMessage} placeholder={copy.hostMessage} maxLength={400} value={message} onChange={event => setMessage(event.target.value)} />
      </fieldset>
      {session.hasUsedPasses && <p className="text-sm" style={noteStyle}>{copy.usedPasses}</p>}
      <button type="submit" disabled={busy || mustRefresh} className="ek-cta min-h-11 w-full rounded-xl px-4 py-3 disabled:opacity-50" style={{ background: theme.primary, color: theme.onPrimary, ...buttonStyle }}>{busy ? copy.saving : pending.current ? copy.retrySame : done ? copy.saveChanges : submitLabel}</button>
      <p className="px-2 text-center text-[11px] leading-relaxed" style={{ color: theme.muted, ...noteStyle }}>
        Tus datos se usan únicamente para gestionar este evento.{' '}
        <a href="/legal/privacidad" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Privacidad</a>
      </p>
      {editing && !busy && !pending.current && <button type="button" className="min-h-11 w-full text-sm underline" onClick={() => { if (isCurrent()) { setEditing(false); void refresh(); } }}>{copy.cancelEdit}</button>}
    </form>}
    {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {mustRefresh && !waiting && <button type="button" onClick={() => void refresh()} className="mt-3 min-h-11 w-full rounded-xl border px-4 text-sm" style={{ borderColor: theme.line, color: theme.text }}>{copy.refresh}</button>}
    {demo && <p className="mt-3 text-center text-xs" style={{ color: theme.muted, ...noteStyle }}>{copy.demo}</p>}
    {!demo && !publicId && <p className="mt-4 text-center text-xs" style={{ color: theme.muted, ...noteStyle }}>{copy.browserNote}</p>}
  </div>;
}
