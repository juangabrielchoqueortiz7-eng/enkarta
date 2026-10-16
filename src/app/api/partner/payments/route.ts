import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getPartnerContext } from '@/lib/partner-session';
import { integrityError } from '@/lib/integrity-server';
import { paymentProviderState } from '@/lib/payments/bcp';
import { genPaymentReference } from '@/lib/access';
import { billingInstructions } from '@/lib/partner-billing';
import { cyclePrice, isBillingCycle, isPartnerPlan, PARTNER_PAYMENT_METHODS, type PartnerPaymentMethod } from '@/lib/partner-plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const unauthenticated = () => NextResponse.json({ error: 'No autorizado' }, { status: 401 });

/**
 * Registra la intención de pago y devuelve la referencia que el socio debe
 * escribir en su transferencia. Un socio tiene como mucho un pago pendiente:
 * si cambia de plan antes de pagar, se reescribe el mismo (misma referencia).
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getPartnerContext();
    if (!context) return unauthenticated();

    const body = await request.json().catch(() => null);
    const plan = body?.plan;
    const months = Number(body?.months);
    const method = String(body?.method ?? 'qr') as PartnerPaymentMethod;

    if (!isPartnerPlan(plan)) return NextResponse.json({ error: 'Elige un plan válido.' }, { status: 400 });
    if (!isBillingCycle(months)) return NextResponse.json({ error: 'Elige un periodo válido.' }, { status: 400 });
    if (!PARTNER_PAYMENT_METHODS.includes(method)) return NextResponse.json({ error: 'Elige una forma de pago válida.' }, { status: 400 });

    const amount = cyclePrice(plan, months);
    const provider = paymentProviderState();
    if (provider.provider === 'bcp' && !provider.ready) return NextResponse.json({ error: provider.message, code: 'BCP_NOT_CONFIGURED' }, { status: 503 });

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await supabaseAdmin.rpc('enkarta_payment_intent', {
        p_partner_id: context.partner.id, p_plan: plan, p_months: months, p_amount: amount,
        p_method: method, p_reference: genPaymentReference(), p_provider: provider.provider,
      });
      if (!error) return NextResponse.json({ payment: data, billing: billingInstructions() });
      if (error.code !== '23505') return integrityError(error);
    }
    return NextResponse.json({ error: 'No se pudo generar la referencia. Intenta otra vez.' }, { status: 500 });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

/** El socio retira su pago pendiente (se equivocó de plan y aún no pagó). */
export async function DELETE(request: NextRequest) {
  try {
    const context = await getPartnerContext();
    if (!context) return unauthenticated();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    const { error } = await supabaseAdmin.rpc('enkarta_cancel_payment', { p_partner_id: context.partner.id, p_payment_id: id });
    return error ? integrityError(error) : NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
