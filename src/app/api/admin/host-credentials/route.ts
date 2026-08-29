import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { hashPassword } from '@/lib/access';
import { getAdminSession } from '@/lib/host-session';
import { allowsService } from '@/lib/packages';
import { storedServiceConfig } from '@/lib/package-services-server';
import { privateJson, serviceBody } from '@/lib/services-server';
import { isUuid } from '@/lib/rsvp-contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
const migrationError = (error: { code?: string }) => ['42703', 'PGRST204'].includes(error.code || '');
const columns = (scope: string) => `id,${scope}_email,${scope}_password_hash${scope === 'host' ? ',rsvp_deadline' : ''},builder_config`;
const missingMigration = (scope: string) => `Falta aplicar migrations/${scope === 'door' ? '008_live_host_and_door_access.sql' : '007_separate_design_review.sql'} para activar este acceso.`;

export async function GET(request: NextRequest) {
  if (!(await getAdminSession())) return fail('No autorizado', 401);
  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  const scope = params.get('scope') || 'host';
  if (!isUuid(id) || !['host', 'review', 'door'].includes(scope)) return fail('Acceso no válido');
  const { data, error } = await supabaseAdmin.from('invitations').select(columns(scope)).eq('id', id).maybeSingle();
  if (error) return fail(migrationError(error) ? missingMigration(scope) : 'No se pudo consultar el acceso.', 503);
  if (!data) return fail('Invitación no encontrada', 404);
  // Supabase infiere un tipo genérico al seleccionar columnas según el alcance.
  const row = data as unknown as Record<string, unknown>;
  return privateJson({ email: row[scope + '_email'] || '', hasPassword: !!row[scope + '_password_hash'], rsvpDeadline: row.rsvp_deadline || '' });
}

export async function POST(request: NextRequest) {
  if (!(await getAdminSession())) return fail('No autorizado', 401);
  try {
    const body = await serviceBody(request);
    const scope = body.scope || 'host';
    if (!isUuid(body.id) || !['host', 'review', 'door'].includes(String(scope))) return fail('Acceso no válido');
    const { data, error } = await supabaseAdmin.from('invitations').select(columns(String(scope))).eq('id', body.id).maybeSingle();
    if (error) return fail(migrationError(error) ? missingMigration(String(scope)) : 'No se pudo consultar la invitación.', 503);
    if (!data) return fail('Invitación no encontrada', 404);
    const row = data as unknown as Record<string, unknown>;
    const config = storedServiceConfig(row.builder_config);
    if (scope === 'host' && !allowsService(config, 'hostPanel') && !allowsService(config, 'rsvp')) return fail('El paquete no incluye planilla ni panel operativo.', 403);
    // Revocar siempre es posible, incluso después de retirar el servicio QR.
    if (scope === 'door' && !allowsService(config, 'qrAccess') && body.email !== '') return fail('El paquete no incluye control de acceso QR.', 403);
    const prefix = String(scope);
    const patch: Record<string, unknown> = {};
    if (body.email !== undefined) {
      if (typeof body.email !== 'string' || (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) || body.email.length > 254) return fail('Correo no válido.');
      patch[prefix + '_email'] = body.email.trim().toLowerCase() || null;
      if (!body.email.trim()) patch[prefix + '_password_hash'] = null;
    }
    if (body.password && patch[prefix + '_email'] !== null) {
      if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 200) return fail('La contraseña debe tener entre 8 y 200 caracteres.');
      patch[prefix + '_password_hash'] = hashPassword(body.password);
    }
    if (patch[prefix + '_email'] && !body.password && !row[prefix + '_password_hash']) return fail('Define una contraseña para habilitar el acceso.');
    if (scope === 'host' && body.rsvpDeadline !== undefined) {
      if (body.rsvpDeadline && (typeof body.rsvpDeadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.rsvpDeadline) || !Number.isFinite(Date.parse(body.rsvpDeadline)))) return fail('Fecha límite no válida.');
      patch.rsvp_deadline = body.rsvpDeadline || null;
    }
    if (!Object.keys(patch).length) return fail('Nada que actualizar.');
    const result = await supabaseAdmin.from('invitations').update(patch).eq('id', body.id);
    if (result.error) return fail('No se pudo guardar el acceso. Comprueba que ese correo no esté asignado a otro evento.', 400);
    return NextResponse.json({ ok: true });
  } catch { return fail('No se pudo guardar el acceso. Revisa los datos e inténtalo de nuevo.', 400); }
}
