import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requirePartnerPage, serializePartner } from '@/lib/partner-session';
import { billingInstructions } from '@/lib/partner-billing';
import { withSignedReceipts } from '@/lib/partner-receipts';
import PartnerDashboard, { type PartnerAccount } from '@/components/partners/PartnerDashboard';
import { isPartnerPlan } from '@/lib/partner-plans';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Mi panel de socio' };

export default async function PartnerPanelPage({ searchParams }: { searchParams: Promise<{ tab?: string; plan?: string }> }) {
  const selection = await searchParams;
  const context = await requirePartnerPage();

  const { data: payments, error: paymentError } = await supabaseAdmin
    .from('partner_payments')
    .select('id,reference,plan_key,months,amount_bs,method,receipt_url,quote_locked_at,status,review_note,created_at,period_end')
    .eq('partner_id', context.partner.id)
    .order('created_at', { ascending: false })
    .limit(24);
  if (paymentError) throw paymentError;

  const account = {
    ...serializePartner(context),
    payments: await withSignedReceipts(payments ?? []),
    billing: billingInstructions(),
  } as PartnerAccount;

  return <PartnerDashboard initialAccount={account} initialTab={selection.tab === 'suscripcion' || selection.tab === 'cuenta' ? selection.tab : 'invitaciones'} selectedPlan={isPartnerPlan(selection.plan) ? selection.plan : undefined} />;
}
