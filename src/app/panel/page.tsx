import { supabaseAdmin } from '@/lib/supabase/server';
import { parseInvitation, Invitation } from '@/lib/types';
import { getHostSession } from '@/lib/host-session';
import HostLogin from '@/components/admin/host/HostLogin';
import LiveHostPanel from '@/components/admin/host/LiveHostPanel';
import { allowsService } from '@/lib/packages';
import { clientInvitation } from '@/lib/client-invitation';
import { readHostSnapshot } from '@/lib/host-dashboard-server';
import SessionExit from '@/components/admin/host/SessionExit';

export const dynamic = 'force-dynamic';

export default async function PanelPage() {
  const invitationId = await getHostSession();
  if (!invitationId) return <HostLogin />;
  const { data } = await supabaseAdmin.from('invitations').select('*').eq('id', invitationId).single();
  if (!data) return <HostLogin />;
  const invitation = parseInvitation(data as Invitation);
  if (!allowsService(invitation.config, 'hostPanel') && !allowsService(invitation.config, 'rsvp')) return <main className="p-8 text-center"><p>Este paquete no incluye planilla ni gestión de invitados.</p><a href="/revision" className="underline">Revisar el diseño</a><SessionExit /></main>;
  // No convertir fallos de conexión en listas vacías ni importar Storage al sondear.
  const initial = await readHostSnapshot(invitationId).catch(() => null);
  return <LiveHostPanel invitation={clientInvitation(invitation, true)} initial={initial} />;
}
