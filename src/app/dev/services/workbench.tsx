'use client';
import { useState } from 'react';
import PackageSettings from '@/components/admin/builder/panels/PackageSettings';
import ResponseSheet from '@/components/admin/host/ResponseSheet';
import NewInvitationPicker from '@/components/admin/NewInvitationPicker';
import HostWorkbench from './host-workbench';
import ValidityWorkbench from './validity-workbench';
import { newServiceContract } from '@/lib/packages';
import type { BuilderConfig } from '@/lib/types';
import QualityControlPanel from '@/components/admin/builder/panels/QualityControlPanel';
import { invitationDemo } from '@/lib/template-starters';

export default function ServicesWorkbench() {
  const [view, setView] = useState('Paquetes');
  const [config, setConfig] = useState<BuilderConfig>(() => newServiceContract({}, 'premium'));
  const [qualityData, setQualityData] = useState(() => { const data = invitationDemo('marfil-vivo'); return { ...data, config: newServiceContract(data.config, 'exclusive') }; });
  return <div className="min-h-screen bg-[#f5f3ee]">
    <nav className="flex flex-wrap justify-center gap-2 border-b bg-white p-3 font-outfit text-xs">{['Paquetes', 'Planilla', 'Selección inicial', 'Panel en vivo', 'Vigencia', 'Calidad'].map(label => <button type="button" key={label} onClick={() => setView(label)} aria-pressed={view === label} className="rounded-xl border px-4 py-2">{label}</button>)}</nav>
    <p className="p-2 text-center text-xs text-gray-500">Prueba local · datos ficticios · los cambios de paquete no se guardan.</p>
    {view === 'Paquetes' ? <div className="mx-auto max-w-md bg-white p-5"><PackageSettings config={config} onChange={setConfig} /></div> : view === 'Planilla' ? <ResponseSheet name="Evento de prueba" rows={[
      { id: 'one', name: 'Familia de ejemplo', source: 'personal', status: 'confirmed', assigned: 4, confirmed: 2, message: 'Gracias, estaremos presentes.', at: '2026-08-28' },
      { id: 'two', name: 'Invitado de muestra', source: 'open', status: 'declined', assigned: null, confirmed: 0, message: '', at: '2026-08-28' },
      { id: 'three', name: 'Grupo de prueba', source: 'personal', status: 'pending', assigned: 2, confirmed: 0, message: '', at: '' },
    ]} /> : view === 'Panel en vivo' ? <HostWorkbench /> : view === 'Vigencia' ? <ValidityWorkbench /> : view === 'Calidad' ? <div className="mx-auto max-w-xl bg-white"><QualityControlPanel data={qualityData} onChange={next => setQualityData(current => ({ ...current, config: next }))} /></div> : <NewInvitationPicker />}
  </div>;
}
