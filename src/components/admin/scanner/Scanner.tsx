'use client';

// Escáner de acceso para la puerta. Lee el QR con la cámara (html5-qrcode) o
// acepta el ID de acceso escrito a mano (ENK-XXXX). Carga el grupo del invitado
// y permite marcar ingreso/salida individual por persona. Re-escanear conserva
// el estado de quienes ya ingresaron.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Attendee } from '@/lib/types';
import { scannerStatus } from '@/lib/scanner-status';
import { qrLookup, validateQrImage } from '@/lib/scanner-input';
import { parseScannerGroup, recordScan, scanFailureIsDefinitive, type ScannerGroup } from '@/lib/scanner-contract';
import { clearScanRecovery, discardUnreadableScan, restoreScanRecovery, saveScanRecovery, scanRecoveryKey, scanRecoveryPerson, ScanRecoveryWriteError, type ScanRecovery, type ScanRecoveryScope, type ScanRecoveryStorage } from '@/lib/scan-recovery';
import ReceptionSearch from './ReceptionSearch';
import CheckinHistory from './CheckinHistory';
import styles from '../operations/Operations.module.css';

interface ScannerProps { recoveryScope: ScanRecoveryScope; invitationId?: string; tableSearch?: boolean; transport?: typeof fetch; storage?: ScanRecoveryStorage }

export default function Scanner(props: ScannerProps) {
  return <ScannerSurface key={scanRecoveryKey(props.recoveryScope)} {...props} />;
}

