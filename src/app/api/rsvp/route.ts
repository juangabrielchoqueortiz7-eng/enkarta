import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { RsvpEntry } from '@/lib/types';

// Confirmaciones de asistencia (RSVP). Se guardan como JSON por invitación en
// Storage (rsvps/<id>.json), separado de builder_config para que el guardado del
// editor NO pise las respuestas de los invitados. POST es público (lo usan los
// invitados); GET ?id= lo usa el panel del admin.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'invitations';
const filePath = (id: string) => `rsvps/${id}.json`;

async function ensureBucket() {
  const { data } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (!data) await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
}

async function readList(id: string): Promise<RsvpEntry[]> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(filePath(id));
  if (error || !data) return [];
  try {
    const arr = JSON.parse(await data.text());
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json([]);
  return NextResponse.json(await readList(id));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = String(body.slug || '').trim();
    if (!slug) return NextResponse.json({ error: 'slug requerido' }, { status: 400 });

    const { data: inv } = await supabaseAdmin.from('invitations').select('id').eq('slug', slug).single();
    if (!inv) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });

    const entry: RsvpEntry = {
      id: `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: String(body.name || '').trim().slice(0, 80) || 'Invitado',
      attending: body.attending === 'no' ? 'no' : 'yes',
      passes: Math.max(0, Math.min(20, Number(body.passes) || 1)),
      message: String(body.message || '').trim().slice(0, 400),
      at: new Date().toISOString(),
    };

    await ensureBucket();
    const list = await readList(inv.id);
    list.push(entry);
    const buffer = Buffer.from(JSON.stringify(list));
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath(inv.id), buffer, { contentType: 'application/json', upsert: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error del servidor' }, { status: 500 });
  }
}
