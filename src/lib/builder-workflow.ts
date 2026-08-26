import type { BuilderRole, InvitationParsed } from './types';

export const ROLE_META: Record<BuilderRole, { label: string; description: string; color: string }> = {
  admin: { label: 'Administrador', description: 'Edita, publica, restaura y gestiona comentarios.', color: '#7c5c9d' },
  designer: { label: 'Diseñador', description: 'Edita el diseño y crea versiones para revisión.', color: '#39729f' },
  client: { label: 'Cliente', description: 'Comenta y aprueba o solicita cambios.', color: '#3f7f68' },
  viewer: { label: 'Solo lectura', description: 'Puede revisar la vista previa sin modificar nada.', color: '#7b746c' },
};

const CONTENT_FIELDS: (keyof InvitationParsed)[] = [
  'names', 'event_date', 'ceremony_time', 'ceremony_place', 'ceremony_address',
  'reception_time', 'reception_place', 'reception_address', 'message', 'dress_code',
  'no_kids', 'parents_groom', 'parents_bride', 'sponsors', 'itinerary', 'gift_message',
  'bank_account', 'phone_whatsapp',
];

const equal = (left: unknown, right: unknown) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

/** Resumen legible para el diálogo y el registro de una publicación. */
export function summarizeBuilderChanges(current: InvitationParsed, published?: InvitationParsed | null): string[] {
  if (!published) return ['Primera publicación de la invitación'];
  const messages: string[] = [];
  const beforeBlocks = published.config?.layout?.blocks ?? [];
  const afterBlocks = current.config?.layout?.blocks ?? [];
  const beforeById = new Map(beforeBlocks.map(block => [block.id, block]));
  const afterById = new Map(afterBlocks.map(block => [block.id, block]));
  const added = afterBlocks.filter(block => !beforeById.has(block.id)).length;
  const removed = beforeBlocks.filter(block => !afterById.has(block.id)).length;
  const edited = afterBlocks.filter(block => beforeById.has(block.id) && !equal(block, beforeById.get(block.id))).length;
  if (added) messages.push(`${added} ${added === 1 ? 'bloque añadido' : 'bloques añadidos'}`);
  if (removed) messages.push(`${removed} ${removed === 1 ? 'bloque eliminado' : 'bloques eliminados'}`);
  if (edited) messages.push(`${edited} ${edited === 1 ? 'bloque actualizado' : 'bloques actualizados'}`);

  const contentChanges = CONTENT_FIELDS.filter(field => !equal(current[field], published[field])).length;
  if (contentChanges) messages.push(`${contentChanges} ${contentChanges === 1 ? 'dato del evento actualizado' : 'datos del evento actualizados'}`);
  if (!equal(current.config?.theme, published.config?.theme) || !equal(current.config?.tokens, published.config?.tokens)) messages.push('Sistema visual actualizado');
  if (!equal(current.config?.decor, published.config?.decor)) messages.push('Decoración actualizada');
  if (!equal(current.config?.motion, published.config?.motion)) messages.push('Animaciones actualizadas');
  if (!equal(current.cover_image_url, published.cover_image_url) || !equal(current.config?.galleryImages, published.config?.galleryImages) || !equal(current.config?.sectionImages, published.config?.sectionImages)) messages.push('Medios actualizados');
  if (!equal(current.config?.guestMeta, published.config?.guestMeta)) messages.push('Segmentación de invitados actualizada');
  return messages.length ? messages : ['Sin diferencias visuales respecto de la publicación actual'];
}

export function publicationSummaryText(changes: string[]): string {
  return changes.join(' · ');
}