function ScannerSurface({ recoveryScope: suppliedScope, invitationId, tableSearch = false, transport = fetch, storage }: ScannerProps) {
  const { role, sessionKey, invitationId: boundInvitationId } = suppliedScope;
  const recoveryScope = useMemo(() => ({ role, sessionKey, invitationId: boundInvitationId }), [role, sessionKey, boundInvitationId]);
  const scope = role === 'door' ? 'door' : 'host';
  const [group, setGroup] = useState<ScannerGroup | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingScan, setPendingScan] = useState<ScanRecovery | null>(null);
  const [ready, setReady] = useState(false), [persisted, setPersisted] = useState(false), [unreadable, setUnreadable] = useState(false);
  const [discardAcknowledged, setDiscardAcknowledged] = useState(false);
  const [manual, setManual] = useState('');
  const [scanning, setScanning] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const startingRef = useRef(false);
  const [readingFile, setReadingFile] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchingRef = useRef(false);
  const fileReadingRef = useRef(false);
  const mounted = useRef(true);
  const cameraGeneration = useRef(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mustRefresh, setMustRefresh] = useState(false);
  const [syncedAt, setSyncedAt] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const sound = useRef<AudioContext | null>(null);
  const activeGroup = useRef(false);
  const busyRef = useRef(false);
  const loadingRef = useRef(false);
  const groupRequest = useRef<AbortController | null>(null);
  const lastParams = useRef('');
  const loadedGroupId = useRef<string>();
  const pending = useRef<ScanRecovery | null>(null), storageBacked = useRef(false), storedRaw = useRef<string | null>(null);
  const needsLookup = useRef(false), reloadRecovery = useRef(() => {});
  const remember = useCallback((value: ScanRecovery | null) => { pending.current = value; setPendingScan(value); setDiscardAcknowledged(false); }, []);
  const recoveryBlocked = !ready || unreadable;
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const lastScan = useRef<{ value: string; at: number }>({ value: '', at: 0 });
  useEffect(() => {
    const restore = () => {
      if (busyRef.current || fileReadingRef.current || (pending.current && !storageBacked.current)) return;
      try {
        const raw = (storage ?? sessionStorage).getItem(scanRecoveryKey(recoveryScope));
        storedRaw.current = raw;
        const recovered = restoreScanRecovery(raw, recoveryScope);
        // Absence is not an acknowledgement of an uncertain server write.
        if (raw === null && pending.current) { storageBacked.current = false; setPersisted(false); return; }
        setUnreadable(raw !== null && !recovered);
        if (raw !== null && !recovered) { setGroup(null); setMustRefresh(true); activeGroup.current = false; }
        if (recovered && JSON.stringify(recovered) !== JSON.stringify(pending.current)) {
          remember(recovered); needsLookup.current = true; setGroup(null); setMustRefresh(true);
          lastParams.current = `guestId=${encodeURIComponent(recovered.guestId)}`; loadedGroupId.current = recovered.guestId; activeGroup.current = true;
        }
        storageBacked.current = !!recovered; setPersisted(!!recovered);
      } catch {
        if (!pending.current) setUnreadable(true);
        setPersisted(false); setError('No pudimos leer el reintento de esta pestaña. Vuelve a comprobarlo antes de registrar movimientos.');
      }
      finally { setReady(true); }
    };
    reloadRecovery.current = restore; restore(); window.addEventListener('focus', restore);
    return () => window.removeEventListener('focus', restore);
  }, [recoveryScope, storage, remember]);
  const signal = useCallback((warning = false) => {
    const ctx = sound.current;
    if (!ctx || ctx.state !== 'running') return;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.frequency.value = warning ? 220 : 740; gain.gain.value = 0.06;
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + (warning ? 0.25 : 0.12));
  }, []);
  const toggleSound = async () => {
    if (soundEnabled) { await sound.current?.close(); sound.current = null; setSoundEnabled(false); return; }
    try { const ctx = new AudioContext(); sound.current = ctx; await ctx.resume(); setSoundEnabled(true); signal(); }
    catch { setError('Este navegador no permite activar sonido. Las alertas visuales siguen disponibles.'); }
  };

  // ── Cargar un grupo por token (QR) o código (manual) ──
  const loadGroup = useCallback(async (params: string, { background = false, preserveNotice = false }: { background?: boolean; preserveNotice?: boolean } = {}) => {
    if (!ready || unreadable || busyRef.current || (pending.current && params !== lastParams.current) || (background && (loadingRef.current || pending.current || fileReadingRef.current))) return;
    groupRequest.current?.abort();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('timeout'), 12000);
    groupRequest.current = controller;
    if (params !== lastParams.current) loadedGroupId.current = undefined;
    const expectedGuestId = pending.current?.guestId || new URLSearchParams(params).get('guestId') || loadedGroupId.current;
    lastParams.current = params;
    if (!background && !pending.current) { setGroup(null); activeGroup.current = false; }
    loadingRef.current = true;
    setLoading(true);
    setError('');
    if (!preserveNotice) setNotice('');
    try {
      const res = await transport(`/api/checkin?${params}&scope=${scope}`, { cache: 'no-store', headers: { 'X-Enkarta-Scanner-Session': recoveryScope.sessionKey }, signal: controller.signal });
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (!res.ok) { setError(typeof data?.error === 'string' ? data.error : 'No se pudo cargar'); setMustRefresh(true); if (res.status < 500 && !pending.current) { setGroup(null); activeGroup.current = false; } if (!background) signal(true); return; }
      const parsed = parseScannerGroup(data, expectedGuestId, pending.current?.invitationId || recoveryScope.invitationId);
      setGroup(parsed);
      loadedGroupId.current = parsed.guest.id;
      activeGroup.current = true;
      if (!background) signal(scannerStatus(parsed.attendees).exhausted);
      setSyncedAt(new Date().toLocaleTimeString('es-BO'));
      setMustRefresh(false);
    } catch (failure) { if (!controller.signal.aborted || controller.signal.reason === 'timeout') { setError(failure instanceof Error && failure.message.startsWith('No pudimos verificar') ? failure.message : 'Sin conexión o respuesta incompleta. Consulta de nuevo el grupo antes de registrar movimientos.'); setMustRefresh(true); } }
    finally { clearTimeout(timeout); if (groupRequest.current === controller) { setLoading(false); loadingRef.current = false; } }
  }, [scope, signal, transport, ready, unreadable, recoveryScope]);

  useEffect(() => {
    if (ready && !unreadable && pendingScan && needsLookup.current) {
      needsLookup.current = false;
      void loadGroup(`guestId=${encodeURIComponent(pendingScan.guestId)}`);
    }
  }, [ready, unreadable, pendingScan, loadGroup]);

  useEffect(() => {
    if (!group?.guest.id) return;
    const poll = () => { if (document.visibilityState === 'visible' && navigator.onLine && lastParams.current) void loadGroup(lastParams.current, { background: true, preserveNotice: true }); };
    const timer = setInterval(poll, 8000);
    window.addEventListener('online', poll);
    return () => { clearInterval(timer); window.removeEventListener('online', poll); };
  }, [group?.guest.id, loadGroup]);

  const onDetected = useCallback((text: string) => {
    if (recoveryBlocked || busyRef.current || loadingRef.current || pending.current || activeGroup.current || fileReadingRef.current || searchingRef.current) return;
    const now = Date.now();
    // Anti-rebote: ignora el mismo QR repetido en <2.5s.
    if (text === lastScan.current.value && now - lastScan.current.at < 2500) return;
    lastScan.current = { value: text, at: now };
    try { void loadGroup(qrLookup(text)); } catch (failure) { setError((failure as Error).message); signal(true); }
  }, [loadGroup, signal, recoveryBlocked]);

  // ── Cámara (html5-qrcode, import dinámico para que no entre en SSR) ──
  const startCamera = useCallback(async () => {
    if (recoveryBlocked || startingRef.current || scannerRef.current || fileReadingRef.current || pending.current) return;
    const generation = ++cameraGeneration.current;
    startingRef.current = true; setStartingCamera(true);
    setError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!mounted.current || generation !== cameraGeneration.current) return;
      const el = document.getElementById('enkarta-qr-reader');
      if (!el) return;
      const html5 = new Html5Qrcode('enkarta-qr-reader');
      scannerRef.current = { stop: () => html5.stop(), clear: () => html5.clear() };
      await html5.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decoded) => onDetected(decoded),
        () => {},
      );
      if (!mounted.current || generation !== cameraGeneration.current) { await html5.stop(); html5.clear(); scannerRef.current = null; return; }
      setScanning(true);
    } catch {
      setError('No se pudo acceder a la cámara. Usa el código manual.');
      try { scannerRef.current?.clear(); } catch { /* failed camera initialization */ }
      scannerRef.current = null;
      setScanning(false);
    } finally { startingRef.current = false; if (mounted.current) setStartingCamera(false); }
  }, [onDetected, recoveryBlocked]);

  const stopCamera = useCallback(async () => {
    cameraGeneration.current++;
    try { await scannerRef.current?.stop(); scannerRef.current?.clear(); } catch { /* ya detenida */ }
    scannerRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const hidden = () => { if (document.visibilityState === 'hidden') void stopCamera(); };
    document.addEventListener('visibilitychange', hidden);
    return () => { mounted.current = false; document.removeEventListener('visibilitychange', hidden); groupRequest.current?.abort(); void stopCamera(); void sound.current?.close(); };
  }, [stopCamera]);

  useEffect(() => {
    if (!pendingScan || persisted) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [pendingScan, persisted]);

  const readQrFile = async (file?: File) => {
    if (recoveryBlocked || !file || fileReadingRef.current || busyRef.current || startingRef.current || pending.current) return;
    // A failed new image must never leave the previous family's entry buttons active.
    groupRequest.current?.abort(); lastParams.current = ''; activeGroup.current = false;
    setGroup(null); setMustRefresh(true);
    try { validateQrImage(file); } catch (failure) { setError((failure as Error).message); signal(true); return; }
    fileReadingRef.current = true; setReadingFile(true); setError('');
    let reader: import('html5-qrcode').Html5Qrcode | undefined;
    try {
      await stopCamera();
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!mounted.current) return;
      reader = new Html5Qrcode('enkarta-qr-file-reader');
      const decoded = await reader.scanFile(file, false);
      if (mounted.current) await loadGroup(qrLookup(decoded));
    } catch (failure) { if (mounted.current) { setError(failure instanceof Error && failure.message.includes('Enkarta') ? failure.message : 'No pudimos leer el QR de la imagen. Recorta el pase o utiliza su ID de acceso.'); signal(true); } }
    finally { try { reader?.clear(); } catch { /* reader already cleared */ } fileReadingRef.current = false; if (mounted.current) setReadingFile(false); }
  };
  useEffect(() => {
    const offline = () => { setMustRefresh(true); setError('Sin conexión. No se registrarán movimientos hasta actualizar el grupo.'); };
    window.addEventListener('offline', offline);
    return () => window.removeEventListener('offline', offline);
  }, []);

  const finishAttempt = (attempt: ScanRecovery) => {
    if (storageBacked.current) {
      try {
        if (!clearScanRecovery(storage ?? sessionStorage, recoveryScope, attempt)) {
          setError('El reintento guardado cambió. No se retiró ningún movimiento; vuelve a leer la recuperación.'); return false;
        }
      } catch { setError('El resultado se comprobó, pero no pudimos retirar su reintento local. Puedes comprobarlo otra vez sin duplicarlo.'); return false; }
    }
    remember(null); storageBacked.current = false; setPersisted(false); return true;
  };

  // The original request identity survives reload. Restoration never submits a POST.
  const submitAttempt = async (attempt: ScanRecovery, recovering: boolean) => {
    if (recoveryBlocked || busyRef.current || loadingRef.current || fileReadingRef.current || searchingRef.current) return;
    if (!pending.current || pending.current.operation.requestId !== attempt.operation.requestId) return;
    busyRef.current = true; setBusyId(attempt.operation.attendeeId); setError(''); setNotice('');
    let confirmed = false;
    try {
      const receipt = await recordScan(attempt.operation, scanRecoveryPerson(attempt), scope, transport,
        { sessionKey: recoveryScope.sessionKey, invitationId: attempt.invitationId });
      if (!mounted.current) return;
      setGroup(g => g && g.invitationId === attempt.invitationId && g.guest.id === attempt.guestId
        ? { ...g, attendees: g.attendees.map(a => a.id === receipt.attendee.id && a.revision <= receipt.attendee.revision ? receipt.attendee : a) } : g);
      if (!finishAttempt(attempt)) return;
      confirmed = true;
      if (recovering) setMustRefresh(true);
      setSyncedAt(new Date().toLocaleTimeString('es-BO'));
      setNotice(receipt.changedLater ? 'Movimiento recuperado. Hubo otro movimiento posterior; se muestra el estado actual del pase.' : receipt.replayed ? 'Movimiento comprobado. Ya estaba registrado; no se volvió a contar.' : attempt.operation.action === 'in' ? 'Ingreso registrado.' : 'Salida registrada.');
      signal(receipt.changedLater);
    } catch (failure) {
      if (!mounted.current) return;
      setError(failure instanceof Error ? failure.message : 'No pudimos comprobar el movimiento.'); signal(true);
      if (scanFailureIsDefinitive(failure, recovering)) { finishAttempt(attempt); setMustRefresh(true); }
    } finally { busyRef.current = false; if (mounted.current) setBusyId(null); }
    if (confirmed && recovering && mounted.current) void loadGroup(`guestId=${encodeURIComponent(attempt.guestId)}`, { preserveNotice: true });
  };

  const mark = async (att: Attendee, action: 'in' | 'out') => {
    if (recoveryBlocked || pending.current || busyRef.current || loadingRef.current || mustRefresh || fileReadingRef.current || searchingRef.current || !group) return;
    const attempt: ScanRecovery = { invitationId: group.invitationId, guestId: att.guestId, seatNo: att.seatNo,
      operation: { attendeeId: att.id, action, expectedRevision: att.revision, requestId: crypto.randomUUID() } };
    let stored = false;
    try {
      if (!saveScanRecovery(storage ?? sessionStorage, recoveryScope, attempt)) { reloadRecovery.current(); setError('Hay otro reintento guardado. Compruébalo antes de registrar un movimiento nuevo.'); return; }
      stored = true;
    } catch (failure) {
      if (!(failure instanceof ScanRecoveryWriteError)) { setUnreadable(true); setError('No pudimos consultar el reintento guardado. Vuelve a leerlo antes de registrar movimientos.'); return; }
    }
    remember(attempt); storageBacked.current = stored; setPersisted(stored);
    await submitAttempt(attempt, false);
  };

  const discardPending = () => {
    if (busyRef.current || loadingRef.current || !discardAcknowledged || (!pending.current && !unreadable)) return;
    if (pending.current) { if (!finishAttempt(pending.current)) return; }
    else {
      try { if (!discardUnreadableScan(storage ?? sessionStorage, recoveryScope, storedRaw.current)) { setError('El reintento cambió. Vuelve a leerlo antes de retirarlo.'); return; } }
      catch { setError('No pudimos retirar el reintento local. Vuelve a leerlo cuando el navegador permita acceder.'); return; }
    }
    setUnreadable(false); setDiscardAcknowledged(false); setMustRefresh(true);
    setNotice('Reintento local retirado. Consulta el grupo antes de registrar otro movimiento.'); setError('');
  };

  const status = group ? scannerStatus(group.attendees) : null;

  return (
    <div className={`${styles.surface} max-w-md mx-auto p-4 space-y-4`}>
      <h1 className="font-playfair text-2xl text-gray-900 text-center">Control de acceso</h1>
      <button type="button" aria-pressed={soundEnabled} onClick={() => void toggleSound()} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white text-sm">{soundEnabled ? 'Sonidos activados · desactivar' : 'Activar sonidos de recepción'}</button>

      {/* Cámara */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div id="enkarta-qr-reader" className="w-full" style={{ minHeight: scanning ? 260 : 0 }} />
        <div className="p-3 flex gap-2">
          {!scanning ? (
            <button type="button" disabled={recoveryBlocked || startingCamera || readingFile || searching || loading || !!group || !!busyId || !!pendingScan} onClick={startCamera} className="flex min-h-11 flex-1 items-center justify-center gap-2 py-2.5 rounded-xl bg-[#516749] text-white font-outfit font-medium text-sm hover:bg-[#40523a] disabled:opacity-50"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M4 8V4h4m8 0h4v4m0 8v4h-4M8 20H4v-4M4 12h16" /></svg>{startingCamera ? 'Iniciando cámara…' : 'Escanear QR'}</button>
          ) : (
            <button type="button" onClick={stopCamera} className="min-h-11 flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-outfit text-sm hover:bg-gray-50">Detener cámara</button>
          )}
        </div>
      </div>
      <label className={`block min-h-11 rounded-xl border border-gray-200 bg-white p-3 text-center text-sm focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-[#516749] ${readingFile || startingCamera || busyId || pendingScan ? 'opacity-50' : 'cursor-pointer hover:bg-gray-50'}`}>{readingFile ? 'Leyendo QR de la imagen…' : 'Leer QR desde una foto'}<input name="qr-image" aria-label="Imagen del pase QR" type="file" accept="image/png,image/jpeg,image/webp" disabled={recoveryBlocked || readingFile || startingCamera || !!busyId || searching || !!pendingScan} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void readQrFile(file); }} className="sr-only" /></label>
      <p className="text-center text-xs text-gray-500">PNG, JPG o WebP · máximo 10 MB. La imagen se lee en este dispositivo; validar el acceso requiere conexión.</p>
      <div id="enkarta-qr-file-reader" aria-hidden="true" className="h-0 overflow-hidden" />

      {/* Código manual */}
      {!ready && <p role="status" className="text-center text-sm text-gray-600">Consultando si hay un movimiento por recuperar…</p>}
      {unreadable && <section className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><h2 className="font-semibold">Reintento local no disponible</h2><p>No pudimos leer un movimiento válido para este evento y sesión. No se enviará una operación desconocida.</p><button type="button" onClick={() => reloadRecovery.current()} className="min-h-11 rounded-xl border border-amber-700 px-3 hover:bg-amber-100">Volver a leer el reintento</button><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={discardAcknowledged} onChange={event => setDiscardAcknowledged(event.target.checked)} className="h-4 w-4 accent-[#516749]" />Entiendo que retirarlo no cancela movimientos del servidor.</label><button type="button" disabled={!discardAcknowledged || !!busyId || loading} onClick={discardPending} className="min-h-11 rounded-xl border border-amber-700 px-3 disabled:opacity-50">Retirar reintento ilegible</button></section>}
      <form onSubmit={e => { e.preventDefault(); if (!recoveryBlocked && manual.trim() && !busyId && !readingFile && !searching && !pending.current) loadGroup(`code=${encodeURIComponent(manual.trim())}`); }} className="flex gap-2">
        <input aria-label="ID de acceso" name="access-code" disabled={recoveryBlocked || !!pendingScan || !!busyId} autoComplete="off" spellCheck={false} maxLength={80} value={manual} onChange={e => setManual(e.target.value.toUpperCase())} placeholder="ID de acceso (ENK-XXXX)…" className="min-h-11 min-w-0 flex-1 px-3 py-2.5 text-sm rounded-xl border border-gray-200 font-mono uppercase" />
        <button type="submit" disabled={recoveryBlocked || !!busyId || readingFile || loading || searching || !!pendingScan} className="min-h-11 px-4 py-2.5 rounded-xl bg-gray-800 text-white font-outfit text-sm hover:bg-gray-700 disabled:opacity-50">Buscar</button>
      </form>

      {pendingScan && <section aria-labelledby="pending-scan-title" aria-busy={!!busyId} className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <h2 id="pending-scan-title" className="font-semibold">{busyId ? 'Comprobando movimiento…' : 'Movimiento por comprobar'}</h2>
        <p className="break-words">{pendingScan.operation.action === 'in' ? 'Ingreso' : 'Salida'} de {group?.attendees.find(person => person.id === pendingScan.operation.attendeeId)?.label || `Persona ${pendingScan.seatNo}`}. El servidor puede haberlo registrado. Comprueba el resultado antes de atender otro pase.</p>
        <button type="button" disabled={recoveryBlocked || !!busyId || loading} onClick={() => void submitAttempt(pendingScan, true)} className="min-h-11 w-full rounded-xl bg-gray-800 px-3 py-2 text-white hover:bg-gray-700 disabled:opacity-50">{busyId ? 'Comprobando…' : 'Comprobar el mismo movimiento'}</button>
        <p className="text-xs leading-relaxed">{persisted ? 'Puedes recargar y recuperar este movimiento en esta pestaña y sesión. Comprobarlo conserva su identificador y no lo vuelve a contar.' : 'El navegador no pudo conservar el reintento. Mantén esta pantalla abierta hasta comprobarlo; una recarga puede perderlo.'}</p>
        <details><summary className="flex min-h-11 cursor-pointer items-center underline underline-offset-4">Si no puedes recuperar el resultado</summary><p className="mt-2 text-xs leading-relaxed">Verifica el acceso con el responsable de recepción. Retirar el reintento solo lo elimina de esta pantalla; después debes consultar el grupo.</p><label className="mt-2 flex min-h-11 cursor-pointer items-start gap-2 py-2 text-xs leading-relaxed"><input type="checkbox" name="discard-scan-acknowledged" checked={discardAcknowledged} disabled={!!busyId || loading} onChange={event => setDiscardAcknowledged(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#516749]" />Entiendo que retirar el reintento no cancela ni revierte movimientos del servidor.</label><button type="button" disabled={!!busyId || loading || !discardAcknowledged} onClick={discardPending} className="mt-2 min-h-11 w-full rounded-xl border border-amber-700 px-3 py-2 hover:bg-amber-100 disabled:opacity-50">Retirar reintento local</button></details>
      </section>}
      {error && <div role="alert" className="p-4 rounded-xl bg-red-50 border-2 border-red-300 text-red-800 text-sm font-outfit text-center"><strong className="block">No registrar otro movimiento</strong>{error}</div>}
      <p role="status" aria-atomic="true" className="text-center text-sm text-[#3d6b4f]">{notice}</p>
      {loading && <p role="status" className="text-center text-sm text-gray-500">Consultando el acceso…</p>}
      {!!lastParams.current && !busyId && <button type="button" disabled={recoveryBlocked || readingFile || loading || searching} onClick={() => void loadGroup(lastParams.current)} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white text-sm disabled:opacity-50">{pendingScan ? 'Consultar estado sin descartar el reintento' : 'Actualizar grupo desde el servidor'}</button>}

      {/* Grupo cargado */}
      {invitationId && <ReceptionSearch invitationId={invitationId} scope={scope} tables={tableSearch} transport={transport} disabled={recoveryBlocked || !!busyId || loading || readingFile || startingCamera || !!pending.current}
        busyChanged={value => { searchingRef.current = value; setSearching(value); }} beforeSearch={async () => { groupRequest.current?.abort(); setGroup(null); setMustRefresh(true); await stopCamera(); groupRequest.current?.abort(); lastParams.current = ''; activeGroup.current = false; }}
        selectGuest={id => { void loadGroup(`guestId=${encodeURIComponent(id)}`); }} />}

      {group && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {status && <div role="status" aria-live="polite" className={`p-4 text-sm ${pendingScan || mustRefresh || status.exhausted ? 'bg-amber-100 text-amber-950' : 'bg-emerald-50 text-emerald-900'}`}><strong className="block text-base">{pendingScan ? 'Hay un movimiento por comprobar' : mustRefresh ? 'Consulta el grupo antes de continuar' : status.title}</strong><p className="mt-1 text-xs">{pendingScan || mustRefresh ? `Último estado consultado: ${status.inside} de ${group.attendees.length} dentro. Los movimientos están bloqueados hasta verificar el acceso.` : status.detail}</p></div>}
          <div className="px-5 py-4 border-b border-gray-100" style={{ background: '#faf7f2' }}>
            <p className="break-words font-playfair text-lg text-gray-900">{group.guest.name}</p>
            <p className="mt-1 text-[11px] text-gray-500 font-outfit">Última lectura: {syncedAt} · {pendingScan ? 'actualización automática pausada' : 'actualización cada 8 s'}</p>
            <div className="flex items-center gap-3 mt-1 text-xs font-outfit text-gray-500">
              {group.guest.tableNo && <span>Mesa {group.guest.tableNo}</span>}
              <span className="font-mono">{group.guest.accessCode}</span>
              <span className="ml-auto font-medium" style={{ color: '#3d6b4f' }}>{status?.inside}/{group.attendees.length} dentro</span>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {group.attendees.length === 0 && <p className="px-5 py-4 text-sm text-gray-600">Este grupo no tiene cupos disponibles para registrar. Consulta al organizador.</p>}
            {group.attendees.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-playfair font-bold ${a.state === 'in' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-outfit text-gray-700">{a.label || `Persona ${a.seatNo}`}</p>
                  <p className="text-xs font-outfit" style={{ color: a.state === 'in' ? '#3d6b4f' : '#6b7280' }}>
                    {a.state === 'in' ? '● Dentro' : '○ Afuera'}
                  </p>
                </div>
                {a.state === 'in' ? (
                  <button type="button" aria-label={`Marcar salida de ${a.label || `Persona ${a.seatNo}`}`} onClick={() => mark(a, 'out')} disabled={recoveryBlocked || readingFile || loading || searching || !!busyId || mustRefresh || !!pendingScan} className="min-h-11 shrink-0 px-3 py-1.5 rounded-lg text-sm font-outfit border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50">
                    Marcar salida
                  </button>
                ) : (
                  <button type="button" aria-label={`Registrar ingreso de ${a.label || `Persona ${a.seatNo}`}`} onClick={() => mark(a, 'in')} disabled={recoveryBlocked || readingFile || loading || searching || !!busyId || mustRefresh || !!pendingScan} className="min-h-11 shrink-0 px-3 py-1.5 rounded-lg text-sm font-outfit text-white hover:opacity-90 disabled:opacity-50" style={{ background: '#3d6b4f' }}>
                    Ingresó
                  </button>
                )}
              </div>
            ))}
          </div>
          <CheckinHistory key={`${group.invitationId}:${group.guest.id}:${recoveryScope.sessionKey}`} invitationId={group.invitationId} guestId={group.guest.id} sessionKey={recoveryScope.sessionKey} scope={scope} revisionKey={group.attendees.map(person => `${person.id}:${person.revision}`).join('|')} transport={transport} />
          <button type="button" disabled={recoveryBlocked || !!busyId || readingFile || loading || searching || !!pendingScan} onClick={() => { groupRequest.current?.abort(); lastParams.current = ''; activeGroup.current = false; setGroup(null); setManual(''); setNotice(''); setError(''); }} className="w-full py-3 text-sm font-outfit text-gray-400 hover:bg-gray-50 border-t border-gray-100 disabled:opacity-50">
            Cerrar y escanear otro
          </button>
        </div>
      )}
    </div>
  );
}
