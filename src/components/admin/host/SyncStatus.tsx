'use client';
import type { SyncState } from '@/lib/live-sync';
import { formatSyncTime } from '@/lib/host-dashboard';
const labels: Record<SyncState, string> = {
  loading: 'Consultando novedades…', current: 'Actualización automática · cada 8 segundos',
  retrying: 'No pudimos sincronizar. Conservamos la última lectura y reintentaremos.',
  offline: 'Sin conexión. Los datos mostrados pueden estar desactualizados.',
  paused: 'Actualización en pausa mientras esta pestaña no está visible.',
  denied: 'Tu sesión terminó o ya no tiene acceso. Vuelve a ingresar.',
};
export default function SyncStatus({ state, at, refresh }: { state: SyncState; at?: string; refresh: () => void }) {
  const warning = ['offline', 'retrying', 'denied'].includes(state);
  return <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 font-outfit ${warning ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-[#e3e8df] bg-[#f7faf5] text-[#416148]'}`}>
    <div role="status" aria-live="polite"><p className="flex items-center gap-2 text-xs"><span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${warning ? 'bg-amber-500' : 'bg-emerald-500'}`} />{labels[state]}</p><p className="mt-1 text-[11px] opacity-75">{at ? `Última lectura: ${formatSyncTime(at)} (Bolivia)` : 'Todavía no hay una lectura confirmada.'}</p></div>
    {state === 'denied' ? <a href="/panel" className="text-xs underline">Volver a ingresar</a> : <button type="button" onClick={refresh} disabled={state === 'loading' || state === 'offline'} className="min-h-10 rounded-xl border border-current/20 bg-white px-3 text-xs font-medium disabled:opacity-40">Actualizar ahora</button>}
  </div>;
}
