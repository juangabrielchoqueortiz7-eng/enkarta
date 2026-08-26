import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/server';
import { parseConfig } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EVENT_TYPES = new Set([
  'view', 'entry_open', 'rsvp_start', 'rsvp_submit', 'map_open',
  'calendar_add', 'gallery_open', 'share', 'link_open', 'music_toggle',
  'scroll_25', 'scroll_50', 'scroll_75', 'scroll_100', 'cta_click',
]);

const RETENTION_DAYS = new Set([30, 90, 180, 365]);

function cleanMetadata(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const output: Record<string, string | number | boolean> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>).slice(0, 12)) {
    const safeKey = key.replace(/[^a-z0-9_-]/gi, '').slice(0, 40);
    if (!safeKey || !['string', 'number', 'boolean'].includes(typeof raw)) continue;
    output[safeKey] = typeof raw === 'string' ? raw.slice(0, 160) : raw as number | boolean;
  }
  return output;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = String(body.slug || '').trim().slice(0, 120);
    const eventType = String(body.type || '');
    const sessionId = String(body.sessionId || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 100);
    if (!slug || !sessionId || !EVENT_TYPES.has(eventType)) return NextResponse.json({ error: 'Evento inválido' }, { status: 400 });

    const { data: invitation } = await supabaseAdmin
      .from('invitations').select('id,status,is_active,expires_at,builder_config').eq('slug', slug).maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    if (!invitation || invitation.status !== 'ready' || invitation.is_active === false || (invitation.expires_at && invitation.expires_at.slice(0, 10) < today)) {
      return NextResponse.json({ error: 'Invitación no disponible' }, { status: 404 });
    }
    const config = parseConfig(invitation.builder_config);
    if (config.analytics?.enabled === false) return NextResponse.json({ ok: true, skipped: true });
    const configuredRetention = Number(config.analytics?.retentionDays ?? 180);
    const retentionDays = RETENTION_DAYS.has(configuredRetention) ? configuredRetention : 180;
    const guestPublicId = body.guestPublicId ? String(body.guestPublicId).replace(/[^a-z0-9_-]/gi, '').slice(0, 100) : '';

    const row = {
      invitation_id: invitation.id,
      event_type: eventType,
      session_id: sessionId,
      guest_public_id: guestPublicId ? createHash('sha256').update(`${invitation.id}:${guestPublicId}`).digest('hex').slice(0, 24) : null,
      metadata: cleanMetadata(body.metadata),
    };
    const { error } = await supabaseAdmin.from('invitation_analytics_events').insert(row);
    // Apertura y umbrales de scroll son únicos por sesión. Un duplicado es éxito idempotente.
    if (error && error.code !== '23505') {
      const migrationRequired = error.code === '42P01' || /does not exist|schema cache/i.test(error.message || '');
      return NextResponse.json({ error: migrationRequired ? 'Analítica aún no migrada' : 'No se pudo registrar' }, { status: migrationRequired ? 503 : 500 });
    }
    if (eventType === 'view') {
      const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();
      await supabaseAdmin.from('invitation_analytics_events').delete().eq('invitation_id', invitation.id).lt('occurred_at', cutoff);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }
}
