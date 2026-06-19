import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/host-session';

// Plantillas del usuario en la nube: un único JSON (templates/index.json) en el
// bucket público 'invitations'. GET lee el array; PUT lo reescribe completo.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UNAUTH = NextResponse.json({ error: 'No autorizado' }, { status: 401 });

const BUCKET = 'invitations';
const PATH = 'templates/index.json';

async function ensureBucket() {
  const { data } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (!data) await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
}

export async function GET() {
  if (!(await getAdminSession())) return UNAUTH;
  try {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(PATH);
    if (error || !data) return NextResponse.json([]);
    const text = await data.text();
    const arr = JSON.parse(text);
    return NextResponse.json(Array.isArray(arr) ? arr : []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function PUT(request: NextRequest) {
  if (!(await getAdminSession())) return UNAUTH;
  try {
    const body = await request.json();
    if (!Array.isArray(body)) return NextResponse.json({ error: 'Se esperaba un array' }, { status: 400 });
    await ensureBucket();
    const buffer = Buffer.from(JSON.stringify(body));
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(PATH, buffer, { contentType: 'application/json', upsert: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error del servidor' }, { status: 500 });
  }
}
