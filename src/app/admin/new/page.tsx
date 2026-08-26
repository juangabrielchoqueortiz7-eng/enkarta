import NewInvitationPicker from '@/components/admin/NewInvitationPicker';
import { requireAdminPage } from '@/lib/host-session';

export const dynamic = 'force-dynamic';

export default async function NewInvitationPage() {
  await requireAdminPage(); // solo el equipo Enkarta
  return <NewInvitationPicker />;
}
