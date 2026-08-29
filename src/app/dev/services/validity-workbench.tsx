'use client';
import { useState } from 'react';
import ValidityPanel from '@/components/admin/builder/panels/ValidityPanel';
import { invitationDemo } from '@/lib/template-starters';
import { newServiceContract } from '@/lib/packages';

export default function ValidityWorkbench() {
  const [id] = useState(() => crypto.randomUUID());
  const [message, setMessage] = useState('');
  const [key, setKey] = useState(0);
  const invitation = { ...invitationDemo('azure'), id, config: newServiceContract({}, 'exclusive') };
  async function scenario(action: string) {
    const response = await fetch('/api/dev/validity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
    if (!response.ok) { setMessage('Falló la simulación.'); return; }
    setMessage(action === 'fail_next' ? 'La próxima respuesta fallará después de guardar.' : action === 'reschedule' ? 'La fecha guardada cambió 14 días. Actualiza o intenta guardar para comprobar el conflicto.' : 'Escenario preparado.');
    if (action === 'reset' || action === 'legacy') setKey(k => k + 1);
  }
  return <main className="mx-auto max-w-xl space-y-3 px-4 py-5 font-outfit"><div className="flex flex-wrap gap-2">{[['reset','Reiniciar demo'],['fail_next','Perder respuesta al guardar'],['reschedule','Cambiar fecha en otra sesión'],['legacy','Acuerdo anterior sin fecha']].map(([action,label]) => <button key={action} onClick={() => void scenario(action)} className="rounded-xl border bg-white px-3 py-2 text-xs">{label}</button>)}</div><p role="status" className="text-xs text-gray-500">{message}</p><div className="rounded-3xl border bg-white p-4"><ValidityPanel key={key} data={invitation} endpoint="/api/dev/validity" /></div></main>;
}
