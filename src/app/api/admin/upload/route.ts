import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/host-session';
import { sanitizeSvg } from '@/lib/sanitize-svg';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UNAUTH = NextResponse.json({ error: 'No autorizado' }, { status: 401 });

const BUCKET = 'invitations';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;   // 8 MB
const MAX_SVG_BYTES = 1 * 1024 * 1024;     // 1 MB (vectores de Canva)
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;  // 15 MB
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'];
const ALLOWED_AUDIO = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/x-m4a', 'audio/mp4'];

let bucketReady = false;

/** Crea el bucket público una sola vez por proceso (idempotente). */
async function ensureBucket() {
  if (bucketReady) return;
  const { data } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (!data) {
    await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_AUDIO_BYTES,
    });
  }
  bucketReady = true;
}

function slugifyName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'file';
  const ext = (dot > 0 ? name.slice(dot + 1) : 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${base}.${ext || 'bin'}`;
}

export async function POST(request: NextRequest) {
  if (!(await getAdminSession())) return UNAUTH;
  try {
    const form = await request.formData();
    const file = form.get('file');
    const folderRaw = (form.get('folder') as string) || 'misc';
    const ownerId = (form.get('id') as string) || 'shared';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    const isAudio = file.type.startsWith('audio/');
    const isSvg = file.type === 'image/svg+xml';
    const allowed = isAudio ? ALLOWED_AUDIO : ALLOWED_IMAGE;
    const maxBytes = isAudio ? MAX_AUDIO_BYTES : isSvg ? MAX_SVG_BYTES : MAX_IMAGE_BYTES;

    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: `Formato no permitido (${file.type || 'desconocido'}). Usa ${isAudio ? 'MP3/WAV/OGG' : 'JPG, PNG, WEBP, SVG o GIF'}.` },
        { status: 415 },
      );
    }
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `El archivo supera el máximo de ${Math.round(maxBytes / 1024 / 1024)} MB.` },
        { status: 413 },
      );
    }

    await ensureBucket();

    const folder = folderRaw.replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'misc';
    const safeId = ownerId.replace(/[^a-z0-9_-]/gi, '').slice(0, 64) || 'shared';
    const path = `${folder}/${safeId}/${Date.now()}-${slugifyName(file.name)}`;

    let buffer = Buffer.from(await file.arrayBuffer());

    // Los SVG se sanean antes de guardar (quitar scripts/handlers/URIs peligrosas).
    if (isSvg) {
      const clean = sanitizeSvg(buffer.toString('utf-8'));
      if (!clean) {
        return NextResponse.json({ error: 'El SVG no es válido o contiene contenido no permitido.' }, { status: 400 });
      }
      buffer = Buffer.from(clean, 'utf-8');
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({ url: pub.publicUrl, path });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error del servidor';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE ?path=... — borra un archivo subido del bucket. */
export async function DELETE(request: NextRequest) {
  if (!(await getAdminSession())) return UNAUTH;
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    if (!path) return NextResponse.json({ error: 'path requerido' }, { status: 400 });

    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
