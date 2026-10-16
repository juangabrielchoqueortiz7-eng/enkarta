import type { Guest } from './types';
import { DEFAULT_WHATSAPP_INVITATION, DEFAULT_WHATSAPP_REMINDER, guestMessage } from './guest-delivery';
import { normalizeGuestPhone } from './guest-import';

export const MAX_WHATSAPP_TEMPLATE = 1200;
export const MAX_WHATSAPP_MESSAGE = 4000; // Enkarta's own review limit, not a WhatsApp API guarantee.
export const WHATSAPP_VARIABLES = ['nombre', 'nombre_invitado', 'link', 'link_unico', 'pases', 'cantidad_pases', 'mesa', 'codigo'] as const;
export type MessagePurpose = 'invitation' | 'reminder';
export type MessageGuest = Pick<Guest, 'publicId' | 'name' | 'passes' | 'tableNo' | 'accessCode'>;
export interface MessageIssue { code: 'UNKNOWN_VARIABLE' | 'MALFORMED_VARIABLE' | 'MISSING_LINK' | 'TEMPLATE_LENGTH' | 'MESSAGE_LENGTH' | 'INVALID_LINK'; message: string }
export interface PreparedWhatsAppMessage { text: string; issues: MessageIssue[]; ready: boolean; defaultTemplate: boolean }

export function prepareWhatsAppMessage(template: string | undefined, guest: MessageGuest, link: string, purpose: MessagePurpose): PreparedWhatsAppMessage {
  const source = template?.trim() || (purpose === 'reminder' ? DEFAULT_WHATSAPP_REMINDER : DEFAULT_WHATSAPP_INVITATION);
  const issues: MessageIssue[] = [];
  if (source.length > MAX_WHATSAPP_TEMPLATE) issues.push({ code: 'TEMPLATE_LENGTH', message: 'La plantilla supera 1.200 caracteres. Acorta el texto antes de preparar WhatsApp.' });
  const variables = [...source.matchAll(/\{([^{}]*)\}/g)].map(match => match[1]);
  const unknown = [...new Set(variables.filter(value => !WHATSAPP_VARIABLES.includes(value as typeof WHATSAPP_VARIABLES[number])))];
  if (unknown.length) issues.push({ code: 'UNKNOWN_VARIABLE', message: `Revisa estas variables: ${unknown.slice(0, 5).map(value => `{${value.slice(0, 60)}}`).join(', ')}. Usa las variables indicadas sin espacios dentro de las llaves.` });
  if (/[{}]/.test(source.replace(/\{[^{}]*\}/g, ''))) issues.push({ code: 'MALFORMED_VARIABLE', message: 'Hay llaves incompletas o anidadas. Escribe cada variable así: {nombre} o {link}.' });
  if (!variables.includes('link') && !variables.includes('link_unico')) issues.push({ code: 'MISSING_LINK', message: 'Añade {link} o {link_unico} para incluir la invitación personal de este contacto.' });
  try {
    const url = new URL(link);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !/^\/i\/[^/]+$/.test(url.pathname)
      || !guest.publicId || url.searchParams.getAll('g').length !== 1 || url.searchParams.get('g') !== guest.publicId) throw new Error('INVALID_LINK');
  } catch { issues.push({ code: 'INVALID_LINK', message: 'No pudimos verificar el enlace personal de este invitado. Actualiza el padrón antes de preparar el mensaje.' }); }
  // One substitution only: names containing braces are guest data, never another template.
  const text = guestMessage(source.slice(0, MAX_WHATSAPP_TEMPLATE + 1), guest, link);
  if (text.length > MAX_WHATSAPP_MESSAGE) issues.push({ code: 'MESSAGE_LENGTH', message: 'El mensaje personalizado supera el límite de revisión de 4.000 caracteres de Enkarta. Reduce el texto o usa el predeterminado.' });
  return { text, issues, ready: !issues.length, defaultTemplate: !template?.trim() };
}

/** Recheck at the action boundary; a disabled button alone is insufficient. */
export function whatsAppMessageUrl(message: PreparedWhatsAppMessage, phone: string) {
  const normalized = normalizeGuestPhone(phone).replace(/\D/g, '');
  if (!message.ready || message.issues.length || !normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message.text)}`;
}
/** Delivery-only revisions keep the choice; recipient/content edits invalidate it. Memory only. */
export const messageChoiceKey = (guest: MessageGuest & Pick<Guest, 'id' | 'phone'>, purpose: MessagePurpose, template?: string) => JSON.stringify([guest.id, guest.publicId, guest.name, guest.passes, guest.phone, guest.tableNo, guest.accessCode, purpose, template ?? null]);
