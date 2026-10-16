'use client';
import { useState } from 'react';
import type { Guest } from '@/lib/types';
import ReceptionSearch from '@/components/admin/scanner/ReceptionSearch';
import DeliveryRecovery, { useDeliveryTracking } from '@/components/admin/host/DeliveryRecovery';
import WhatsAppQueue from '@/components/admin/host/WhatsAppQueue';
import WhatsAppReviewStatus, { useWhatsAppReview } from '@/components/admin/host/WhatsAppReview';

const guest: Guest = { id: '60000000-0000-4000-8000-000000000001', publicId: 'QAONLY01', name: 'Familia Pérez ficticia',
  passes: 4, allowKids: true, sent: false, status: 'pending', responseRevision: 0 };
const fullStorage = { getItem: () => null, setItem: () => { throw new DOMException('Simulated full storage', 'QuotaExceededError'); }, removeItem: () => {} };
const simulatedDelivery: typeof fetch = async (_input, options) => {
  const response = await fetch('/api/dev/delivery-recovery', options);
  const result = await response.clone().json();
  if (response.ok && !result.replayed) throw new TypeError('Simulated lost reply after a memory-only save');
  return response;
};
const simulatedSearch: typeof fetch = async input => {
  const params = new URL(String(input), 'https://qa.invalid').searchParams;
  const matches = params.get('field') === 'table' ? params.get('q') === '7' : guest.name.toLowerCase().includes((params.get('q') || '').toLowerCase());
  return new Response(JSON.stringify({ invitationId: params.get('invitationId'), guests: matches ? [{ id: guest.id, name: guest.name, passes: 4, tableNo: '7' }] : [], hasMore: false }));
};
export default function ReceptionWorkbench() {
  const [selected, setSelected] = useState(''), [result, setResult] = useState('');
  const [scope, setScope] = useState('60000000-0000-4000-8000-000000000017');
  const [denied, setDenied] = useState(false);
  const [storageFull, setStorageFull] = useState(false);
  const [queue, setQueue] = useState(false), [currentGuest, setCurrentGuest] = useState(guest);
  const review = useWhatsAppReview(scope, storageFull ? fullStorage : undefined);
  const delivery = useDeliveryTracking((saved, _submitted, operation) => {
    if (operation.action !== 'manual') review.prepare(operation.guestId);
    setCurrentGuest(saved);
    setResult(operation.action === 'manual' ? 'Marca manual recuperada; sin abrir WhatsApp.' : `Seguimiento recuperado: ${saved.reminderCount} recordatorio registrado; sin abrir WhatsApp.`);
  }, undefined,
    (input, options) => denied ? Promise.resolve(new Response('{"error":"Permiso ficticio rechazado"}', { status: 403 })) : simulatedDelivery(input, options), scope, storageFull ? fullStorage : undefined);
  return <main className="mx-auto max-w-md space-y-5 p-4 font-outfit">
    <h1 className="font-playfair text-2xl">Recepción y seguimiento</h1>
    <p className="text-xs text-gray-500">Prueba en memoria. No consulta Supabase, no registra entradas y no abre WhatsApp.</p>
    <button type="button" disabled={delivery.busy} onClick={() => setScope(current => current.endsWith('17') ? '60000000-0000-4000-8000-000000000018' : '60000000-0000-4000-8000-000000000017')} className="min-h-11 rounded-xl border bg-white px-3 text-sm">Cambiar evento ficticio</button>
    <p className="text-sm text-gray-600">Evento ficticio {scope.endsWith('17') ? 'A' : 'B'}</p>
    <button type="button" disabled={delivery.busy} onClick={() => setDenied(value => !value)} className="min-h-11 rounded-xl border bg-white px-3 text-sm">{denied ? 'Restablecer permiso ficticio' : 'Simular permiso rechazado'}</button>
    <button type="button" disabled={delivery.blocked} onClick={() => setStorageFull(value => !value)} className="min-h-11 rounded-xl border bg-white px-3 text-sm">{storageFull ? 'Restablecer almacenamiento ficticio' : 'Simular almacenamiento lleno'}</button>
    <button type="button" onClick={review.reload} className="min-h-11 rounded-xl border bg-white px-3 text-sm">Volver a consultar progreso ficticio</button>
    <ReceptionSearch invitationId={scope} sessionKey={'0'.repeat(64)} scope="door" disabled={false}
      beforeSearch={async () => { setSelected(''); }} busyChanged={() => {}} transport={simulatedSearch}
      selectGuest={() => setSelected('Grupo ficticio seleccionado. Todavía no se registró ningún ingreso.')} />
    {selected && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{selected}</p>}
    <section className="space-y-3 rounded-2xl border bg-white p-4"><h2 className="text-sm font-medium">Respuesta perdida en seguimiento individual</h2>
      <button type="button" disabled={review.blocked} onClick={() => { if (review.review || review.begin([guest.id], 'invitation')) setQueue(true); }} className="min-h-11 w-full rounded-xl border px-3 text-sm">Abrir cola ficticia</button>
      <button type="button" disabled={delivery.blocked} onClick={() => { setResult(''); void delivery.start(guest, 'reminder'); }} className="min-h-11 w-full rounded-xl bg-emerald-700 px-3 text-sm text-white disabled:opacity-40">Simular seguimiento y respuesta perdida</button>
      <DeliveryRecovery tracker={delivery} />
      {result && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900">{result}</p>}
    </section>
    <WhatsAppReviewStatus controller={review} resume={() => setQueue(true)} disabled={delivery.busy} />
    {queue && review.review && <WhatsAppQueue key={review.review.id} controller={review} guests={[{ ...currentGuest, inside: 0, phone: '+59170000001' }]} slug="qa-no-publicada" connected tracker={{ ...delivery, start: (contact, action) => delivery.start(contact, action) }} close={() => setQueue(false)} />}
  </main>;
}
