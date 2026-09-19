import type { Metadata } from 'next';
import { requirePartnerPage } from '@/lib/partner-session';
import PartnerDesignPicker from '@/components/partners/PartnerDesignPicker';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Nueva invitación' };

export default async function PartnerNewInvitationPage() {
  const context = await requirePartnerPage();
  return <PartnerDesignPicker plan={context.subscription.plan} canPublish={context.subscription.active} />;
}
