import type { BuilderConfig, InvitationPackage, InvitationParsed, PackageFeatureOverrides } from '@/lib/types';

/**
 * Paquetes comerciales y qué funciones incluye cada uno (misma matriz que la
 * tabla comparativa de la landing). El builder siembra estos defaults al elegir
 * paquete y permite ajustar cada función por separado (config.features).
 *
 * Compatibilidad: si una invitación no tiene config.package, TODO está activo
 * (comportamiento histórico).
 */

export interface ResolvedFeatures {
  music: boolean;
  guestNames: boolean;
  passes: boolean;
  galleryMax: number;
  lodging: boolean;
  entry: boolean;
  calendar: boolean;
  smartRsvp: boolean;
}

export const PACKAGE_PRESETS: Record<InvitationPackage, ResolvedFeatures> = {
  exclusive: { music: true,  guestNames: true,  passes: true,  galleryMax: 20, lodging: true,  entry: true,  calendar: true,  smartRsvp: true  },
  premium:   { music: true,  guestNames: true,  passes: true,  galleryMax: 8,  lodging: false, entry: false, calendar: false, smartRsvp: true  },
  plus:      { music: false, guestNames: false, passes: false, galleryMax: 0,  lodging: false, entry: false, calendar: false, smartRsvp: false },
};

export const PACKAGE_LABELS: Record<InvitationPackage, string> = {
  exclusive: 'Exclusive',
  premium: 'Premium',
  plus: 'Plus',
};

/** Sin paquete asignado → sin restricciones (compatibilidad con invitaciones antiguas). */
const ALL_ON: ResolvedFeatures = { music: true, guestNames: true, passes: true, galleryMax: 99, lodging: true, entry: true, calendar: true, smartRsvp: true };

/** Resuelve el paquete + overrides de una invitación a un set de funciones efectivo. */
export function resolveFeatures(config?: Pick<BuilderConfig, 'package' | 'features'> | null): ResolvedFeatures {
  const base = config?.package ? PACKAGE_PRESETS[config.package] ?? ALL_ON : ALL_ON;
  const o: PackageFeatureOverrides = config?.features ?? {};
  return {
    music:      o.music      ?? base.music,
    guestNames: o.guestNames ?? base.guestNames,
    passes:     o.passes     ?? base.passes,
    galleryMax: o.galleryMax ?? base.galleryMax,
    lodging:    o.lodging    ?? base.lodging,
    entry:      o.entry      ?? base.entry,
    calendar:   o.calendar   ?? base.calendar,
    smartRsvp:  o.smartRsvp  ?? base.smartRsvp,
  };
}

/**
 * Aplica el paquete a la invitación ANTES de mapearla a una plantilla:
 * apaga música, personalización de invitado/pases y hospedaje, recorta la
 * galería al máximo del paquete y filtra los bloques no incluidos (calendario,
 * galería). Sin `config.package` devuelve la invitación intacta — las
 * invitaciones antiguas no cambian.
 */
export function gateInvitation(inv: InvitationParsed): InvitationParsed {
  const cfg = inv.config;
  if (!cfg?.package) return inv;
  const f = resolveFeatures(cfg);
  const config: BuilderConfig = { ...cfg };
  if (!f.music) config.musicUrl = undefined;
  if (Array.isArray(config.galleryImages)) config.galleryImages = config.galleryImages.slice(0, f.galleryMax);
  if (!f.lodging) config.lodging = [];
  if (config.layout?.blocks?.length) {
    const drop = (t: string) => (t === 'calendar' && !f.calendar) || (t === 'gallery' && f.galleryMax === 0);
    config.layout = { ...config.layout, blocks: config.layout.blocks.filter(b => !drop(b.type)) };
  }
  return {
    ...inv,
    config,
    guest_name: f.guestNames ? inv.guest_name : null,
    guest_passes: f.passes ? inv.guest_passes : 0,
  };
}
