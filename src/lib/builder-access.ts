import { NextResponse } from 'next/server';
import { canManageInvitation } from './host-session';
import { getBuilderActor, partnerOwnsInvitation, publishBlockReason, type BuilderActor } from './partner-session';
import type { OperationalService } from './packages';

// Puerta única del constructor. Hay dos actores que lo usan:
//   - admin  → el equipo Enkarta, sobre cualquier invitación.
//   - partner→ un socio del programa de reventa, solo sobre las suyas.
// Las rutas de /api/admin/* que el constructor necesita usan estos helpers en
// lugar de getAdminSession(), para que el socio trabaje con el mismo editor sin
// duplicar endpoints. Las rutas de negocio de Enkarta (comercial, salud,
// configuración de ventas, cartera de socios) siguen siendo solo de admin.

export type { BuilderActor };

export const unauthorized = () => NextResponse.json({ error: 'No autorizado' }, { status: 401 });

/** Actor autorizado a usar el constructor, sin mirar una invitación concreta. */
export const builderActor = getBuilderActor;

/** Actor autorizado sobre ESTA invitación, o null. Un socio solo pasa con las suyas. */
export async function invitationActor(invitationId: string): Promise<BuilderActor | null> {
  const actor = await builderActor();
  if (!actor || !invitationId) return null;
  if (actor.kind === 'admin') return actor;
  return (await partnerOwnsInvitation(actor.partnerId, invitationId)) ? actor : null;
}

/** canManageInvitation ampliado al socio dueño (invitados, accesos, escáner). */
export async function canOperateInvitation(invitationId: string, service?: OperationalService): Promise<boolean> {
  if (await canManageInvitation(invitationId, service)) return true;
  const actor = await builderActor();
  return actor?.kind === 'partner' && await partnerOwnsInvitation(actor.partnerId, invitationId);
}

/**
 * Motivo por el que este actor no puede publicar la invitación, o null.
 * El admin nunca se bloquea; el socio necesita suscripción vigente y cupo libre.
 */
export async function publishDenial(actor: BuilderActor, alreadyPublished: boolean): Promise<string | null> {
  return actor.kind === 'admin' ? null : publishBlockReason(actor.context, alreadyPublished);
}

/** Espacio de almacenamiento propio de cada actor (secciones y plantillas guardadas). */
export const actorOwnerKey = (actor: BuilderActor) =>
  actor.kind === 'admin' ? 'admin' : `partner:${actor.partnerId}`;
