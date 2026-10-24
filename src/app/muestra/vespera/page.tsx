import type { Metadata } from 'next';
import Vespera from '@/components/invitations/Vespera';
import { vesperaDemo } from '@/lib/vespera';

export const metadata: Metadata = {
  title: 'Véspera · invitación de boda',
  description: 'Una variante independiente con fotografías creadas para esta invitación, sobre, música y animaciones originales. Muestra sin envíos ni pagos.',
  robots: { index: false, follow: false }, alternates: { canonical: '/muestra/vespera' },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ full?: string; preview?: string }> }) {
  const query = await searchParams;
  return <Vespera data={vesperaDemo()} demo preview={query.preview === '1'} skipEntry={query.full === '1' || query.preview === '1'} />;
}
