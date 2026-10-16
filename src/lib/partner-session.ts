import * as React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from './supabase/server';
import { createAuthServerClient } from './supabase/auth';
import { verifyAdminSession } from './access';
import { isUuid } from './rsvp-contract';
import { safePartnerNext, partnerEntryPath } from './partner-journey';
import {
  PARTNER_PLANS, planQuota, servesPublished, subscriptionState,
  type PartnerPlanKey, type QuotaState, type SubscriptionState,
} from './partner-plans';

// Sesión del socio (programa de reventa). Es un tercer acceso, independiente del
// admin (equipo Enkarta) y del anfitrión de un evento:
//   - Admin:     cookie 'enkarta-admin'  → todo el sistema.
//   - Anfitrión: cookie 'enkarta-host'   → un solo evento.
//   - Socio:     sesión de Supabase Auth → sus propias invitaciones.
// Solo se usa en el servidor (API routes / server components).

/**
 * Memoiza por petición: la sesión del socio se consulta varias veces en un mismo
 * render (permisos, panel, constructor) y no debe pegarle a Auth cada vez.
 * `React.cache` solo existe en el entorno de servidor de React; en Node plano
 * (los scripts de prueba) se degrada a la función tal cual.
 */
const perRequest = <T extends (...args: never[]) => unknown>(fn: T): T => {
  const memo = (React as { cache?: (value: T) => T }).cache;
  return typeof memo === 'function' ? memo(fn) : fn;
};

export interface PartnerRow {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  brand_name: string;
  phone: string;
  city: string;
  status: 'active' | 'suspended';
  created_at: string;
}

export interface PartnerContext {
  partner: PartnerRow;
  subscription: SubscriptionState;
  quota: QuotaState;
  /** Invitaciones creadas por el socio (publicadas o no). */
  totalInvitations: number;
}

/** Marca de que falta aplicar la migración 013 (mensaje claro en vez de un 500). */
export class PartnerSchemaMissing extends Error {
  constructor() { super('Falta aplicar la migración 013 (programa de socios).'); }
}

const isMissingTable = (error: { code?: string; message?: string } | null) =>
  !!error && (error.code === '42P01' || /does not exist|schema cache/i.test(error.message || ''));

/** Nombre de las cookies que escribe Supabase Auth (pueden venir troceadas). */
const AUTH_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

/** Usuario autenticado con Google, verificado contra Supabase. */
export const getAuthUser = perRequest(async () => {
  // Sin cookie de sesión no hay nada que verificar: evita una llamada de red a
  // Auth en cada visita anónima, que son la mayoría del tráfico del sitio.
  try {
    const jar = await cookies();
    if (!jar.getAll().some(cookie => AUTH_COOKIE.test(cookie.name))) return null;
  } catch {
    return null;
  }
  const client = await createAuthServerClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.id) return null;
  return data.user;
});

/**
 * Crea la ficha del socio la primera vez y refresca nombre/foto de Google en
 * cada entrada. Nunca toca marca, teléfono ni estado: eso lo edita el socio.
 */
export async function syncPartnerFromAuth(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): Promise<PartnerRow> {
  const meta = user.user_metadata ?? {};
  const text = (value: unknown, max: number) => String(value ?? '').trim().slice(0, max);
  const profile = {
    email: text(user.email, 160),
    full_name: text(meta.full_name ?? meta.name, 120),
    avatar_url: text(meta.avatar_url ?? meta.picture, 500),
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: readError } = await supabaseAdmin
    .from('partners').select('*').eq('id', user.id).maybeSingle();
  if (isMissingTable(readError)) throw new PartnerSchemaMissing();
  if (readError) throw readError;

  if (existing) {
    // Solo escribir si Google trae algo nuevo: evita un UPDATE por cada visita.
    const stale = (['email', 'full_name', 'avatar_url'] as const).some(key => profile[key] && existing[key] !== profile[key]);
    if (!stale) return existing as PartnerRow;
    const { data, error } = await supabaseAdmin.from('partners').update(profile).eq('id', user.id).select().single();
    if (error) throw error;
    return data as PartnerRow;
  }

  const { data, error } = await supabaseAdmin
    .from('partners').insert({ id: user.id, ...profile }).select().single();
  if (isMissingTable(error)) throw new PartnerSchemaMissing();
  if (error) throw error;

  // Suscripción vacía desde el primer día: el socio puede diseñar, no publicar.
  await supabaseAdmin.from('partner_subscriptions')
    .upsert({ partner_id: user.id, status: 'none', updated_at: new Date().toISOString() }, { onConflict: 'partner_id' });
  return data as PartnerRow;
}

/** Suscripción + cupo consumido de un socio. Fuente única para permisos y panel. */
export async function partnerContextFor(partner: PartnerRow): Promise<PartnerContext> {
  const [{ data: sub }, published, total] = await Promise.all([
    supabaseAdmin.from('partner_subscriptions').select('*').eq('partner_id', partner.id).maybeSingle(),
    supabaseAdmin.from('invitations').select('id', { count: 'exact', head: true }).eq('partner_id', partner.id).eq('status', 'ready'),
    supabaseAdmin.from('invitations').select('id', { count: 'exact', head: true }).eq('partner_id', partner.id),
  ]);
  const subscription = subscriptionState(sub);
  return {
    partner,
    subscription,
    quota: planQuota(subscription.plan, published.count ?? 0),
    totalInvitations: total.count ?? 0,
  };
}

