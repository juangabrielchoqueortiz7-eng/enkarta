'use client';
import { useState } from 'react';
import LiveHostPanel from '@/components/admin/host/LiveHostPanel';
import { invitationDemo } from '@/lib/template-starters';
import { rosterFixture } from '@/lib/dev/roster-fixture';
import { newServiceContract } from '@/lib/packages';
export default function PaginationWorkbench() {
  const [mode, setMode] = useState('normal');
  const [initial] = useState(() => rosterFixture());
  const [invitation] = useState(() => { const value = invitationDemo('marfil-vivo'); return { ...value, id: '92000000-0000-4000-8000-ffffffffffff', config: newServiceContract(value.config,'exclusive'), names: 'Padrón ficticio · 1.001 grupos' }; });
  return <><div className="bg-white p-4 text-center text-sm"><p>Prueba local del contrato HTTP. SQL verificado por separado. No abre WhatsApp ni modifica Supabase.</p><label>Conexión ficticia<select value={mode} onChange={event => setMode(event.target.value)} className="ml-2 min-h-11 rounded-xl border bg-white px-3 text-base"><option value="normal">Normal</option><option value="slow">Lenta</option><option value="failure">Error</option></select></label></div><LiveHostPanel invitation={invitation} initial={initial} endpoint={`/api/dev/roster-pagination?qaMode=${mode}`} demo /></>;
}
