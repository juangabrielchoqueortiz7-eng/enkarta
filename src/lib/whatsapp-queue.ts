import type { Guest } from './types';
import { deliveryState, type DeliveryAction } from './guest-delivery';
import { normalizeGuestPhone } from './guest-import';
import { isRevision } from './rsvp-contract';

export type QueuePurpose = 'invitation' | 'reminder';
export function whatsappQueue(guests: Guest[], purpose: QueuePurpose) {
  const seen = new Set<string>(); let invalidPhone = 0, excluded = 0;
  const ids: string[] = [];
  for (const guest of guests) {
    if (seen.has(guest.id)) continue; seen.add(guest.id);
    if (guest.status !== 'pending' || (purpose === 'invitation' && deliveryState(guest) !== 'pending')) { excluded++; continue; }
    if (!normalizeGuestPhone(guest.phone || '')) { invalidPhone++; continue; }
    ids.push(guest.id);
  }
  return { ids: ids.slice(0, 200), overflow: Math.max(0, ids.length - 200), invalidPhone, excluded };
}
export interface DeliveryOperation { guestId: string; action: DeliveryAction; expectedRevision: number; requestId: string }
export class DeliveryTrackingError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); }
}
/** Caller retains this exact operation after a lost response. Retrying never opens WhatsApp. */
export async function trackGuestDelivery(operation: DeliveryOperation, transport: typeof fetch = fetch): Promise<Guest> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
  let response: Response;
  try { response = await transport('/api/guests/delivery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guestId: operation.guestId, action: operation.action, expectedRevision: operation.expectedRevision, requestId: operation.requestId }), signal: controller.signal }); }
  catch { throw new DeliveryTrackingError('No pudimos comprobar el seguimiento. Reintenta el registro sin volver a abrir WhatsApp.', true); }
  let result;
  try { result = await response.json(); } catch { throw new DeliveryTrackingError('Respuesta incompleta. Reintenta el registro del seguimiento.', true); }
  if (!response.ok) throw new DeliveryTrackingError(result?.error || 'No se pudo registrar el seguimiento.', response.status >= 500 || response.status === 429);
  if (result?.guest?.id !== operation.guestId || !isRevision(result.guest.responseRevision)
    || result.guest.responseRevision <= operation.expectedRevision || typeof result.replayed !== 'boolean') throw new DeliveryTrackingError('No se pudo comprobar la versión guardada. Reintenta el registro.', true);
  return result.guest;
  } finally { clearTimeout(timeout); }
}
