import { supabaseAdmin } from '@/lib/supabase/server';
import { parseInvitation, Invitation } from '@/lib/types';
import { getHostSession } from '@/lib/host-session';
import { readGuests } from '@/lib/guests';
import { readRsvps } from '@/lib/rsvps';
import HostLogin from '@/components/admin/host/HostLogin';
import HostDashboard, { HostMetrics } from '@/components/admin/host/HostDashboard';

// Punto de entrada del cliente. Sin sesión → pantalla de acceso; con sesión →
// su panel de operación (solo su evento). El equipo Enkarta entra por /admin.
export const dynamic = 'force-dynamic';

export default async function PanelPage() {
  const invitationId = await getHostSession();
  if (!invitationId) return <HostLogin />;

  const { data } = await supabaseAdmin.from('invitations').select('*').eq('id', invitationId).single();
  if (!data) return <HostLogin />;

  const invitation = parseInvitation(data as Invitation);
  const guests = await readGuests(invitationId);
  const rsvps = await readRsvps(invitationId);

  // Ingresos reales: asientos marcados "dentro" entre los invitados del evento.
  let checkedIn = 0;
  if (guests.length) {
    const { count } = await supabaseAdmin
      .from('attendees')
      .select('id', { count: 'exact', head: true })
      .in('guest_id', guests.map(g => g.id))
      .eq('state', 'in');
    checkedIn = count ?? 0;
  }

  const confirmed = guests.filter(g => g.status === 'confirmed');
  const metrics: HostMetrics = {
    total: guests.length,
    passes: guests.reduce((s, g) => s + (g.passes || 1), 0),
    sent: guests.filter(g => g.sent).length,
    confirmed: confirmed.length,
    confirmedPasses: confirmed.reduce((s, g) => s + (g.confirmedPasses ?? g.passes ?? 1), 0),
    checkedIn,
  };

  return <HostDashboard invitation={invitation} metrics={metrics} rsvps={rsvps} />;
}
