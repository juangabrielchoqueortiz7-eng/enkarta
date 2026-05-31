import { notFound } from 'next/navigation';
import Azure from '@/components/invitations/Azure';
import { azureSample } from '@/components/invitations/sampleData';
import { InvitationContent } from '@/components/invitations/types';

interface Props {
  params: Promise<{ template: string }>;
  searchParams: Promise<{ n?: string; m?: string }>;
}

const registry: Record<string, { Comp: (p: { data: InvitationContent }) => JSX.Element; data: InvitationContent }> = {
  azure: { Comp: Azure, data: azureSample },
};

export default async function MuestraPage({ params, searchParams }: Props) {
  const { template } = await params;
  const { n, m } = await searchParams;

  const entry = registry[template.toLowerCase()];
  if (!entry) notFound();

  const data: InvitationContent = {
    ...entry.data,
    guestName: m ?? entry.data.guestName,
    guestPasses: n ?? entry.data.guestPasses,
  };

  const { Comp } = entry;
  return <Comp data={data} />;
}

export function generateStaticParams() {
  return [{ template: 'azure' }];
}
