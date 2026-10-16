import { getDoorSession, canScanInvitation, scannerRecoveryScope } from '@/lib/host-session';
import HostLogin from '@/components/admin/host/HostLogin';
import SessionExit from '@/components/admin/host/SessionExit';
import Scanner from '@/components/admin/scanner/Scanner';
import { invitationServiceConfig } from '@/lib/package-services-server';
import { allowsService } from '@/lib/packages';

export const dynamic = 'force-dynamic';
export default async function DoorPage() {
  const id = await getDoorSession();
  if (!id) return <HostLogin scope="door" />;
  const tables = allowsService((await invitationServiceConfig(id)).config, 'tableAssignment');
  if (!await canScanInvitation(id)) return <main className="p-8 text-center font-outfit"><p className="mb-4">El control de acceso no está habilitado para este evento.</p><SessionExit scope="door" /></main>;
  const recoveryScope = await scannerRecoveryScope('door', id);
  return <main className="min-h-screen bg-[#f3f1ec]"><header className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-4 pt-5"><div className="font-outfit"><p className="text-sm font-medium text-gray-800">Personal de puerta</p><p className="text-xs text-gray-500">Solo validar pases y registrar entradas o salidas.</p></div><SessionExit scope="door" /></header><Scanner recoveryScope={recoveryScope} invitationId={id} tableSearch={tables} /></main>;
}
