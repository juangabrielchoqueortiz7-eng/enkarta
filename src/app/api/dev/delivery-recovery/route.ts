import { NextRequest, NextResponse } from 'next/server';
import { parseDeliveryInput } from '@/lib/guest-delivery';
import type { Guest } from '@/lib/types';

export const dynamic = 'force-dynamic';
const guestId = '60000000-0000-4000-8000-000000000001';
type Receipts = Map<string, { body: string; guest: Guest }>;
// Preserve only synthetic receipts across Next.js development module reloads.
const devRuntime = globalThis as typeof globalThis & { enkartaDeliveryQa?: Receipts };
const receipts: Receipts = process.env.NODE_ENV === 'development'
  ? devRuntime.enkartaDeliveryQa ??= new Map() : new Map();

/** Development-only synthetic server. No Supabase, messages or bank calls. */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') return new NextResponse(null, { status: 404 });
  try {
    const operation = parseDeliveryInput(await request.json());
    if (operation.guestId !== guestId) return NextResponse.json({ error: 'Solo se admiten datos ficticios.' }, { status: 400 });
    const body = JSON.stringify(operation), previous = receipts.get(operation.requestId);
    if (previous) {
      if (previous.body !== body) return NextResponse.json({ error: 'Identidad de prueba en conflicto.' }, { status: 409 });
      return NextResponse.json({ guest: previous.guest, replayed: true });
    }
    if (receipts.size >= 100) return NextResponse.json({ error: 'Reinicia el servidor de prueba.' }, { status: 503 });
    const guest: Guest = { id: guestId, publicId: 'QAONLY01', name: 'Familia Pérez ficticia', passes: 4,
      allowKids: true, sent: operation.action === 'manual', deliveryStatus: operation.action === 'manual' ? 'marked' : 'opened',
      status: 'pending', responseRevision: operation.expectedRevision + 1, reminderCount: operation.action === 'reminder' ? 1 : 0 };
    receipts.set(operation.requestId, { body, guest });
    return NextResponse.json({ guest, replayed: false });
  } catch { return NextResponse.json({ error: 'Operación ficticia inválida.' }, { status: 400 }); }
}
