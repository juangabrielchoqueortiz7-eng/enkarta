import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requirePartnerPage, serializePartner } from '@/lib/partner-session';
import { billingInstructions } from '@/lib/partner-billing';
import { withSignedReceipts } from '@/lib/partner-receipts';
import PartnerDashboard, { type PartnerAccount } from '@/components/partners/PartnerDashboard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Mi panel de socio' };

export default async function PartnerPanelPage() {
  const context = await requirePartnerPage();

  const { data: payments } = await supabaseAdmin
    .from('partner_payments')
    .select('id,reference,plan_key,months,amount_bs,method,receipt_url,status,review_note,created_at,period_end')
    .eq('partner_id', context.partner.id)
    .order('created_at', { ascending: false })
    .limit(24);

  const account = {
    ...serializePartner(context),
    payments: await withSignedReceipts(payments ?? []),
    billing: billingInstructions(),
  } as PartnerAccount;

  return <PartnerDashboard initialAccount={account} />;
}
