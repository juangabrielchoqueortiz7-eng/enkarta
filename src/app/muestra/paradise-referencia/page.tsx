import type { Metadata } from 'next';
import ParadiseReference from '@/components/invitations/ParadiseReference';
import { paradiseReferenceDemo } from '@/lib/paradise-reference';

export const metadata: Metadata = {
  title: { absolute: 'Paradise · muestra independiente — Enkarta' },
  description: 'Muestra independiente de Paradise con entrada, música, fotografías y secciones editables. La confirmación y los regalos de esta muestra son demostraciones sin envíos ni pagos.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/muestra/paradise-referencia' },
};

export default async function Page({ searchParams }: {
  searchParams: Promise<{ full?: string; preview?: string }>;
}) {
  const query = await searchParams;
  return <ParadiseReference data={paradiseReferenceDemo()} demo skipEntry={query.full === '1' || query.preview === '1'} />;
}
