import type { Metadata } from 'next';
import Opera from '@/components/invitations/Opera';
import { operaDemo } from '@/lib/opera';

export const metadata: Metadata = {
  title: 'Ópera · invitación de boda',
  description: 'Una variante independiente con fotografías creadas para esta invitación, sobre, música y animaciones originales. Muestra sin envíos ni pagos.',
  robots: { index: false, follow: false }, alternates: { canonical: '/muestra/opera' },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ full?: string; preview?: string }> }) {
  const query = await searchParams;
  return <Opera data={operaDemo()} demo preview={query.preview === '1'} skipEntry={query.full === '1' || query.preview === '1'} />;
}
