import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/host-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const clean = (value: unknown, max: number) => String(value ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const paymentInstructions = clean(process.env.ENKARTA_PAYMENT_INSTRUCTIONS, 900);
  return NextResponse.json({
    paymentInstructions,
    paymentConfigured: Boolean(paymentInstructions),
    salesHours: clean(process.env.ENKARTA_SALES_HOURS, 120) || 'Lunes a sábado · 09:00–19:00',
  }, { headers: { 'Cache-Control': 'no-store' } });
}
