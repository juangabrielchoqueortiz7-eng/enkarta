import { isRevision, isUuid } from './rsvp-contract';
import type { ScanOperation } from './scanner-contract';

export type ScannerRole = 'host' | 'door' | 'admin';
export interface ScanRecoveryScope { role: ScannerRole; sessionKey: string; invitationId?: string }
export interface ScanRecovery { invitationId: string; guestId: string; seatNo: number; operation: ScanOperation }
export type ScanRecoveryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export class ScanRecoveryWriteError extends Error {}

function validScope(scope: ScanRecoveryScope) {
  if (!scope || !['host', 'door', 'admin'].includes(scope.role) || typeof scope.sessionKey !== 'string' || !/^[a-f0-9]{64}$/.test(scope.sessionKey)
    || (scope.role !== 'admin' && !isUuid(scope.invitationId))
    || (scope.invitationId !== undefined && !isUuid(scope.invitationId))) throw new Error('INVALID_SCAN_SCOPE');
}
export function scanRecoveryKey(scope: ScanRecoveryScope) {
  validScope(scope); return `enkarta:scan:v1:${scope.role}:${scope.sessionKey}:${scope.invitationId ?? 'all'}`;
}
/** Minimal identity only. Never persist names, labels, access codes, QR or session cookies. */
export function scanRecoveryRecord(scope: ScanRecoveryScope, recovery: ScanRecovery) {
  validScope(scope);
  const operation = recovery?.operation;
  if (!isUuid(recovery?.invitationId) || (scope.invitationId && recovery.invitationId !== scope.invitationId)
    || !isUuid(recovery?.guestId) || !Number.isInteger(recovery.seatNo) || recovery.seatNo < 1 || recovery.seatNo > 20
    || !operation || !isUuid(operation.attendeeId) || !isUuid(operation.requestId) || !isRevision(operation.expectedRevision)
    || (operation.action !== 'in' && operation.action !== 'out')) throw new Error('INVALID_SCAN_RECOVERY');
  return { version: 1, role: scope.role, sessionKey: scope.sessionKey, recovery: {
    invitationId: recovery.invitationId, guestId: recovery.guestId, seatNo: recovery.seatNo,
    operation: { attendeeId: operation.attendeeId, action: operation.action, expectedRevision: operation.expectedRevision, requestId: operation.requestId },
  } };
}
export function restoreScanRecovery(raw: string | null, scope: ScanRecoveryScope): ScanRecovery | null {
  if (!raw || raw.length > 1024) return null;
  try {
    const record = JSON.parse(raw);
    if (record?.version !== 1 || record.role !== scope.role || record.sessionKey !== scope.sessionKey) return null;
    return scanRecoveryRecord(scope, record.recovery).recovery;
  } catch { return null; }
}
export function saveScanRecovery(storage: ScanRecoveryStorage, scope: ScanRecoveryScope, recovery: ScanRecovery) {
  const key = scanRecoveryKey(scope), raw = storage.getItem(key), record = scanRecoveryRecord(scope, recovery);
  const prior = restoreScanRecovery(raw, scope);
  if (raw && (!prior || JSON.stringify(prior) !== JSON.stringify(record.recovery))) return false;
  try { storage.setItem(key, JSON.stringify(record)); }
  catch { throw new ScanRecoveryWriteError('No se pudo conservar el movimiento en esta pestaña.'); }
  return true;
}
export function clearScanRecovery(storage: ScanRecoveryStorage, scope: ScanRecoveryScope, recovery: ScanRecovery) {
  const key = scanRecoveryKey(scope), raw = storage.getItem(key);
  if (!raw) return true;
  const previous = restoreScanRecovery(raw, scope);
  if (!previous || JSON.stringify(previous) !== JSON.stringify(scanRecoveryRecord(scope, recovery).recovery)) return false;
  storage.removeItem(key); return true;
}
export function discardUnreadableScan(storage: ScanRecoveryStorage, scope: ScanRecoveryScope, expectedRaw: string | null) {
  const key = scanRecoveryKey(scope);
  if (storage.getItem(key) !== expectedRaw) return false;
  storage.removeItem(key); return true;
}
export const scanRecoveryPerson = (recovery: ScanRecovery) => ({ id: recovery.operation.attendeeId, guestId: recovery.guestId, seatNo: recovery.seatNo });
