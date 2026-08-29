import { supabaseAdmin } from './supabase/server';
import { mapGuestRow } from './guests';
import { mapRsvpRow } from './rsvps';
import { invitationServiceConfig } from './package-services-server';
import { allowsService } from './packages';
import { responseRows } from './response-sheet';
import { hostMetrics, type HostGuest, type HostSnapshot } from './host-dashboard';
import { readValidity } from './validity-server';

/** Llamar únicamente después de verificar la sesión y la propiedad del evento. */
export async function readHostSnapshot(invitationId: string): Promise<HostSnapshot> {
  const { config } = await invitationServiceConfig(invitationId);
  const operational = allowsService(config, 'hostPanel');
  if (!operational && !allowsService(config, 'rsvp')) throw new Error('SERVICE_NOT_INCLUDED');
  const services = {
    guestManagement: operational && allowsService(config, 'guestManagement'),
    qrAccess: operational && allowsService(config, 'qrAccess'),
    tableAssignment: operational && allowsService(config, 'tableAssignment'),
  };
  const { data, error } = await supabaseAdmin.rpc('enkarta_host_snapshot', { p_invitation_id: invitationId });
  if (error) throw error;
  if (!data || !Array.isArray(data.guests) || !Array.isArray(data.rsvps) || !Array.isArray(data.occupancy)) throw new Error('SERVICE_UNAVAILABLE');
  const occupancy = new Map<string, number>(data.occupancy.map((o: { guest_id: string; inside: number }) => [o.guest_id, o.inside]));
  const mapped = data.guests.map(mapGuestRow);
  const guests: HostGuest[] = services.guestManagement ? mapped.map((g: ReturnType<typeof mapGuestRow>) => {
    const meta = config.guestMeta?.[g.publicId];
    // Lista explícita de campos; no propagar filas SQL o metadatos arbitrarios.
    return { id: g.id, publicId: g.publicId, name: g.name, passes: g.passes, status: g.status,
      allowKids: g.allowKids, sent: g.sent, confirmedPasses: g.confirmedPasses, confirmName: g.confirmName,
      message: g.message, respondedAt: g.respondedAt, responseRevision: g.responseRevision,
      deliveryStatus: g.deliveryStatus, whatsappOpenedAt: g.whatsappOpenedAt, manuallyMarkedAt: g.manuallyMarkedAt,
      lastReminderAt: g.lastReminderAt, reminderCount: g.reminderCount,
      tableNo: services.tableAssignment ? g.tableNo : undefined, accessCode: services.qrAccess ? g.accessCode : undefined,
      inside: services.qrAccess ? occupancy.get(g.id) ?? 0 : 0,
      phone: typeof meta?.phone === 'string' ? meta.phone : undefined,
      group: typeof meta?.group === 'string' ? meta.group : undefined,
    };
  }) : [];
  const { validity } = await readValidity(invitationId);
  return { syncedAt: data.syncedAt, mode: operational ? 'operations' : 'responses', services, validity,
    guests, rows: responseRows(mapped, data.rsvps.map(mapRsvpRow)), metrics: operational ? hostMetrics(guests) : null };
}