/** Contexto completo del socio logueado, o null si no hay sesión de Google. */
export const getPartnerContext = perRequest(async (): Promise<PartnerContext | null> => {
  const user = await getAuthUser();
  if (!user) return null;
  const partner = await syncPartnerFromAuth(user);
  return partnerContextFor(partner);
});

/**
 * Forma pública del socio para el panel y la API. Nunca expone el id de Auth ni
 * datos de otros socios; `remaining` viaja como null cuando el plan no tiene tope.
 */
export function serializePartner(context: PartnerContext) {
  const { partner, subscription, quota, totalInvitations } = context;
  return {
    profile: {
      email: partner.email, name: partner.full_name, avatar: partner.avatar_url,
      brand: partner.brand_name, phone: partner.phone, city: partner.city,
      status: partner.status, memberSince: partner.created_at,
    },
    subscription,
    quota: { ...quota, remaining: quota.unlimited ? null : quota.remaining },
    totalInvitations,
  };
}

/** Guard para páginas server del socio: sin sesión, al inicio del programa. */
export async function requirePartnerPage(next = '/socios/panel'): Promise<PartnerContext> {
  // Sin la migración 013 el programa no existe: mejor el aviso de /socios que un 500.
  const context = await getPartnerContext().catch(error => {
    if (error instanceof PartnerSchemaMissing) redirect('/socios?error=migracion');
    throw error;
  });
  if (!context) redirect(partnerEntryPath(safePartnerNext(next)));
  if (context.partner.status === 'suspended') redirect('/socios?estado=suspendido');
  return context;
}

// ── Actor del constructor: el equipo Enkarta o un socio con su propio alcance ──

export type BuilderActor =
  | { kind: 'admin' }
  | { kind: 'partner'; partnerId: string; context: PartnerContext };

/**
 * Quién está usando el constructor. El admin puede con cualquier invitación; el
 * socio, solo con las suyas (`scopePartner` / `ownsInvitation` lo verifican).
 */
export async function getBuilderActor(): Promise<BuilderActor | null> {
  // getAdminSession() vive en host-session.ts, que a su vez necesita este módulo;
  // se verifica la cookie aquí mismo para no cruzar los dos imports.
  if (verifyAdminSession((await cookies()).get('enkarta-admin')?.value)) return { kind: 'admin' };
  const context = await getPartnerContext().catch(() => null);
  if (!context || context.partner.status === 'suspended') return null;
  return { kind: 'partner', partnerId: context.partner.id, context };
}

/** true si quien pide es el socio dueño de esa invitación (no el equipo Enkarta). */
export async function isPartnerOwnerOf(invitationId: string): Promise<boolean> {
  const context = await getPartnerContext().catch(() => null);
  if (!context || context.partner.status === 'suspended') return false;
  return partnerOwnsInvitation(context.partner.id, invitationId);
}

/** true si la invitación pertenece a ese socio. Una invitación de Enkarta (partner_id NULL) nunca lo es. */
export async function partnerOwnsInvitation(partnerId: string, invitationId: string): Promise<boolean> {
  if (!isUuid(invitationId)) return false;
  const { data } = await supabaseAdmin.from('invitations').select('partner_id').eq('id', invitationId).maybeSingle();
  return !!data?.partner_id && data.partner_id === partnerId;
}

/** El socio solo alcanza sus invitaciones; el admin no se filtra. */
export const scopeToActor = <T extends { eq: (column: string, value: string) => T }>(query: T, actor: BuilderActor): T =>
  actor.kind === 'partner' ? query.eq('partner_id', actor.partnerId) : query;

/** Motivo por el que un socio no puede publicar ahora, o null si sí puede. */
export function publishBlockReason(context: PartnerContext, alreadyPublished: boolean): string | null {
  if (!context.subscription.active) {
    return context.subscription.status === 'pending'
      ? 'Tu pago está en revisión. En cuanto lo aprobemos podrás publicar.'
      : 'Necesitas una suscripción activa para publicar y compartir el enlace.';
  }
  if (!alreadyPublished && context.quota.reached) {
    return `Tu plan ${PARTNER_PLANS[context.subscription.plan].label} permite ${context.quota.limit} invitaciones publicadas a la vez. Despublica una o sube de plan.`;
  }
  return null;
}

/**
 * ¿Se sigue sirviendo al público una invitación de este dueño? Las invitaciones
 * de Enkarta (partner_id NULL) siempre sí: nada del programa de socios cambia su
 * comportamiento. Las de un socio dejan de verse cuando su mensualidad venció y
 * se agotaron los días de gracia, o si la cuenta está suspendida.
 */
export async function partnerServesInvitation(partnerId: string | null | undefined): Promise<boolean> {
  if (!partnerId) return true;
  const [{ data: partner }, { data: sub }] = await Promise.all([
    supabaseAdmin.from('partners').select('status').eq('id', partnerId).maybeSingle(),
    supabaseAdmin.from('partner_subscriptions').select('*').eq('partner_id', partnerId).maybeSingle(),
  ]);
  if (partner?.status === 'suspended') return false;
  return servesPublished(subscriptionState(sub));
}

/** Paquete de servicios que reciben las invitaciones del socio según su plan. */
export const packageForPlan = (plan: PartnerPlanKey) =>
  ({ inicio: 'plus', estudio: 'premium', agencia: 'exclusive' } as const)[plan];
