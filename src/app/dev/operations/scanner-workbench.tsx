'use client';
import { useCallback, useRef, useState } from 'react';
import Scanner from '@/components/admin/scanner/Scanner';
import { SCANNER_QA_EVENTS, scannerQaScope } from '@/lib/dev/scanner-fixture';
import type { ScannerRole } from '@/lib/scan-recovery';

const quotaStorage = { getItem: (key: string) => sessionStorage.getItem(key), setItem: () => { throw new DOMException('Synthetic quota', 'QuotaExceededError'); }, removeItem: (key: string) => sessionStorage.removeItem(key) };
const deniedStorage = { getItem: () => { throw new DOMException('Synthetic denied storage', 'SecurityError'); }, setItem: () => {}, removeItem: () => { throw new DOMException('Synthetic denied storage', 'SecurityError'); } };

/** Synthetic server receipts survive reload. No Supabase, banking or messaging. */
export default function ScannerWorkbench() {
  const [otherEvent, setOtherEvent] = useState(false), [secondSession, setSecondSession] = useState(false), [role, setRole] = useState<ScannerRole>('door');
  const [storageMode, setStorageMode] = useState('normal'), [selected, setSelected] = useState('normal'), [activity, setActivity] = useState('Sin movimientos consultados.');
  const mode = useRef('normal');
  const event = SCANNER_QA_EVENTS[otherEvent ? 1 : 0], recoveryScope = scannerQaScope(event, role, secondSession);
  const endpoint = `/api/dev/scanner-recovery?qaEvent=${event}&qaRole=${role}&qaSession=${secondSession ? '2' : '1'}`;
  const transport = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    const parsed = new URL(String(input), 'https://local.invalid');
    if (parsed.pathname === '/api/checkin/history') parsed.searchParams.set('history','1');
    const query = parsed.searchParams.toString();
    const response = await fetch(endpoint + '&' + query, { ...init, headers: { ...init?.headers, 'X-QA-Mode': mode.current } });
    const data = await response.clone().json();
    if (typeof data.qaMovements === 'number') setActivity(`${data.qaMovements} movimientos ficticios en el servidor local.`);
    if (init?.method === 'POST' && response.ok && !data.replayed && mode.current === 'lost') throw new TypeError('Respuesta ficticia perdida después de guardar.');
    return response;
  }, [endpoint]);
  return <section className="space-y-4">
    <p className="text-sm">Evento ficticio {otherEvent ? 'B' : 'A'} · sesión {secondSession ? '2' : '1'} · rol {role}</p>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setOtherEvent(value => !value)} className="min-h-11 rounded-xl border bg-white px-3 text-sm">Cambiar evento ficticio</button><button type="button" onClick={() => setSecondSession(value => !value)} className="min-h-11 rounded-xl border bg-white px-3 text-sm">Cambiar sesión ficticia</button><button type="button" onClick={() => setRole(value => value === 'door' ? 'host' : value === 'host' ? 'admin' : 'door')} className="min-h-11 rounded-xl border bg-white px-3 text-sm">Cambiar rol ficticio</button></div>
    <label className="block text-sm">Escenario ficticio<select aria-label="Escenario de recepción ficticia" value={selected} onChange={e => { mode.current = e.target.value; setSelected(e.target.value); }} className="mt-2 min-h-11 w-full rounded-xl border bg-white px-3 text-base"><option value="normal">Normal</option><option value="lost">Respuesta perdida después de guardar</option><option value="foreign">Confirmación de un pase ajeno</option><option value="denied">Permiso revocado (403)</option><option value="group">Grupo con pases duplicados</option><option value="history-pages">Historial ficticio de ejemplo: 43 movimientos</option><option value="history-error">Error al consultar el historial</option></select></label>
    <label className="block text-sm">Almacenamiento ficticio<select aria-label="Almacenamiento de recepción ficticia" value={storageMode} onChange={e => setStorageMode(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border bg-white px-3 text-base"><option value="normal">Normal</option><option value="quota">Escritura sin espacio</option><option value="denied">Lectura no disponible</option></select></label>
    <button type="button" onClick={async () => { const response = await fetch(endpoint, { method: 'PATCH', headers: { 'X-Enkarta-Scanner-Session': recoveryScope.sessionKey } }); const result = await response.json(); setActivity(`Salida posterior ficticia; ${result.qaMovements} movimientos en el servidor local.`); }} className="min-h-11 w-full rounded-xl border bg-white px-3 text-sm">Simular salida posterior en otro dispositivo</button>
    <p role="status" className="text-sm">{activity}</p>
    <p className="text-sm">Código de prueba: ENK-QA2026. Sin llamadas a Supabase ni mensajes de WhatsApp.</p>
    <Scanner recoveryScope={recoveryScope} transport={transport} storage={storageMode === 'quota' ? quotaStorage : storageMode === 'denied' ? deniedStorage : undefined} />
  </section>;
}
