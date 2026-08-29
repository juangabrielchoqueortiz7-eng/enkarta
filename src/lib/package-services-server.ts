import { supabaseAdmin } from './supabase/server';
import { allowsService, contractErrors, resolveFeatures, type OperationalService } from './packages';
import type { BuilderConfig, Guest } from './types';

export function storedServiceConfig(value: unknown): BuilderConfig {
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return {}; } }
  return value && typeof value === 'object' && !Array.isArray(value) ? value as BuilderConfig : {};
}
export async function invitationServiceConfig(value: string, by: 'id' | 'slug' = 'id') {
  const { data, error } = await supabaseAdmin.from('invitations').select('id,builder_config').eq(by, value).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('NOT_FOUND');
  const config = storedServiceConfig(data.builder_config);
  if (contractErrors(config).length) throw new Error('SERVICE_NOT_INCLUDED');
  return { id: data.id as string, config };
}
export async function requireInvitationService(value: string, service: OperationalService, by: 'id' | 'slug' = 'id') {
  const resolved = await invitationServiceConfig(value, by);
  if (!allowsService(resolved.config, service)) throw new Error('SERVICE_NOT_INCLUDED');
  return resolved;
}
/** Un QR retenido en la base no concede el servicio ni se entrega al navegador. */
export function guestForServices(guest: Guest | undefined, config: BuilderConfig): Guest | undefined {
  if (!guest) return undefined;
  const next = { ...guest };
  if (!allowsService(config, 'qrAccess')) { delete next.accessToken; delete next.accessCode; }
  if (!allowsService(config, 'tableAssignment')) delete next.tableNo;
  return next;
}
export function rsvpServiceInfo(config: BuilderConfig) {
  const f = resolveFeatures(config);
  return { rsvpMode: f.rsvpMode, qrAccess: allowsService(config, 'qrAccess') };
}
