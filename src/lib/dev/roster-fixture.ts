import { filterRoster, hostMetrics, type HostGuest, type HostSnapshot } from '../host-dashboard';
import { rosterPage, rosterTables } from '../roster-view';
import { whatsappQueue } from '../whatsapp-queue';
import { defaultRosterQuery, type RosterQuery } from '../roster-query';

/** Synthetic HTTP contract fixture; SQL behavior is tested separately in PGlite. */
export function rosterFixture(query: RosterQuery = defaultRosterQuery()): HostSnapshot {
  const guests: HostGuest[] = Array.from({ length: 1001 }, (_, index) => ({
    id: `92000000-0000-4000-8000-${String(index).padStart(12,'0')}`, publicId: `QA-PAGE-${index}`,
    name: `Familia Pérez ${String(index).padStart(4,'0')} ficticia`, passes: 2, allowKids: true, sent: false,
    status: 'pending', inside: 0, responseRevision: 0, phone: '+59170000001', group: index % 2 ? 'Amigos' : 'Familia', tableNo: String(index % 10 + 1),
  }));
  const filtered = filterRoster(guests, query.filter), page = rosterPage(filtered, query.page);
  return { syncedAt: new Date().toISOString(), mode: 'operations', services: { guestManagement: true, tableAssignment: true, qrAccess: true },
    guests: page.items, selectedGuests: guests.filter(guest => query.selected.includes(guest.id)), metrics: hostMetrics(guests), rows: [],
    roster: { ...page, size: 25, version: 'synthetic-contract-only', groups: ['Amigos','Familia'], tables: rosterTables(guests),
      invitationQueue: whatsappQueue(filtered,'invitation'), reminderQueue: whatsappQueue(filtered,'reminder') },
  };
}
