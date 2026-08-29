import { hostMetrics, type HostGuest, type HostSnapshot } from '../host-dashboard';
import { responseRows } from '../response-sheet';

export function hostFixture(): HostSnapshot {
  const guests: HostGuest[] = [
    { id: '20000000-0000-4000-8000-000000000011', publicId: 'DEMO0001', name: 'Familia Méndez', passes: 4, confirmedPasses: 3, allowKids: true, sent: true, status: 'confirmed', responseRevision: 1, inside: 0, tableNo: '2', group: 'Familia', accessCode: 'ENK-DEMO' },
    { id: '20000000-0000-4000-8000-000000000012', publicId: 'DEMO0002', name: 'José Fernández', passes: 2, allowKids: false, sent: true, status: 'pending', responseRevision: 0, inside: 0, group: 'Amigos' },
    { id: '20000000-0000-4000-8000-000000000013', publicId: 'DEMO0003', name: 'Lucía y Sebastián', passes: 2, confirmedPasses: 2, allowKids: false, sent: true, status: 'confirmed', responseRevision: 1, inside: 0, tableNo: '3', group: 'Amigos' },
    { id: '20000000-0000-4000-8000-000000000014', publicId: 'DEMO0004', name: 'María del Carmen', passes: 1, allowKids: true, sent: false, status: 'declined', responseRevision: 1, inside: 0, group: 'Familia' },
  ];
  return { syncedAt: new Date().toISOString(), mode: 'operations', services: { guestManagement: true, qrAccess: true, tableAssignment: true }, guests, metrics: hostMetrics(guests), rows: responseRows(guests, [{ id: 'demo-open', name: 'Respuesta de ejemplo', attending: 'yes', passes: 2, at: '2026-08-28T12:00:00Z', message: '¡Gracias por invitarnos!' }]) };
}
