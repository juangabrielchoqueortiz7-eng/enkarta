import { notFound } from 'next/navigation';
import Azure from '@/components/invitations/Azure';
import Primicia from '@/components/invitations/Primicia';
import { azureSample } from '@/components/invitations/sampleData';

interface Props {
  params: Promise<{ template: string }>;
  searchParams: Promise<{ n?: string; m?: string }>;
}

export default async function MuestraPage({ params, searchParams }: Props) {
  const { template } = await params;
  const { n, m } = await searchParams;
  const key = template.toLowerCase();

  if (key === 'azure') {
    return <Azure data={{ ...azureSample, guestName: m ?? azureSample.guestName, guestPasses: n ?? azureSample.guestPasses }} />;
  }
  if (key === 'primicia') {
    return <Primicia guestName={m} guestPasses={n} />;
  }
  notFound();
}

export function generateStaticParams() {
  return [{ template: 'azure' }, { template: 'primicia' }];
}
