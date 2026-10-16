import { supabaseAdmin } from './supabase/server';
import { mapGuestRow } from './guests';
import { mapRsvpRow } from './rsvps';
import { invitationServiceConfig } from './package-services-server';
import { allowsService } from './packages';
import { responseRows } from './response-sheet';
import { hostMetrics, rosterCsv, type HostGuest, type HostSnapshot } from './host-dashboard';
import { readValidity } from './validity-server';
import { withGuestMetadata } from './guest-metadata';
import { defaultRosterQuery, type RosterQuery } from './roster-query';

/** Llamar únicamente después de verificar la sesión y la propiedad del evento. */
export async function readHostSnapshot(invitationId: string, query: RosterQuery = defaultRosterQuery(), pageSize: 25 | 250 = 25): Promise<HostSnapshot> {
  const { config } = await invitationServiceConfig(invitationId);
  const operational = allowsService(config, 'hostPanel');
  if (!operational && !allowsService(config, 'rsvp')) throw new Error('SERVICE_NOT_INCLUDED');
  const services = {
    guestManagement: operational && allowsService(config, 'guestManagement'),
    qrAccess: operational && allowsService(config, 'qrAccess'),
    tableAssignment: operational && allowsService(config, 'tableAssignment'),
  };
  const paginated = operational && services.guestManagement;
  const { data, error } = paginated
    ? await supabaseAdmin.rpc('enkarta_host_roster', { p_invitation_id: invitationId, p_filter: query.filter, p_page: query.page, p_size: pageSize,
      p_selected: query.selected, p_tables: services.tableAssignment, p_qr: services.qrAccess })
    : await supabaseAdmin.rpc('enkarta_host_snapshot', { p_invitation_id: invitationId });
  if (error) throw error;
  if (!data || !Array.isArray(data.guests) || !Array.isArray(data.rsvps)
    || (paginated ? !data.roster || !data.metrics || !Array.isArray(data.selectedGuests) || data.guests.length > pageSize : !Array.isArray(data.occupancy))) throw new Error('SERVICE_UNAVAILABLE');
  const occupancy = new Map<string, number>(paginated ? [...data.guests, ...data.selectedGuests].map((o: { id: string; inside: number }) => [o.id, o.inside]) : data.occupancy.map((o: { guest_id: string; inside: number }) => [o.guest_id, o.inside]));
  const mapped = data.guests.map((row: Record<string, unknown>) => mapGuestRow(row, true));
  const operationalGuest = (g: ReturnType<typeof mapGuestRow>): HostGuest => {
    const metadata = withGuestMetadata(g, config.guestMeta?.[g.publicId]);
    // Lista explícita de campos; no propagar filas SQL o metadatos arbitrarios.
    return { id: g.id, publicId: g.publicId, name: g.name, passes: g.passes, status: g.status,
      allowKids: g.allowKids, sent: g.sent, confirmedPasses: g.confirmedPasses, confirmName: g.confirmName,
      message: g.message, respondedAt: g.respondedAt, responseRevision: g.responseRevision,
      deliveryStatus: g.deliveryStatus, whatsappOpenedAt: g.whatsappOpenedAt, manuallyMarkedAt: g.manuallyMarkedAt,
      lastReminderAt: g.lastReminderAt, reminderCount: g.reminderCount,
      tableNo: services.tableAssignment ? g.tableNo : undefined, accessCode: services.qrAccess ? g.accessCode : undefined,
      inside: services.qrAccess ? occupancy.get(g.id) ?? 0 : 0,
      phone: metadata.phone, group: metadata.group, eventAccess: metadata.eventAccess,
      metadataStored: metadata.metadataStored,
    };
  };
  const guests: HostGuest[] = services.guestManagement ? mapped.map(operationalGuest) : [];
  const { validity } = await readValidity(invitationId);
  return { syncedAt: data.syncedAt, mode: operational ? 'operations' : 'responses', services, validity,
    guests, rows: responseRows(paginated ? [] : mapped, data.rsvps.map(mapRsvpRow)), metrics: paginated ? data.metrics : operational ? hostMetrics(guests) : null,
    ...(paginated ? { roster: data.roster, selectedGuests: data.selectedGuests.map((row: Record<string, unknown>) => operationalGuest(mapGuestRow(row, true))) } : {}) };
}

/** Explicit export only: bounded SQL batches, no truncation at PostgREST's row cap.
 * If edits/access change between batches, discard the entire export. */
export async function readHostRosterCsv(invitationId: string, query: RosterQuery): Promise<string> {
  let version: string | undefined, serviceKey: string | undefined; const parts: string[] = [];
  for (let page = 1; ; page++) {
    const snapshot = await readHostSnapshot(invitationId, { ...query, page, selected: [] }, 250);
    if (!snapshot.roster || !snapshot.services.guestManagement) throw new Error('SERVICE_NOT_INCLUDED');
    const currentServices = JSON.stringify(snapshot.services);
    if (version !== undefined && (version !== snapshot.roster.version || serviceKey !== currentServices)) throw new Error('ROSTER_CHANGED');
    version = snapshot.roster.version;
    serviceKey = currentServices;
    const csv = rosterCsv(snapshot.guests, snapshot.services);
    parts.push(page === 1 ? csv : csv.slice(csv.indexOf('\r\n') + 2));
    if (page >= snapshot.roster.pages) return parts.filter(Boolean).join('\r\n');
  }
}
