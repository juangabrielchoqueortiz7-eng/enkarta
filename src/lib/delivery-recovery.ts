import { parseDeliveryInput } from './guest-delivery';
import { isUuid } from './rsvp-contract';
import { DeliveryTrackingError, type DeliveryOperation } from './whatsapp-queue';

export type RecoveryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export class DeliveryRecoveryWriteError extends Error {}
export const deliveryRecoveryKey = (invitationId: string) => `enkarta:delivery:v1:${invitationId}`;

/** Only an explicit refusal of the first attempt proves that no earlier write committed. */
export function deliveryFailureIsDefinitive(failure: unknown, recovering: boolean) {
  return !recovering && failure instanceof DeliveryTrackingError && !failure.retryable;
}

/** Whitelist operation identity: never persist the guest, phone, message or QR. */
export function deliveryRecoveryRecord(invitationId: string, operation: DeliveryOperation) {
  if (!isUuid(invitationId)) throw new Error('INVALID_INPUT');
  return { version: 1, invitationId, operation: parseDeliveryInput({ ...operation }) };
}

export function restoreDeliveryRecovery(value: string | null, invitationId: string): DeliveryOperation | null {
  if (!value || value.length > 1024) return null;
  try {
    const record = JSON.parse(value);
    if (record?.version !== 1 || record.invitationId !== invitationId || !record.operation) return null;
    return deliveryRecoveryRecord(invitationId, record.operation).operation;
  } catch { return null; }
}

/** Do not replace another unresolved request, including one from another panel. */
export function saveDeliveryRecovery(storage: RecoveryStorage, invitationId: string, operation: DeliveryOperation) {
  const key = deliveryRecoveryKey(invitationId), existing = storage.getItem(key);
  const previous = restoreDeliveryRecovery(existing, invitationId);
  const record = deliveryRecoveryRecord(invitationId, operation);
  if (existing !== null && (!previous || JSON.stringify(previous) !== JSON.stringify(record.operation))) return false;
  try { storage.setItem(key, JSON.stringify(record)); }
  catch { throw new DeliveryRecoveryWriteError('No se pudo conservar el seguimiento en esta pestaña.'); }
  return true;
}

/** A late acknowledgement must never delete a newer pending request. */
export function clearDeliveryRecovery(storage: RecoveryStorage, invitationId: string, operation: DeliveryOperation) {
  const key = deliveryRecoveryKey(invitationId);
  const raw = storage.getItem(key);
  if (raw === null) return true;
  const previous = restoreDeliveryRecovery(raw, invitationId);
  if (!previous || JSON.stringify(previous) !== JSON.stringify(deliveryRecoveryRecord(invitationId, operation).operation)) return false;
  storage.removeItem(key); return true;
}

export function discardUnreadableDelivery(storage: RecoveryStorage, invitationId: string, expectedRaw: string) {
  const key = deliveryRecoveryKey(invitationId);
  if (storage.getItem(key) !== expectedRaw) return false;
  storage.removeItem(key); return true;
}
