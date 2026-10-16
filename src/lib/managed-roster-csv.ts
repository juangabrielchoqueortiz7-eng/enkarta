import { csvCell, type HostGuest, type HostSnapshot } from './host-dashboard';
import { deliveryState, DELIVERY_LABELS } from './guest-delivery';
import { RESPONSE_LABELS } from './response-sheet';

/** Explicit builder export keeps contacts and personal links; no access tokens. */
export function managedRosterCsv(guests: HostGuest[], services: HostSnapshot['services'], origin: string, slug: string) {
  const base = new URL(origin).origin;
  const preference = { both: 'Todo el evento', ceremony: 'Ceremonia', reception: 'Recepción' };
  const header = ['Nombre', 'Teléfono', 'Grupo', 'Preferencia informativa', ...(services.tableAssignment ? ['Mesa'] : []), 'Pases', 'Estado', 'Pases confirmados', 'Seguimiento', 'Recordatorios', 'Enlace personal', ...(services.qrAccess ? ['Dentro ahora'] : [])];
  const rows = guests.map(guest => [guest.name, guest.phone || '', guest.group || '', preference[guest.eventAccess ?? 'both'], ...(services.tableAssignment ? [guest.tableNo || 'Sin asignar'] : []),
    guest.passes, RESPONSE_LABELS[guest.status], guest.status === 'confirmed' ? guest.confirmedPasses ?? guest.passes : 0, DELIVERY_LABELS[deliveryState(guest)], guest.reminderCount ?? 0,
    `${base}/i/${encodeURIComponent(slug)}?g=${encodeURIComponent(guest.publicId)}`, ...(services.qrAccess ? [guest.inside] : [])]);
  return '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(';')).join('\r\n');
}
