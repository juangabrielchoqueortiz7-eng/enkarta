import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { getAdminSession } from '@/lib/host-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const clean = (value: unknown, max: number) => String(value ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max);

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: 'No autorizado' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const session = (await cookies()).get('enkarta-admin')!.value;
  const paymentInstructions = clean(process.env.ENKARTA_PAYMENT_INSTRUCTIONS, 900);
  return NextResponse.json({
    paymentInstructions,
    paymentConfigured: Boolean(paymentInstructions),
    salesHours: clean(process.env.ENKARTA_SALES_HOURS, 120) || 'Lunes a sábado · 09:00–19:00',
    // Opaque storage binding, never a credential or bank instruction cache.
    draftScope: createHash('sha256').update(`enkarta:sales-quote:v1\0${session}`).digest('hex'),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
