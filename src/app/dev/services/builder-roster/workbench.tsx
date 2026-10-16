'use client';
import { useState } from 'react';
import { ManagedGuestsPanel } from '@/components/admin/builder/panels/GuestsPanel';
import { invitationDemo } from '@/lib/template-starters';
import { newServiceContract } from '@/lib/packages';
import type { Guest } from '@/lib/types';

export default function BuilderRosterWorkbench() {
  const [mode, setMode] = useState('normal'), [guest, setGuest] = useState<Guest | null>(null);
  const [data, setData] = useState(() => {
    const original = invitationDemo('marfil-vivo');
    return { ...original, id: '92000000-0000-4000-8000-ffffffffffff', slug: 'qa-builder-roster', config: newServiceContract(original.config, 'exclusive') };
  });
  return <main className="mx-auto max-w-6xl space-y-5 p-4 font-outfit">
    <h1 className="font-playfair text-2xl">Invitados del constructor: prueba local</h1>
    <p className="text-sm">1.001 grupos ficticios. No modifica Supabase, no abre WhatsApp y no cambia ninguna invitación original.</p>
    <label className="block text-sm">Conexión ficticia<select aria-label="Conexión ficticia del constructor" value={mode} onChange={event => setMode(event.target.value)} className="ml-2 min-h-11 rounded-xl border bg-white px-3 text-base"><option value="normal">Normal</option><option value="slow">Lenta</option><option value="failure">Error</option><option value="denied">Permiso rechazado</option></select></label>
    <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]"><div className="min-w-0 border bg-white"><ManagedGuestsPanel data={data} onChange={patch => setData(current => ({ ...current, ...patch }))} onPreview={setGuest} previewGuestId={guest?.id} endpoint={`/api/dev/builder-roster?qaMode=${mode}`} demo /></div>
      <aside className="min-w-0 space-y-3 rounded-xl border bg-white p-5 lg:sticky lg:top-5" aria-label="Resultado de vista personal"><h2 className="font-playfair text-xl">Datos entregados al lienzo</h2><p>Esta ficha verifica el contrato de vista personal; no sustituye el diseño de una invitación.</p><p role="status" className="break-words">{guest ? `${guest.name} · ${guest.passes} pases · ${guest.allowKids ? 'niños permitidos' : 'solo adultos'}` : 'Vista general de la invitación.'}</p>{guest && <p className="text-sm">{guest.accessToken ? 'Token QR ficticio presente únicamente en la vista solicitada.' : 'Sin token QR.'}</p>}</aside>
    </div>
  </main>;
}
