import type { Metadata } from 'next';
import Travesia from '@/components/invitations/Travesia';
import { travesiaDemo } from '@/lib/travesia';

export const metadata: Metadata = {
  title: 'Travesía · invitación de viaje',
  description: 'Una invitación independiente con imágenes creadas para esta edición. Muestra sin envíos ni pagos.',
  robots: { index: false, follow: false }, alternates: { canonical: '/muestra/travesia' },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ full?: string; preview?: string }> }) {
  const query = await searchParams;
  return <Travesia data={travesiaDemo()} demo skipEntry={query.full === '1' || query.preview === '1'} />;
}
