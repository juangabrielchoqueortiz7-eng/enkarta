'use client';
import { useMemo, useRef, useState } from 'react';
import GuestImportRecovery, { useGuestImport } from '@/components/admin/host/GuestImportRecovery';
import DeliveryRecovery, { useDeliveryTracking } from '@/components/admin/host/DeliveryRecovery';
import Scanner from '@/components/admin/scanner/Scanner';
import { guestImportMessage, guestImportStorageKey, type GuestImportStorage } from '@/lib/guest-import-operation';
import { deliveryRecoveryKey } from '@/lib/delivery-recovery';
import { scanRecoveryKey } from '@/lib/scan-recovery';
import { SCANNER_QA_EVENTS, scannerQaGroup, scannerQaScope } from '@/lib/dev/scanner-fixture';
import type { Guest } from '@/lib/types';

type Flow = 'import' | 'delivery' | 'scan';
type StorageMode = 'ok' | 'read' | 'write' | 'remove';
const event = SCANNER_QA_EVENTS[0], scannerScope = scannerQaScope(event, 'door', false);
const contact: Guest = { id: '40000000-0000-4000-8000-000000000002', publicId: 'QA-ONLY', name: 'Familia ficticia', passes: 2, allowKids: false, sent: false, status: 'pending', responseRevision: 0 };
const button = 'min-h-11 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40';

function ImportProbe({ storage, transport }: { storage: GuestImportStorage; transport: typeof fetch }) {
  const importer = useGuestImport(event, transport, storage);
  const [notice, setNotice] = useState('');
  return <section className="space-y-4"><h2 className="text-xl font-semibold">Importación de invitados</h2>
    <button type="button" disabled={importer.blocked} className={button} onClick={async () => { const result = await importer.submit([{ name: contact.name, passes: 2, allowKids: false, eventAccess: 'both' }]); if (result) setNotice(guestImportMessage(result)); }}>Importar lote ficticio</button>
    <GuestImportRecovery importer={importer} recovered={result => setNotice(guestImportMessage(result))} />
    {notice && <p role="status">{notice}</p>}
  </section>;
}
function DeliveryProbe({ storage, transport }: { storage: GuestImportStorage; transport: typeof fetch }) {
  const [notice, setNotice] = useState('');
  const delivery = useDeliveryTracking(() => setNotice('Seguimiento ficticio comprobado, sin abrir WhatsApp.'), undefined, transport, event, storage);
  return <section className="space-y-4"><h2 className="text-xl font-semibold">Seguimiento de WhatsApp</h2>
    <button type="button" disabled={delivery.blocked} className={button} onClick={() => void delivery.start(contact, 'reminder')}>Preparar seguimiento ficticio</button>
    <DeliveryRecovery tracker={delivery} />{notice && <p role="status">{notice}</p>}
  </section>;
}

