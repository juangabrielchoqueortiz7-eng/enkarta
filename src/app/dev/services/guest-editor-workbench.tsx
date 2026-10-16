'use client';
import { useRef, useState } from 'react';
import GuestEditor from '@/components/admin/host/GuestEditor';
import type { HostGuest } from '@/lib/host-dashboard';
import { verifyGuestEditReceipt, type GuestEditCommand } from '@/lib/guest-edit-form';

const fixture: HostGuest = { id: '80000000-0000-4000-8000-000000000001', publicId: 'QA-EDITOR-ONLY', name: 'Familia Pérez ficticia',
  passes: 4, allowKids: false, status: 'pending', sent: false, phone: '+59170000001', group: 'Familia', tableNo: '7', responseRevision: 0, inside: 0 };
/** Development-only memory fixture. No fetch, Supabase, window.open or messaging. */
export default function GuestEditorWorkbench() {
  const [latest, setLatest] = useState<HostGuest | undefined>({ ...fixture }), [editing, setEditing] = useState<HostGuest | null>(null);
  const current = useRef(latest); current.current = latest;
  const [connected, setConnected] = useState(true), [mode, setMode] = useState('normal'), [used, setUsed] = useState(false), [tracking, setTracking] = useState(false);
  const [writes, setWrites] = useState(0), [deleted, setDeleted] = useState(0), [delivery, setDelivery] = useState('Sin preparación ficticia.');
  const [invalidMessage, setInvalidMessage] = useState(false);
  const waiter = useRef<(() => void) | null>(null), [waiting, setWaiting] = useState(false);
  const save = async (command: GuestEditCommand) => {
    const scenario = mode;
    if (scenario === 'pause') { setWaiting(true); await new Promise<void>(resolve => { waiter.current = resolve; }); setWaiting(false); waiter.current = null; }
    if (scenario === 'denied') throw new Error('Permiso ficticio revocado. Tu edición sigue aquí.');
    const guest = current.current;
    if (!guest || guest.id !== command.id || guest.responseRevision !== command.expectedRevision) throw new Error('Conflicto ficticio: revisa los datos actuales.');
    const saved = { ...guest, ...command, responseRevision: command.expectedRevision + 1 };
    setLatest(saved); setWrites(value => value + 1);
    if (scenario === 'lost') throw new Error('Respuesta ficticia perdida después de guardar. Conservamos tu edición; consulta los datos actuales.');
    verifyGuestEditReceipt({ ok: true, guest: scenario === 'foreign' ? { ...saved, id: '80000000-0000-4000-8000-000000000002' } : saved }, command);
  };
  const controls = <div className="space-y-3 rounded-xl border border-gray-200 p-3 text-sm">
    <p className="font-medium">Simulación local de concurrencia</p>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={invalidMessage} onChange={event => setInvalidMessage(event.target.checked)} />Usar plantilla ficticia con errores</label>
    <label className="block">Respuesta ficticia<select aria-label="Respuesta del editor ficticio" value={mode} onChange={event => setMode(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-2 text-base"><option value="normal">Normal</option><option value="denied">Permiso revocado</option><option value="foreign">Recibo ajeno</option><option value="lost">Respuesta perdida después de guardar</option><option value="pause">Guardar con espera manual</option></select></label>
    <div className="flex flex-wrap gap-2">{[
      ['Cambiar mesa en otra sesión ficticia', () => setLatest(value => value ? { ...value, tableNo: '12', responseRevision: (value.responseRevision ?? 0) + 1 } : value)],
      ['Confirmar 3 pases en otra sesión ficticia', () => setLatest(value => value ? { ...value, status: 'confirmed', confirmedPasses: 3, responseRevision: (value.responseRevision ?? 0) + 1 } : value)],
      ['Retirar invitado en otra sesión ficticia', () => setLatest(undefined)],
      ['Cambiar conexión ficticia', () => setConnected(value => !value)],
      ['Cambiar seguimiento pendiente ficticio', () => setTracking(value => !value)],
      ['Marcar pases utilizados ficticios', () => setUsed(true)],
    ].map(([label, action]) => <button type="button" key={String(label)} onClick={action as () => void} className="min-h-11 rounded-xl border px-2 text-xs hover:bg-gray-50">{String(label)}</button>)}</div>
    {waiting && <button type="button" onClick={() => waiter.current?.()} className="min-h-11 rounded-xl border px-3">Resolver guardado ficticio</button>}
    <p role="status">{writes} guardados ficticios · {deleted} eliminaciones ficticias · {connected ? 'Conectado' : 'Sin conexión'} · {delivery}</p>
  </div>;
  return <main className="mx-auto max-w-3xl space-y-4 p-5">
    <h1 className="text-2xl font-semibold">Edición segura de invitados</h1><p>Datos ficticios en memoria. No abre WhatsApp ni modifica Supabase.</p>
    <p role="status">{latest ? `${latest.name} · Mesa ${latest.tableNo} · ${latest.phone} · Revisión ${latest.responseRevision}` : 'Invitado ficticio no disponible.'}</p>
    <button type="button" disabled={!latest} onClick={() => latest && setEditing(latest)} className="min-h-11 rounded-xl border bg-white px-4 disabled:opacity-40">Editar invitado ficticio</button>
    <button type="button" onClick={() => { setLatest({ ...fixture }); setUsed(false); setConnected(true); setTracking(false); setMode('normal'); }} className="ml-2 min-h-11 rounded-xl border bg-white px-4">Restablecer datos ficticios</button>
    {editing && <GuestEditor key={editing.id} original={editing} latest={latest} tables connected={connected} slug="qa-no-publicada" whatsappTemplate={invalidMessage ? 'Hola {nombree}. Tienes {pases} pases.' : undefined} reminderTemplate={invalidMessage ? 'Recuerda confirmar tu asistencia.' : undefined} deliveryBusy={tracking} close={() => setEditing(null)} save={save}
      remove={async revision => { if (!current.current || current.current.responseRevision !== revision) throw new Error('Conflicto ficticio.'); if (used) throw new Error('Ya se utilizaron pases de este grupo. No se pueden cancelar esos cupos.'); setDeleted(value => value + 1); setLatest(undefined); }}
      recordDelivery={async (guest, action) => setDelivery(`${action}: ${guest.name} · ${guest.phone}`)}>{controls}</GuestEditor>}
  </main>;
}
