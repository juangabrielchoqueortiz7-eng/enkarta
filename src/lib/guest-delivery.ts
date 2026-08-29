import type { Guest } from './types';
import { isRevision, isUuid } from './rsvp-contract';

export type DeliveryAction = 'opened' | 'manual' | 'reminder';
export type DeliveryState = 'pending' | 'opened' | 'marked' | 'responded';
export const DELIVERY_LABELS: Record<DeliveryState,string> = { pending:'Pendiente', opened:'WhatsApp abierto', marked:'Envío marcado', responded:'Respondió' };
export function deliveryState(guest: Pick<Guest,'status'|'deliveryStatus'|'sent'>): DeliveryState {
  if (guest.status !== 'pending') return 'responded';
  if (guest.deliveryStatus === 'marked' || guest.sent) return 'marked';
  if (guest.deliveryStatus === 'opened') return 'opened';
  return 'pending';
}
export function guestMessage(template: string | undefined, guest: Pick<Guest,'name'|'passes'|'tableNo'|'accessCode'>, link: string) {
  return (template?.trim() || '¡Hola {nombre}! Aquí tienes tu invitación personal: {link}')
    .replaceAll('{nombre}',guest.name).replaceAll('{link}',link).replaceAll('{pases}',String(guest.passes))
    .replaceAll('{mesa}',guest.tableNo || 'por asignar').replaceAll('{codigo}',guest.accessCode || 'disponible al confirmar');
}
export function reminderMessage(template: string | undefined, guest: Pick<Guest,'name'|'passes'|'tableNo'|'accessCode'>, link: string) {
  return guestMessage(template || 'Hola {nombre}, te recordamos confirmar tu asistencia aquí: {link}',guest,link);
}
export function parseDeliveryInput(body: Record<string,unknown>) {
  if (!isUuid(body.guestId) || !isUuid(body.requestId) || !isRevision(body.expectedRevision)
    || !['opened','manual','reminder'].includes(String(body.action))) throw new Error('INVALID_INPUT');
  return { guestId:body.guestId, requestId:body.requestId, expectedRevision:body.expectedRevision, action:body.action as DeliveryAction };
}
