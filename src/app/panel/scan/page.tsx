import { redirect } from 'next/navigation';
import Scanner from '@/components/admin/scanner/Scanner';
import { getHostSession, getAdminSession, canManageInvitation, scannerRecoveryScope } from '@/lib/host-session';
import { invitationServiceConfig } from '@/lib/package-services-server';
import { allowsService } from '@/lib/packages';

// Escáner de acceso para el personal de puerta. Detrás de la sesión del evento
// (el cliente entra por /panel) o de la sesión admin del equipo Enkarta.
export const dynamic = 'force-dynamic';

export default async function ScanPage() {
  const host = await getHostSession();
  const admin = await getAdminSession();
  if (!host && !admin) redirect('/panel');
  if (!admin && (!host || !await canManageInvitation(host, 'qrAccess'))) redirect('/panel');
  const tables = host ? allowsService((await invitationServiceConfig(host)).config, 'tableAssignment') : false;
  const recoveryScope = await scannerRecoveryScope(admin ? 'admin' : 'host', admin ? undefined : host!);

  return (
    <div className="min-h-screen" style={{ background: '#f3f1ec' }}>
      <Scanner recoveryScope={recoveryScope} invitationId={host || undefined} tableSearch={tables} />
    </div>
  );
}
