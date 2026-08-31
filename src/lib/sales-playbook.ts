import { PACKAGE_CATALOG } from './packages';
import type { InvitationPackage } from './types';

export type SalesQuoteInput = {
  clientName?: string;
  eventType?: string;
  eventDate?: string;
  design?: string;
  packageKey: InvitationPackage;
  extrasLabel?: string;
  extrasBs?: number;
  paymentInstructions?: string;
};

export const SALES_PIPELINE = [
  { key: 'whatsapp_open', label: 'Nueva consulta', target: 'Responder en menos de 30 minutos durante el horario comercial.' },
  { key: 'contacted', label: 'Conversación', target: 'Confirmar evento, fecha, diseño, paquete y disponibilidad.' },
  { key: 'reserved', label: 'Reserva', target: 'Enviar resumen escrito, registrar los 200 Bs y solicitar materiales.' },
  { key: 'won', label: 'Venta', target: 'Crear la invitación, registrar el total y confirmar el primer plazo.' },
  { key: 'lost', label: 'No concretó', target: 'Registrar un motivo breve sin copiar datos personales de WhatsApp.' },
] as const;

export const SALES_REPLY_LABELS = {
  greeting: 'Primera respuesta',
  availability: 'Disponibilidad y diagnóstico',
  reservation: 'Solicitud de reserva',
  materials: 'Solicitud de materiales',
  followup: 'Seguimiento',
} as const;

export type SalesReplyKey = keyof typeof SALES_REPLY_LABELS;

const clean = (value: unknown, max = 140) => String(value ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').slice(0, max);
const validDate = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00Z`)));
const displayDate = (value?: string) => validDate(value) ? new Date(`${value}T12:00:00Z`).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Por confirmar';

export function salesQuoteTotals(input: SalesQuoteInput) {
  const base = PACKAGE_CATALOG[input.packageKey].bs;
  const extras = Number.isFinite(input.extrasBs) ? Math.max(0, Math.round(Number(input.extrasBs) * 100) / 100) : 0;
  const total = base + extras;
  const reservation = Math.min(200, total);
  return { base, extras, total, reservation, balance: total - reservation };
}

export function formatSalesQuote(input: SalesQuoteInput, siteUrl = 'https://enkarta.vercel.app') {
  const pkg = PACKAGE_CATALOG[input.packageKey];
  const totals = salesQuoteTotals(input);
  const name = clean(input.clientName) || 'Cliente por confirmar';
  const event = clean(input.eventType) || 'Evento por confirmar';
  const design = clean(input.design) || 'A elegir del catálogo';
  const extras = totals.extras > 0 ? `${clean(input.extrasLabel) || 'Servicios adicionales'}: ${totals.extras.toLocaleString('es-BO')} Bs` : 'Sin adicionales';
  const payment = clean(input.paymentInstructions, 900);
  return [
    'RESUMEN DE PROPUESTA · ENKARTA',
    '',
    `Cliente: ${name}`,
    `Evento: ${event}`,
    `Fecha: ${displayDate(input.eventDate)}`,
    `Diseño: ${design}`,
    `Paquete: ${pkg.label}`,
    `Precio base: ${totals.base.toLocaleString('es-BO')} Bs`,
    `Adicionales: ${extras}`,
    `Total: ${totals.total.toLocaleString('es-BO')} Bs`,
    '',
    `Reserva para iniciar: ${totals.reservation.toLocaleString('es-BO')} Bs`,
    `Saldo antes de publicar: ${totals.balance.toLocaleString('es-BO')} Bs`,
    `Primera propuesta: ${input.packageKey === 'plus' ? 3 : input.packageKey === 'premium' ? 4 : 5} días hábiles después de recibir reserva y materiales completos.`,
    `Rondas incluidas: ${input.packageKey === 'plus' ? 1 : input.packageKey === 'premium' ? 2 : 4}.`,
    '',
    payment ? `Medio de pago: ${payment}` : 'Medio de pago: completar antes de enviar al cliente.',
    '',
    `Proceso: ${siteUrl}/proceso`,
    `Términos y pagos: ${siteUrl}/legal/pagos`,
    '',
    'La reserva se descuenta del precio total. La producción inicia después de confirmar la reserva y recibir los materiales.',
  ].join('\n');
}

export function salesReply(key: SalesReplyKey, input: SalesQuoteInput) {
  const client = clean(input.clientName) || '¡Hola!';
  const pkg = PACKAGE_CATALOG[input.packageKey];
  const event = clean(input.eventType) || 'tu evento';
  const design = clean(input.design) || 'el diseño que más te guste';
  const totals = salesQuoteTotals(input);
  const messages: Record<SalesReplyKey, string> = {
    greeting: `${client}, gracias por escribir a Enkarta. Será un gusto preparar la invitación digital para ${event}. Para confirmar disponibilidad, ¿podrías indicarnos la fecha del evento y el diseño o estilo que te interesa?`,
    availability: `${client}, tenemos disponibilidad para revisar tu proyecto. Por lo que nos comentas, el paquete ${pkg.label} es una buena base y podemos trabajar con ${design}. Te enviaré un resumen con alcance, precio y plazo antes de solicitar cualquier pago.`,
    reservation: `${client}, para reservar el espacio de producción se abonan ${totals.reservation.toLocaleString('es-BO')} Bs. La reserva se descuenta del total de ${totals.total.toLocaleString('es-BO')} Bs. Antes de pagar, revisa el resumen escrito con paquete, adicionales, plazo y condiciones.`,
    materials: `${client}, reserva confirmada. Para iniciar necesitamos: nombres, fecha y horarios, ubicaciones, programa, código de vestimenta, datos de regalos, fotografías y música. El plazo comienza cuando recibamos el material completo.`,
    followup: `${client}, te escribimos para saber si pudiste revisar la propuesta de Enkarta. Si la fecha, el paquete o el estilo cambiaron, podemos actualizar el resumen antes de reservar.`,
  };
  return messages[key];
}
