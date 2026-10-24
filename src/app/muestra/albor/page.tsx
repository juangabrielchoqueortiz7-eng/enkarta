import type { Metadata } from 'next';
import Albor from '@/components/invitations/Albor';
import { alborDemo } from '@/lib/albor';

export const metadata: Metadata = {
  title: 'Albor · invitación de boda',
  description: 'Una variante independiente con fotografías creadas para esta invitación, sobre, música y animaciones originales. Muestra sin envíos ni pagos.',
  robots: { index: false, follow: false }, alternates: { canonical: '/muestra/albor' },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ full?: string; preview?: string }> }) {
  const query = await searchParams;
  return <Albor data={alborDemo()} demo preview={query.preview === '1'} skipEntry={query.full === '1' || query.preview === '1'} />;
}
