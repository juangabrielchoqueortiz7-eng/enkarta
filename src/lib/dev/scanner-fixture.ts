import type { ScannerGroup } from '../scanner-contract';
import type { ScannerRole, ScanRecoveryScope } from '../scan-recovery';

export const SCANNER_QA_EVENTS = ['40000000-0000-4000-8000-000000000017', '40000000-0000-4000-8000-000000000018'];
export function scannerQaScope(event: string, role: ScannerRole, secondSession: boolean): ScanRecoveryScope {
  return { role, sessionKey: (role === 'door' ? 'd' : role === 'admin' ? 'a' : 'c').repeat(63) + (secondSession ? '2' : '1'), ...(role === 'admin' ? {} : { invitationId: event }) };
}
export function scannerQaGroup(event: string): ScannerGroup {
  const prefix = event === SCANNER_QA_EVENTS[1] ? '41000000' : '40000000';
  const guestId = `${prefix}-0000-4000-8000-000000000001`;
  return { invitationId: event, guest: { id: guestId, name: 'Familia Pérez ficticia', tableNo: '7', accessCode: 'ENK-QA2026' },
    attendees: Array.from({ length: 4 }, (_, i) => ({ id: `${prefix}-0000-4000-8000-${String(101 + i).padStart(12, '0')}`, guestId, seatNo: i + 1, label: `Persona ${i + 1}`, revision: 0, state: 'out' })) };
}
