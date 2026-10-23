import type { Metadata } from 'next';
import Capitulo from '@/components/invitations/Capitulo';
import { capituloDemo } from '@/lib/capitulo';

export const metadata: Metadata = {
  title: 'Capítulo · invitación editorial',
  description: 'Una edición independiente con fotografía generada para esta invitación. Muestra sin envíos ni pagos.',
  robots: { index: false, follow: false }, alternates: { canonical: '/muestra/capitulo' },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ full?: string; preview?: string }> }) {
  const query = await searchParams;
  return <Capitulo data={capituloDemo()} demo skipEntry={query.full === '1' || query.preview === '1'} />;
}
