import { createHash, randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { mapGuestRow } from './guests';
import { mapRsvpRow } from './rsvps';
import { SERVICE_ERRORS, type RsvpSessionState } from './rsvp-contract';

export const privateJson = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } });

export function serviceError(error: unknown) {
  const value = error as { message?: string; code?: string };
  const key = value?.message ?? '';
  const known = SERVICE_ERRORS[key];
  if (known) return privateJson({ error: known.message, code: key }, known.status);
  if (['PGRST202', 'PGRST205', '42883', '42703', '42P01'].includes(value?.code ?? '')) {
    return privateJson({ error: 'La confirmación está temporalmente en mantenimiento. Contacta a los anfitriones o vuelve a intentarlo más tarde.', code: 'MIGRATION_REQUIRED' }, 503);
  }
  return privateJson({ error: 'No se pudo completar la operación. Reintenta sin cambiar los datos.', code: 'SERVICE_UNAVAILABLE' }, 503);
}

export async function serviceBody(request: NextRequest): Promise<Record<string, unknown>> {
  const origin = request.headers.get('origin');
  if (origin) {
    let host: string;
    try { host = new URL(origin).host; } catch { throw new Error('INVALID_INPUT'); }
    if (host !== new URL(request.url).host && host !== request.headers.get('host')) throw new Error('INVALID_INPUT');
  }
  if (!request.headers.get('content-type')?.includes('application/json')) throw new Error('INVALID_INPUT');
  const text = await request.text();
  if (text.length > 8192) throw new Error('INVALID_INPUT');
  let body;
  try { body = JSON.parse(text); } catch { throw new Error('INVALID_INPUT'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('INVALID_INPUT');
  return body;
}

export function mapRsvpState(value: Record<string, unknown>): RsvpSessionState {
  return {
    canRespond: value.canRespond === true,
    closedReason: typeof value.closedCode === 'string' ? SERVICE_ERRORS[value.closedCode]?.message ?? 'Confirmación no disponible.' : undefined,
    guest: value.guest ? mapGuestRow(value.guest) : undefined,
    entry: value.entry ? mapRsvpRow(value.entry) : undefined,
    hasUsedPasses: value.hasUsedPasses === true,
  };
}

export function openReceipt(request: NextRequest, slug: string, create = false) {
  const name = `ek-rsvp-${createHash('sha256').update(slug).digest('hex').slice(0, 16)}`;
  const stored = request.cookies.get(name)?.value;
  const token = stored && /^[A-Za-z0-9_-]{43}$/.test(stored) ? stored : create ? randomBytes(32).toString('base64url') : null;
  return { name, token, hash: token ? createHash('sha256').update(token).digest('hex') : null, fresh: token !== stored };
}
