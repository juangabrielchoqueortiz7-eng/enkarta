import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getPartnerContext } from '@/lib/partner-session';
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
    const now = new Date().toISOString();

    const { data: pending } = await supabaseAdmin
      .from('partner_payments').select('id,reference')
      .eq('partner_id', context.partner.id).eq('status', 'pending')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (pending) {
      const { data, error } = await supabaseAdmin.from('partner_payments')
        .update({ plan_key: plan, months, amount_bs: amount, method, updated_at: now })
        .eq('id', pending.id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ payment: data, billing: billingInstructions() });
    }

    // La referencia es única: reintentar cubre la colisión improbable de códigos.
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await supabaseAdmin.from('partner_payments').insert({
        reference: genPaymentReference(), partner_id: context.partner.id,
        plan_key: plan, months, amount_bs: amount, method, created_at: now, updated_at: now,
      }).select().single();
      if (!error) return NextResponse.json({ payment: data, billing: billingInstructions() }, { status: 201 });
      if (error.code !== '23505') return NextResponse.json({ error: error.message }, { status: 400 });
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

    const { error } = await supabaseAdmin.from('partner_payments')
      .delete().eq('id', id).eq('partner_id', context.partner.id).eq('status', 'pending');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Sin pagos en revisión, la suscripción deja de anunciar una revisión en curso.
    const { data: rest } = await supabaseAdmin.from('partner_payments')
      .select('id').eq('partner_id', context.partner.id).eq('status', 'pending').limit(1);
    if (!rest?.length && context.subscription.status === 'pending') {
      await supabaseAdmin.from('partner_subscriptions')
        .update({ status: 'none', updated_at: new Date().toISOString() })
        .eq('partner_id', context.partner.id);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
