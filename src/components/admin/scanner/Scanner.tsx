'use client';

// Escáner de acceso para la puerta. Lee el QR con la cámara (html5-qrcode) o
// acepta el ID de acceso escrito a mano (ENK-XXXX). Carga el grupo del invitado
// y permite marcar ingreso/salida individual por persona. Re-escanear conserva
// el estado de quienes ya ingresaron.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Guest, Attendee } from '@/lib/types';

type Group = { guest: Pick<Guest, 'id' | 'name' | 'tableNo' | 'accessCode'>; attendees: Attendee[] };

export default function Scanner({ scope = 'host' }: { scope?: 'host' | 'door' }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  const [scanning, setScanning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mustRefresh, setMustRefresh] = useState(false);
  const [syncedAt, setSyncedAt] = useState('');
  const busyRef = useRef(false);
  const loadingRef = useRef(false);
  const groupRequest = useRef<AbortController | null>(null);
  const lastParams = useRef('');
  const pending = useRef<{ attendeeId: string; action: 'in' | 'out'; expectedRevision: number; requestId: string } | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const lastScan = useRef<{ value: string; at: number }>({ value: '', at: 0 });

  // ── Cargar un grupo por token (QR) o código (manual) ──
  const loadGroup = useCallback(async (params: string, background = false) => {
    if (busyRef.current || (background && (loadingRef.current || pending.current))) return;
    groupRequest.current?.abort();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('timeout'), 12000);
    groupRequest.current = controller;
    lastParams.current = params;
    if (!background) setGroup(null);
    loadingRef.current = true;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/checkin?${params}&scope=${scope}`, { cache: 'no-store', signal: controller.signal });
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (!res.ok) { setError(data.error || 'No se pudo cargar'); setMustRefresh(true); if (res.status < 500) setGroup(null); return; }
      setGroup(data);
      setSyncedAt(new Date().toLocaleTimeString('es-BO'));
      pending.current = null;
      setMustRefresh(false);
    } catch { if (!controller.signal.aborted || controller.signal.reason === 'timeout') { setError('Sin conexión. Actualiza el grupo antes de registrar movimientos.'); setMustRefresh(true); } }
    finally { clearTimeout(timeout); if (groupRequest.current === controller) { setLoading(false); loadingRef.current = false; } }
  }, [scope]);

  useEffect(() => {
    if (!group?.guest.id) return;
    const poll = () => { if (document.visibilityState === 'visible' && navigator.onLine && lastParams.current) void loadGroup(lastParams.current, true); };
    const timer = setInterval(poll, 8000);
    window.addEventListener('online', poll);
    return () => { clearInterval(timer); window.removeEventListener('online', poll); };
  }, [group?.guest.id, loadGroup]);

  const onDetected = useCallback((text: string) => {
    if (busyRef.current) return;
    const now = Date.now();
    // Anti-rebote: ignora el mismo QR repetido en <2.5s.
    if (text === lastScan.current.value && now - lastScan.current.at < 2500) return;
    lastScan.current = { value: text, at: now };
    loadGroup(`token=${encodeURIComponent(text)}`);
  }, [loadGroup]);

  // ── Cámara (html5-qrcode, import dinámico para que no entre en SSR) ──
  const startCamera = useCallback(async () => {
    setError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
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
      setScanning(true);
    } catch {
      setError('No se pudo acceder a la cámara. Usa el código manual.');
      setScanning(false);
    }
  }, [onDetected]);

  const stopCamera = useCallback(async () => {
    try { await scannerRef.current?.stop(); scannerRef.current?.clear(); } catch { /* ya detenida */ }
    scannerRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => () => { groupRequest.current?.abort(); void stopCamera(); }, [stopCamera]);
  useEffect(() => {
    const offline = () => { setMustRefresh(true); setError('Sin conexión. No se registrarán movimientos hasta actualizar el grupo.'); };
    window.addEventListener('offline', offline);
    return () => window.removeEventListener('offline', offline);
  }, []);

  // ── Marcar ingreso/salida de una persona y refrescar su estado ──
  const mark = async (att: Attendee, action: 'in' | 'out') => {
    if (busyRef.current || loadingRef.current || loading || mustRefresh) return;
    if (pending.current && (pending.current.attendeeId !== att.id || pending.current.action !== action)) return;
    busyRef.current = true;
    const operation = pending.current ?? { attendeeId: att.id, action, expectedRevision: att.revision, requestId: crypto.randomUUID() };
    pending.current = operation;
    setBusyId(att.id);
    setError('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...operation, scope }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (res.ok && data.attendee) {
        setGroup(g => g ? { ...g, attendees: g.attendees.map(a => a.id === att.id ? data.attendee : a) } : g);
        pending.current = null;
      } else {
        setError(data.error || 'No se pudo registrar');
        if (res.status < 500) { pending.current = null; setMustRefresh(true); }
      }
    } catch { setError('No se pudo comprobar el resultado. Reintenta el mismo movimiento o actualiza el grupo; no se volverá a contar.'); }
    finally { clearTimeout(timeout); }
    busyRef.current = false;
    setBusyId(null);
  };

  const inCount = group?.attendees.filter(a => a.state === 'in').length ?? 0;

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="font-playfair text-2xl text-gray-900 text-center">Control de acceso</h1>

      {/* Cámara */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div id="enkarta-qr-reader" className="w-full" style={{ minHeight: scanning ? 260 : 0 }} />
        <div className="p-3 flex gap-2">
          {!scanning ? (
            <button onClick={startCamera} className="flex-1 py-2.5 rounded-xl bg-enkarta-gold text-white font-outfit font-medium text-sm">📷 Escanear QR</button>
          ) : (
            <button onClick={stopCamera} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-outfit text-sm">Detener cámara</button>
          )}
        </div>
      </div>

      {/* Código manual */}
      <form onSubmit={e => { e.preventDefault(); if (manual.trim() && !busyId) loadGroup(`code=${encodeURIComponent(manual.trim())}`); }} className="flex gap-2">
        <input value={manual} onChange={e => setManual(e.target.value.toUpperCase())} placeholder="ID de acceso (ENK-XXXX)" className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-enkarta-gold outline-none font-mono uppercase" />
        <button type="submit" disabled={!!busyId} className="px-4 py-2.5 rounded-xl bg-gray-800 text-white font-outfit text-sm disabled:opacity-50">Buscar</button>
      </form>

      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-outfit text-center">{error}</div>}
      {loading && <p role="status" className="text-center text-sm text-gray-500">Consultando el acceso…</p>}
      {!!lastParams.current && !busyId && <button type="button" onClick={() => void loadGroup(lastParams.current)} className="min-h-11 w-full rounded-xl border border-gray-200 bg-white text-sm">Actualizar grupo desde el servidor</button>}

      {/* Grupo cargado */}
      {group && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100" style={{ background: '#faf7f2' }}>
            <p className="font-playfair text-lg text-gray-900">{group.guest.name}</p>
            <p className="mt-1 text-[11px] text-gray-500 font-outfit">Última lectura: {syncedAt} · actualización cada 8 s</p>
            <div className="flex items-center gap-3 mt-1 text-xs font-outfit text-gray-500">
              {group.guest.tableNo && <span>Mesa {group.guest.tableNo}</span>}
              <span className="font-mono">{group.guest.accessCode}</span>
              <span className="ml-auto font-medium" style={{ color: '#3d6b4f' }}>{inCount}/{group.attendees.length} dentro</span>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {group.attendees.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-playfair font-bold ${a.state === 'in' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-outfit text-gray-700">{a.label || `Persona ${a.seatNo}`}</p>
                  <p className="text-[11px] font-outfit" style={{ color: a.state === 'in' ? '#3d6b4f' : '#9ca3af' }}>
                    {a.state === 'in' ? '● Dentro' : '○ Afuera'}
                  </p>
                </div>
                {a.state === 'in' ? (
                  <button onClick={() => mark(a, 'out')} disabled={!!busyId || mustRefresh || (!!pending.current && pending.current.attendeeId !== a.id)} className="px-3 py-1.5 rounded-lg text-xs font-outfit border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50">
                    Marcar salida
                  </button>
                ) : (
                  <button onClick={() => mark(a, 'in')} disabled={!!busyId || mustRefresh || (!!pending.current && pending.current.attendeeId !== a.id)} className="px-3 py-1.5 rounded-lg text-xs font-outfit text-white hover:opacity-90 disabled:opacity-50" style={{ background: '#3d6b4f' }}>
                    Ingresó
                  </button>
                )}
              </div>
            ))}
          </div>
          <button disabled={!!busyId} onClick={() => { groupRequest.current?.abort(); lastParams.current = ''; setGroup(null); setManual(''); pending.current = null; }} className="w-full py-3 text-sm font-outfit text-gray-400 hover:bg-gray-50 border-t border-gray-100 disabled:opacity-50">
            Cerrar y escanear otro
          </button>
        </div>
      )}
    </div>
  );
}
