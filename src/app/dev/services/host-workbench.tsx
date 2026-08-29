'use client';
import { useState } from 'react';
import { invitationDemo } from '@/lib/template-starters';
import { newServiceContract } from '@/lib/packages';
import LiveHostPanel from '@/components/admin/host/LiveHostPanel';

export default function HostWorkbench() {
  const [session] = useState(() => crypto.randomUUID());
  const [notice, setNotice] = useState('');
  const [invitation] = useState(() => {
    const value = invitationDemo('azure');
    return { ...value, id: '10000000-0000-4000-8000-000000000011', names: 'Valentina y Nicolás', event_date: '2026-11-21', rsvp_deadline: '2026-11-10', config: newServiceContract({}, 'exclusive') };
  });
  const endpoint = '/api/dev/host-dashboard?session=' + session;
  const simulate = async (action: string) => {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
    setNotice(response.ok ? 'Cambio ficticio registrado. El siguiente sondeo lo mostrará sin recargar.' : 'No se pudo simular.');
  };
  return <><div className="space-y-2 border-b bg-white p-3 text-center font-outfit text-xs"><div className="flex flex-wrap justify-center gap-2">{[['confirm', 'Simular confirmación'], ['enter', 'Simular ingreso'], ['table', 'Cambiar mesa en otra sesión'], ['fail', 'Simular fallo de red'], ['recover', 'Restablecer conexión'], ['reset', 'Restablecer demo']].map(([action, label]) => <button type="button" key={action} onClick={() => void simulate(action)} className="min-h-10 rounded-xl border px-3">{label}</button>)}</div><p role="status">{notice || 'Estas acciones solo cambian datos ficticios en memoria.'}</p></div><LiveHostPanel invitation={invitation} initial={null} endpoint={endpoint} demo /></>;
}
