import { parseDeliveryInput } from './guest-delivery';
import { isUuid } from './rsvp-contract';
import { DeliveryTrackingError, type DeliveryOperation } from './whatsapp-queue';

type RecoveryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
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
  if (existing && (!previous || JSON.stringify(previous) !== JSON.stringify(record.operation))) return false;
  storage.setItem(key, JSON.stringify(record));
  return true;
}

/** A late acknowledgement must never delete a newer pending request. */
export function clearDeliveryRecovery(storage: RecoveryStorage, invitationId: string, requestId: string) {
  const key = deliveryRecoveryKey(invitationId);
  if (restoreDeliveryRecovery(storage.getItem(key), invitationId)?.requestId === requestId) storage.removeItem(key);
}
