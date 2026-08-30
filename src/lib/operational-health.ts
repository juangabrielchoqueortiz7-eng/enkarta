import { supabaseAdmin } from '@/lib/supabase/server';

export type OperationalCheck = { key: string; label: string; status: 'ok' | 'error'; latencyMs: number; detail: string };
export type OperationalHealth = { status: 'operational' | 'degraded'; checkedAt: string; checks: OperationalCheck[] };

const timeout = (ms: number) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado')), ms));
async function databaseCheck(key: string, label: string, table: string): Promise<OperationalCheck> {
  const started = Date.now();
  try {
    const result = await Promise.race([
      supabaseAdmin.from(table).select('id', { count: 'exact', head: true }),
      timeout(3500),
    ]);
    if (result.error) throw result.error;
    return { key, label, status: 'ok', latencyMs: Date.now() - started, detail: 'Conexión y permisos correctos' };
  } catch (cause) {
    return { key, label, status: 'error', latencyMs: Date.now() - started, detail: cause instanceof Error ? cause.message.slice(0, 160) : 'No disponible' };
  }
}

export function summarizeOperationalChecks(checks: OperationalCheck[]): OperationalHealth['status'] {
  return checks.every(check => check.status === 'ok') ? 'operational' : 'degraded';
}

export async function runOperationalChecks(): Promise<OperationalHealth> {
  const configuration: OperationalCheck = {
    key: 'configuration', label: 'Configuración del servidor', latencyMs: 0,
    status: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_PASSWORD', 'NEXT_PUBLIC_WA_PHONE'].every(key => Boolean(process.env[key])) ? 'ok' : 'error',
    detail: 'Variables necesarias para base de datos, acceso administrativo y WhatsApp',
  };
  const checks = [configuration, ...await Promise.all([
    databaseCheck('invitations', 'Invitaciones y panel', 'invitations'),
    databaseCheck('rsvp', 'Confirmaciones RSVP', 'rsvps'),
    databaseCheck('access', 'Control de acceso QR', 'access_log'),
    databaseCheck('commercial', 'Embudo comercial', 'commercial_events'),
  ])];
  return { status: summarizeOperationalChecks(checks), checkedAt: new Date().toISOString(), checks };
}

