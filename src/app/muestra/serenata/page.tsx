import type { Metadata } from 'next';
import Serenata from '@/components/invitations/Serenata';
import { serenataDemo } from '@/lib/serenata';

export const metadata: Metadata = {
  title: 'Serenata · invitación romántica',
  description: 'Una variante independiente con fotografías creadas para esta invitación, sobre, música y animaciones originales. Muestra sin envíos ni pagos.',
  robots: { index: false, follow: false }, alternates: { canonical: '/muestra/serenata' },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ full?: string; preview?: string }> }) {
  const query = await searchParams;
  return <Serenata data={serenataDemo()} demo skipEntry={query.full === '1' || query.preview === '1'} />;
}
