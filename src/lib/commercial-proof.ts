export type ProofKind = 'demonstration' | 'verified-client';

export interface CommercialProof {
  id: string;
  kind: ProofKind;
  title: string;
  event: string;
  summary: string;
  result: string;
  design: string;
  path: string;
  image: string;
  permissionRecordedAt?: string;
}

/**
 * Una opinión solo puede publicarse como verified-client cuando existe una
 * autorización fechada. Las piezas actuales son demostraciones del producto.
 */
export const COMMERCIAL_PROOFS: CommercialProof[] = [
  {
    id: 'marfil-editorial', kind: 'demonstration', title: 'Un recorrido editorial que respira', event: 'Boda',
    summary: 'La información extensa se divide en capítulos visuales para evitar una página pesada o repetitiva.',
    result: 'Portada, historia, agenda, galería y RSVP conservan una sola dirección artística.',
    design: 'Marfil Vivo', path: '/muestra/marfil-vivo?full=1', image: '/catalog/solar-original.png',
  },
  {
    id: 'aurora-rosa', kind: 'demonstration', title: 'Color romántico sin perder legibilidad', event: 'XV años',
    summary: 'Una base suave demuestra cómo combinar fotografía, detalles brillantes y contenido de celebración.',
    result: 'La colección puede adaptarse al evento manteniendo contraste, jerarquía y lectura móvil.',
    design: 'Aurora Rosa', path: '/muestra/rosegold?full=1', image: '/catalog/rosegold.jpg',
  },
  {
    id: 'terracota-fiesta', kind: 'demonstration', title: 'Una invitación cálida y dinámica', event: 'Cumpleaños',
    summary: 'La composición muestra una alternativa con más energía para itinerario, fotografías y detalles de fiesta.',
    result: 'Cada sección se puede reorganizar y personalizar desde el constructor por bloques.',
    design: 'Terracota', path: '/muestra/euforia?full=1', image: '/catalog/euforia.jpg',
  },
];

export function isPublishableClientProof(proof: CommercialProof): boolean {
  return proof.kind !== 'verified-client' || Boolean(proof.permissionRecordedAt && Number.isFinite(Date.parse(proof.permissionRecordedAt)));
}

