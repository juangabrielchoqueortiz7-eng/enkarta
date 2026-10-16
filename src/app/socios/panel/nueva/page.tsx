import type { Metadata } from 'next';
import { requirePartnerPage } from '@/lib/partner-session';
import PartnerDesignPicker from '@/components/partners/PartnerDesignPicker';
import { partnerNewDesignPath, selectedPartnerDesign } from '@/lib/partner-journey';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Nueva invitación' };

export default async function PartnerNewInvitationPage({ searchParams }: { searchParams: Promise<{ design?: string }> }) {
  const selectedDesign = selectedPartnerDesign((await searchParams).design);
  const context = await requirePartnerPage(partnerNewDesignPath(selectedDesign));
  return <PartnerDesignPicker plan={context.subscription.plan} canPublish={context.subscription.active} selectedDesign={selectedDesign} totalInvitations={context.totalInvitations} />;
}
