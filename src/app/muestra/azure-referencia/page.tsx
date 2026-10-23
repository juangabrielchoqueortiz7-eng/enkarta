import type { Metadata } from 'next';
import AzureReference from '@/components/invitations/AzureReference';
import { azureReferenceDemo } from '@/lib/azure-reference';

export const metadata: Metadata = {
  title: { absolute: 'Azure · muestra independiente — Enkarta' },
  description: 'Muestra independiente de Azure con entrada, música, fecha, lugares, itinerario y regalos editables. La confirmación y los regalos de esta muestra son demostraciones sin envíos ni pagos.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/muestra/azure-referencia' },
};

export default async function Page({ searchParams }: {
  searchParams: Promise<{ full?: string; preview?: string }>;
}) {
  const query = await searchParams;
  return <AzureReference data={azureReferenceDemo()} demo skipEntry={query.full === '1' || query.preview === '1'} />;
}
