'use client';
import { useEffect, useRef, useState } from 'react';
import type { HostSnapshot } from '@/lib/host-dashboard';
import { createLiveSync, SyncDenied, type SyncState } from '@/lib/live-sync';

export function useHostSnapshot(initial: HostSnapshot | null, endpoint: string) {
  const [snapshot, setSnapshot] = useState(initial);
  const [state, setState] = useState<SyncState>('loading');
  const refresh = useRef<() => void>(() => {});
  useEffect(() => {
    const sync = createLiveSync<HostSnapshot>({
      async read(signal) {
        const response = await fetch(endpoint, { signal, cache: 'no-store' });
        if (response.status === 401 || response.status === 403) throw new SyncDenied();
        if (!response.ok) throw new Error('No disponible');
        const value = await response.json();
        if (!value || !Array.isArray(value.guests) || !Array.isArray(value.rows) || !value.services || !['operations', 'responses'].includes(value.mode) || !Number.isFinite(Date.parse(value.syncedAt))) throw new Error('Lectura incompleta');
        return value;
      },
      receive: setSnapshot,
      status(next) { setState(next); if (next === 'denied') setSnapshot(null); },
    });
    const wake = () => {
      if (!navigator.onLine) sync.pause('offline');
      else if (document.visibilityState === 'hidden') sync.pause('paused');
      else sync.resume();
    };
    refresh.current = () => { if (navigator.onLine) void sync.refresh(); else sync.pause('offline'); };
    wake();
    window.addEventListener('online', wake); window.addEventListener('offline', wake);
    document.addEventListener('visibilitychange', wake);
    return () => { sync.stop(); refresh.current = () => {}; window.removeEventListener('online', wake); window.removeEventListener('offline', wake); document.removeEventListener('visibilitychange', wake); };
  }, [endpoint]);
  return { snapshot, state, refresh: () => refresh.current() };
}
