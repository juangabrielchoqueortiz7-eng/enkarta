import { redirect } from 'next/navigation';
import Scanner from '@/components/admin/scanner/Scanner';
import { getHostSession, getAdminSession } from '@/lib/host-session';

// Escáner de acceso para el personal de puerta. Detrás de la sesión del evento
// (el cliente entra por /panel) o de la sesión admin del equipo Enkarta.
export const dynamic = 'force-dynamic';

export default async function ScanPage() {
  const host = await getHostSession();
  const admin = await getAdminSession();
  if (!host && !admin) redirect('/panel');

  return (
    <div className="min-h-screen" style={{ background: '#f3f1ec' }}>
      <Scanner />
    </div>
  );
}
