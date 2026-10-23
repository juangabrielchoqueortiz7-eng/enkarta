import type { Metadata } from 'next';
import ParadiseReference from '@/components/invitations/ParadiseReference';
import { paradiseReferenceDemo } from '@/lib/paradise-reference';

export const metadata: Metadata = {
  title: { absolute: 'Paradise · estudio de entrada y cabecera — Enkarta' },
  description: 'Muestra incremental de la entrada y cabecera de Paradise. El recorrido completo de la invitación todavía está en construcción.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/muestra/paradise-referencia' },
};

export default async function Page({ searchParams }: {
  searchParams: Promise<{ full?: string; preview?: string }>;
}) {
  const query = await searchParams;
  return <ParadiseReference data={paradiseReferenceDemo()} demo skipEntry={query.full === '1' || query.preview === '1'} />;
}
