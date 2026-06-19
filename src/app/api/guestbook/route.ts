import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// Libro de mensajes / muro de saludos. Igual que RSVP: se guarda como JSON por
// invitación en Storage (guestbook/<id>.json), separado de builder_config para
// que el editor no pise los mensajes. POST es público (invitados); GET ?slug=
// devuelve el muro (también público, para mostrarlo en la invitación).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'invitations';
const filePath = (id: string) => `guestbook/${id}.json`;

export interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
  at: string;
}

async function ensureBucket() {
  const { data } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (!data) await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
}

async function readList(id: string): Promise<GuestbookEntry[]> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(filePath(id));
  if (error || !data) return [];
  try {
    const arr = JSON.parse(await data.text());
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function invId(slug: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('invitations').select('id').eq('slug', slug).single();
  return data?.id ?? null;
}

export async function GET(request: NextRequest) {
  const slug = new URL(request.url).searchParams.get('slug');
  if (!slug) return NextResponse.json([]);
  const id = await invId(slug);
  if (!id) return NextResponse.json([]);
  const list = await readList(id);
  // Más recientes primero.
  return NextResponse.json(list.slice().reverse());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = String(body.slug || '').trim();
    const name = String(body.name || '').trim().slice(0, 60);
    const message = String(body.message || '').trim().slice(0, 280);
    if (!slug || !name || !message) {
      return NextResponse.json({ error: 'Completa tu nombre y mensaje.' }, { status: 400 });
    }

    const id = await invId(slug);
    if (!id) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });

    const entry: GuestbookEntry = {
      id: `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name, message, at: new Date().toISOString(),
    };

    await ensureBucket();
    const list = await readList(id);
    list.push(entry);
    const buffer = Buffer.from(JSON.stringify(list.slice(-500))); // tope defensivo
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath(id), buffer, { contentType: 'application/json', upsert: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error del servidor' }, { status: 500 });
  }
}
