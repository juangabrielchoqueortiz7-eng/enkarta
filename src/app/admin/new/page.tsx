import InvitationForm from '@/components/admin/InvitationForm';
import { requireAdminPage } from '@/lib/host-session';

export const dynamic = 'force-dynamic';

export default async function NewInvitationPage() {
  await requireAdminPage(); // solo el equipo Enkarta
  return <InvitationForm />;
}
