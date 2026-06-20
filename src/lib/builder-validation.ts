import type { InvitationParsed } from './types';
import { resolveFeatures } from './packages';

export interface BuilderIssue {
  severity: 'error' | 'warning';
  title: string;
  detail: string;
}

export interface BuilderValidation {
  errors: BuilderIssue[];
  warnings: BuilderIssue[];
}

function isHttpUrl(value: string | null | undefined) {
  if (!value) return false;
  return /^https?:\/\//i.test(value.trim());
}

function enabledBlocks(data: InvitationParsed) {
  return (data.config?.layout?.blocks ?? []).filter(block => block.enabled !== false);
}

export function validateInvitationBuilder(data: InvitationParsed): BuilderValidation {
  const issues: BuilderIssue[] = [];
  const cfg = data.config ?? {};
  const feats = resolveFeatures(cfg);
  const blocks = enabledBlocks(data);
  const hasLayout = blocks.length > 0;
  const hasType = (type: string) => blocks.some(block => block.type === type);

  if (!data.names?.trim()) {
    issues.push({ severity: 'error', title: 'Faltan los nombres', detail: 'La invitación necesita los nombres principales para portada, calendario y encabezados.' });
  }
  if (!data.event_date) {
    issues.push({ severity: 'error', title: 'Falta la fecha del evento', detail: 'Sin fecha no se puede renderizar bien la cuenta regresiva ni el guardado en calendario.' });
  }
  if (!data.ceremony_place?.trim() && !data.reception_place?.trim()) {
    issues.push({ severity: 'error', title: 'Falta al menos una ubicación', detail: 'Conviene tener ceremonia o recepción con lugar definido para no publicar una invitación vacía.' });
  }
  if (hasLayout && !hasType('cover')) {
    issues.push({ severity: 'warning', title: 'No hay portada en bloques', detail: 'La invitación por bloques quedó sin bloque de portada activo; puede sentirse abrupta al abrir.' });
  }
  if (hasLayout && !hasType('rsvp')) {
    issues.push({ severity: 'warning', title: 'No hay bloque de confirmación', detail: 'Si el cliente necesita respuestas, añade o reactiva un bloque RSVP.' });
  }
  if (hasLayout && !blocks.some(block => block.type === 'eventCard' || block.type === 'itinerary')) {
    issues.push({ severity: 'warning', title: 'No hay detalles del evento visibles', detail: 'Falta una tarjeta de ceremonia/recepción o un itinerario que ayude a ubicar al invitado.' });
  }
  if (feats.smartRsvp === false && hasLayout && hasType('rsvp') && !data.phone_whatsapp?.trim()) {
    issues.push({ severity: 'error', title: 'RSVP sin destino', detail: 'El botón de confirmar necesita un WhatsApp cuando la confirmación inteligente no está activa.' });
  }
  if (feats.galleryMax === 0 && (cfg.galleryImages?.length || data.gallery_url)) {
    issues.push({ severity: 'warning', title: 'Galería cargada pero no incluida', detail: 'El paquete actual oculta la galería; esas fotos o enlaces no se verán.' });
  }
  if (feats.galleryMax > 0 && hasLayout && hasType('gallery') && !(cfg.galleryImages?.length || data.gallery_url)) {
    issues.push({ severity: 'warning', title: 'Galería vacía', detail: 'Hay un bloque de galería activo, pero todavía no tiene fotos ni enlace compartido.' });
  }
  if (cfg.musicUrl && feats.music === false) {
    issues.push({ severity: 'warning', title: 'Música fuera de paquete', detail: 'El audio está cargado, pero el paquete actual no lo muestra al invitado.' });
  }
  if (cfg.musicUrl && !isHttpUrl(cfg.musicUrl)) {
    issues.push({ severity: 'warning', title: 'URL de música no validada', detail: 'Revisa que el audio sea un enlace directo o un archivo subido correctamente.' });
  }
  if (data.gallery_url && !isHttpUrl(data.gallery_url)) {
    issues.push({ severity: 'warning', title: 'Enlace de galería inválido', detail: 'El link de galería debería empezar con http:// o https://.' });
  }
  if (data.phone_whatsapp && data.phone_whatsapp.replace(/[^\d]/g, '').length < 8) {
    issues.push({ severity: 'warning', title: 'WhatsApp incompleto', detail: 'El número parece demasiado corto; revisa código de país y dígitos.' });
  }
  if ((cfg.entry?.enabled ?? feats.entry) && !String(cfg.entry?.label ?? '').trim()) {
    issues.push({ severity: 'warning', title: 'Portada sin texto de entrada', detail: 'La pantalla de entrada está activa; conviene personalizar el texto del botón.' });
  }

  return {
    errors: issues.filter(issue => issue.severity === 'error'),
    warnings: issues.filter(issue => issue.severity === 'warning'),
  };
}