/** All reads and mutations stay in this component's memory. No fetch, bank or WhatsApp. */
export default function RecoverySafetyWorkbench() {
  const [flow, setFlow] = useState<Flow>('import'), [mount, setMount] = useState(0);
  const [mode, setMode] = useState<StorageMode>('ok'), [loseReply, setLoseReply] = useState(true);
  const [counts, setCounts] = useState({ requests: 0, writes: 0 });
  const lab = useRef({ mode: 'ok' as StorageMode, loseReply: true, values: new Map<string, string>(), receipts: new Map<string, Record<string, unknown>>(), group: scannerQaGroup(event), requests: 0, writes: 0 });
  lab.current.mode = mode; lab.current.loseReply = loseReply;
  const storage = useMemo<GuestImportStorage>(() => ({
    getItem(key) { if (lab.current.mode === 'read') throw new Error('Simulated read failure'); return lab.current.values.get(key) ?? null; },
    setItem(key, value) { if (lab.current.mode === 'write') throw new Error('Simulated quota failure'); lab.current.values.set(key, value); },
    removeItem(key) { if (lab.current.mode === 'remove') throw new Error('Simulated removal failure'); lab.current.values.delete(key); },
  }), []);
  const transport = useMemo<typeof fetch>(() => async (input, options) => {
    const url = String(input), state = lab.current;
    if (url.startsWith('/api/checkin/history?')) return Response.json({invitationId:event,guestId:state.group.guest.id,movements:[],nextCursor:null,readAt:new Date().toISOString()});
    if (url.startsWith('/api/checkin?')) return Response.json(state.group);
    if (options?.method !== 'POST' || !['/api/guests', '/api/guests/delivery', '/api/checkin'].includes(url)) throw new Error('Unexpected test route');
    const operation = JSON.parse(String(options.body)), previous = state.receipts.get(operation.requestId);
    state.requests++;
    let receipt = previous;
    if (!receipt) {
      if (url === '/api/guests') receipt = { requestId: operation.requestId, guests: operation.guests.map((row: object) => ({ ...row, id: crypto.randomUUID(), publicId: 'QA-ONLY', responseRevision: 0 })), importedCount: operation.guests.length, missingCount: 0 };
      else if (url === '/api/guests/delivery') receipt = { guest: { ...contact, responseRevision: operation.expectedRevision + 1, reminderCount: 1, deliveryStatus: 'opened' } };
      else {
        const person = state.group.attendees.find(item => item.id === operation.attendeeId);
        if (!person) return Response.json({ error: 'Synthetic attendee missing' }, { status: 404 });
        person.revision++; person.state = operation.action;
        receipt = { ok: true, attendee: { ...person } };
      }
      state.receipts.set(operation.requestId, receipt); state.writes++;
    }
    setCounts({ requests: state.requests, writes: state.writes });
    if (!previous && state.loseReply) throw new TypeError('Simulated lost reply after save');
    return Response.json({ ...receipt, replayed: !!previous });
  }, []);
  const key = flow === 'import' ? guestImportStorageKey(event) : flow === 'delivery' ? deliveryRecoveryKey(event) : scanRecoveryKey(scannerScope);
  const seed = (raw: string | null) => {
    if (raw === null) lab.current.values.delete(key);
    else { lab.current.values.set(key, raw); setMount(value => value + 1); }
  };
  return <main className="mx-auto max-w-3xl space-y-6 p-4 font-outfit text-gray-900">
    <h1 className="font-playfair text-2xl">Recuperación operativa: prueba local</h1>
    <p>Invitados, WhatsApp y recepción QR con datos ficticios en memoria. No consulta Supabase, no abre WhatsApp y no solicita cámara ni sonido automáticamente.</p>
    <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm">Flujo<select aria-label="Flujo de prueba" value={flow} onChange={e => setFlow(e.target.value as Flow)} className="block min-h-11 w-full rounded-xl border bg-white px-3 text-base"><option value="import">Importación</option><option value="delivery">WhatsApp</option><option value="scan">Recepción QR</option></select></label>
      <label className="space-y-2 text-sm">Almacenamiento<select aria-label="Estado del almacenamiento" value={mode} onChange={e => setMode(e.target.value as StorageMode)} className="block min-h-11 w-full rounded-xl border bg-white px-3 text-base"><option value="ok">Disponible</option><option value="read">Lectura bloqueada</option><option value="write">Escritura bloqueada</option><option value="remove">Retirada bloqueada</option></select></label></div>
    <label className="flex min-h-11 cursor-pointer items-center gap-2"><input type="checkbox" checked={loseReply} onChange={e => setLoseReply(e.target.checked)} className="h-4 w-4" />Perder la primera respuesta de cada operación ficticia</label>
    <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => seed('broken')}>Guardar copia dañada ficticia</button><button type="button" className={button} onClick={() => seed('')}>Guardar copia vacía ficticia</button><button type="button" className={button} onClick={() => seed(null)}>Retirar copia ficticia sin confirmar servidor</button><button type="button" className={button} onClick={() => setMount(value => value + 1)}>Volver a montar el flujo</button></div>
    <p role="status" aria-label="Contadores ficticios" className="tabular-nums">POST ficticios: {counts.requests} · Operaciones guardadas: {counts.writes}</p>
    <div key={`${flow}-${mount}`} className="border-t border-gray-300 pt-5">{flow === 'import' ? <ImportProbe storage={storage} transport={transport} /> : flow === 'delivery' ? <DeliveryProbe storage={storage} transport={transport} /> : <><p className="mb-4 text-sm">Código ficticio: ENK-QA2026. Consultar no registra ingresos.</p><Scanner recoveryScope={scannerScope} storage={storage} transport={transport} /></>}</div>
  </main>;
}
