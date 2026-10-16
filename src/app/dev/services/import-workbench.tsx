'use client';
import { useState } from 'react';
import GuestImportRecovery, { useGuestImport } from '@/components/admin/host/GuestImportRecovery';
import { guestImportMessage, type GuestImportReceipt } from '@/lib/guest-import-operation';

// Isolated visual fixture: no HTTP request, production guest or WhatsApp action.
const receipts = new Map<string, GuestImportReceipt>();
const simulateLostResponse: typeof fetch = async (_input, options) => {
  const operation = JSON.parse(String(options?.body));
  const saved = receipts.get(operation.requestId);
  if (saved) return new Response(JSON.stringify({ ...saved, requestId: operation.requestId, replayed: true }));
  receipts.set(operation.requestId, { importedCount: operation.guests.length, missingCount: 0, replayed: false,
    guests: operation.guests.map((guest: object) => ({ ...guest, id: crypto.randomUUID(), publicId: 'QA-ONLY', responseRevision: 0 })) });
  throw new TypeError('Simulated lost response after an in-memory save');
};
export default function ImportWorkbench() {
  const importer = useGuestImport('70000000-0000-4000-8000-000000000017', simulateLostResponse);
  const [receipt, setReceipt] = useState('');
  return <section className="mx-auto max-w-lg space-y-4 p-5 font-outfit">
    <h1 className="font-playfair text-2xl">Recuperación de importación</h1>
    <p className="text-sm text-gray-600">Simulación en memoria con un invitado ficticio. El primer intento guarda y pierde su respuesta; el siguiente recupera el mismo resultado. No se consulta ni modifica Supabase.</p>
    <button type="button" disabled={!importer.ready || importer.busy || !!importer.pending} onClick={async () => {
      setReceipt(''); await importer.submit([{ name: 'Familia ficticia de prueba', passes: 4, allowKids: true, eventAccess: 'both' }]);
    }} className="min-h-11 rounded-xl bg-[#516749] px-4 text-sm text-white disabled:opacity-40">Simular importación y respuesta perdida</button>
    <GuestImportRecovery importer={importer} recovered={result => setReceipt(guestImportMessage(result))} />
    {importer.pending && <p className="break-all text-xs text-gray-500">Operación de prueba: {importer.pending.requestId}</p>}
    {receipt && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{receipt}</p>}
    <p className="text-xs text-gray-500">Esta vista comprueba la interfaz y el borrador de recuperación por pestaña. La concurrencia SQL se comprueba en las pruebas de servicios.</p>
  </section>;
}
