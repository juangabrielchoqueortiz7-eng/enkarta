'use client';
import { useMemo, useState } from 'react';
import HostRoster from '@/components/admin/host/HostRoster';
import { hostMetrics, type HostGuest, type HostSnapshot } from '@/lib/host-dashboard';

/** Only mounted by the development-only services route. No server mutations. */
export default function RosterWorkbench() {
  const [count, setCount] = useState(63);
  const [otherEvent, setOtherEvent] = useState(false), [changed, setChanged] = useState(false), [responded, setResponded] = useState(false), [removed, setRemoved] = useState(false);
  const snapshot = useMemo<HostSnapshot>(() => {
    const guests: HostGuest[] = Array.from({ length: count }, (_, index): HostGuest => ({
      id: `${otherEvent ? '91000000' : '90000000'}-0000-4000-8000-${String(index).padStart(12, '0')}`, publicId: `QALIST${index}`,
      name: index === 2 && changed ? 'Familia 002 con datos actualizados' : index === 0 ? 'Familia de prueba con un nombre extenso para verificar el diseño móvil' : `Familia de prueba ${String(index).padStart(3, '0')}`,
      passes: 4, confirmedPasses: index % 3 === 0 ? 2 : undefined, allowKids: false, sent: false,
      status: index % 3 === 0 || (index === 2 && responded) ? 'confirmed' : 'pending', responseRevision: index === 2 && (changed || responded) ? 1 : 0, inside: 0,
      phone: index === 2 && changed ? '+59170000002' : '+59170000001', tableNo: String(index % 10 + 1), group: index % 2 ? 'Amigos' : 'Familia',
    })).filter((_,index)=> !removed || index !== 2);
    return { guests, syncedAt: '2026-10-15T12:00:00Z', mode: 'operations',
      services: { guestManagement: true, qrAccess: true, tableAssignment: true }, metrics: hostMetrics(guests), rows: [] };
  }, [count, otherEvent, changed, responded, removed]);
  return <main className="mx-auto max-w-5xl space-y-5 p-4">
    <h1 className="text-2xl font-semibold">Lista de invitados: prueba local</h1>
    <p className="text-sm text-gray-600">Datos ficticios en memoria. No abre WhatsApp ni modifica Supabase.</p>
    <div className="flex flex-wrap gap-2">{[0, 63, 1001].map(size => <button type="button" key={size} aria-pressed={count === size} onClick={() => setCount(size)} className="min-h-11 rounded-xl border bg-white px-4 text-sm">Mostrar {size} grupos ficticios</button>)}</div>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setOtherEvent(value=>!value)} className="min-h-11 rounded-xl border bg-white px-3 text-sm">Cambiar evento ficticio</button><button type="button" onClick={()=>setChanged(value=>!value)} className="min-h-11 rounded-xl border bg-white px-3 text-sm">Actualizar contacto 002 ficticio</button><button type="button" onClick={()=>setResponded(value=>!value)} className="min-h-11 rounded-xl border bg-white px-3 text-sm">Cambiar respuesta 002 ficticia</button><button type="button" onClick={()=>setRemoved(value=>!value)} className="min-h-11 rounded-xl border bg-white px-3 text-sm">Retirar contacto 002 ficticio</button></div><p className="text-sm">Evento ficticio {otherEvent ? 'B' : 'A'}</p>
    <HostRoster key={`${count}-${otherEvent}`} snapshot={snapshot} invitationId={`${otherEvent ? '91000000' : '90000000'}-0000-4000-8000-ffffffffffff`} slug="qa-no-publicada" connected refresh={() => {}} demo />
  </main>;
}
