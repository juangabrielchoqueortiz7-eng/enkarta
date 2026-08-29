'use client';
import type { InvitationParsed } from '@/lib/types';
import type { HostSnapshot } from '@/lib/host-dashboard';
import { useHostSnapshot } from './useHostSnapshot';
import HostDashboard from './HostDashboard';
import ResponseSheet from './ResponseSheet';
import SyncStatus from './SyncStatus';
import SessionExit from './SessionExit';
import ValidityNotice from '../ValidityNotice';

export default function LiveHostPanel({ invitation, initial, endpoint = '/api/host/dashboard', demo = false }: {
  invitation: InvitationParsed; initial: HostSnapshot | null; endpoint?: string; demo?: boolean;
}) {
  const { snapshot, state, refresh } = useHostSnapshot(initial, endpoint);
  return <main className="min-h-screen bg-[#f5f3ee] px-4 pb-10 font-outfit">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-center justify-between gap-4 py-5"><div><p className="font-great text-3xl text-enkarta-gold">Enkarta</p><p className="text-[11px] text-gray-500">{snapshot?.mode === 'responses' ? 'Consulta de confirmaciones' : 'Panel del anfitrión'}</p></div>{!demo && <SessionExit />}</header>
      <SyncStatus state={state} at={snapshot?.syncedAt} refresh={refresh} />
      {snapshot?.validity && <ValidityNotice value={snapshot.validity} />}
      {!snapshot ? <section className="rounded-3xl border bg-white p-8 text-center text-sm leading-relaxed text-gray-500">{state === 'loading' ? 'Preparando tu panel…' : state === 'denied' ? 'Ingresa nuevamente con el acceso de tu evento.' : 'No pudimos cargar los datos. No se muestran ceros como si el evento estuviera vacío. Reintenta cuando se restablezca el servicio.'}</section>
        : snapshot.mode === 'operations' ? <HostDashboard invitation={invitation} snapshot={snapshot} connected={state === 'current' || state === 'loading'} refresh={refresh} demo={demo} />
          : <ResponseSheet name={invitation.names || 'tu evento'} rows={snapshot.rows} onRefresh={refresh} refreshing={state === 'loading'} embedded />}
    </div>
  </main>;
}
