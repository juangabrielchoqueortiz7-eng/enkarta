import { PACKAGE_CATALOG } from './packages';
import type { InvitationPackage } from './types';

export type SalesQuoteInput = {
  clientName?: string;
  eventType?: string;
  eventDate?: string;
  design?: string;
  packageKey: InvitationPackage;
  extrasLabel?: string;
  extrasBs?: number | string;
  paymentInstructions?: string;
};

export type SalesQuoteField = 'clientName' | 'eventType' | 'eventDate' | 'design' | 'packageKey' | 'extrasBs' | 'extrasLabel' | 'paymentInstructions';
export const MAX_SALES_QUOTE_BS = 1_000_000;
export type SalesQuoteTotals = { base: number; extras: number; total: number; reservation: number; balance: number };
export type SalesQuoteValidation = { errors: Partial<Record<SalesQuoteField, string>>; missing: SalesQuoteField[]; totals: SalesQuoteTotals | null; ready: boolean };

const MAX_CENTS = MAX_SALES_QUOTE_BS * 100;
const controls = /[\u0000-\u001f\u007f]/;
const fieldLabels: Record<SalesQuoteField, string> = {
  clientName: 'Cliente', eventType: 'Evento', eventDate: 'Fecha', design: 'Diseño', packageKey: 'Paquete',
  extrasBs: 'Importe de adicionales', extrasLabel: 'Detalle de adicionales', paymentInstructions: 'Medio de pago',
};

/** Parse the decimal representation instead of rounding a floating-point product. */
export function parseSalesExtras(value: unknown): { cents: number; amount: number } | null {
  if (value === undefined || value === '') return { cents: 0, amount: 0 };
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  if (typeof value === 'string' && controls.test(value)) return null;
  const text = String(value).trim();
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.replace(',', '.').split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_CENTS) return null;
  return { cents, amount: cents / 100 };
}

function quoteMoney(input: SalesQuoteInput): SalesQuoteTotals | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  if (typeof input.packageKey !== 'string' || !Object.prototype.hasOwnProperty.call(PACKAGE_CATALOG, input.packageKey)) return null;
  const extras = parseSalesExtras(input.extrasBs);
  if (!extras) return null;
  const baseCents = PACKAGE_CATALOG[input.packageKey].bs * 100;
  const totalCents = baseCents + extras.cents;
  if (!Number.isSafeInteger(totalCents) || totalCents > MAX_CENTS) return null;
  const reservationCents = Math.min(20_000, totalCents);
  return { base: baseCents / 100, extras: extras.amount, total: totalCents / 100, reservation: reservationCents / 100, balance: (totalCents - reservationCents) / 100 };
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateSalesQuote(input: SalesQuoteInput): SalesQuoteValidation {
  const errors: SalesQuoteValidation['errors'] = {}, missing: SalesQuoteField[] = [];
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {} as SalesQuoteInput;
  const required: SalesQuoteField[] = ['clientName', 'eventType', 'eventDate', 'design', 'paymentInstructions'];
  for (const field of ['clientName', 'eventType', 'eventDate', 'design', 'extrasLabel', 'paymentInstructions'] as const) {
    const value = source[field];
    const max = field === 'paymentInstructions' ? 900 : field === 'eventDate' ? 10 : 140;
    if (value !== undefined && (typeof value !== 'string' || value.length > max || controls.test(value))) {
      errors[field] = `${fieldLabels[field]}: escribe un texto válido de hasta ${max} caracteres.`;
    } else if (!value?.trim()) {
      if (required.includes(field)) missing.push(field);
    } else if (field === 'eventDate' && !validDate(value)) {
      errors.eventDate = 'Escribe una fecha de calendario válida.';
    }
  }
  if (typeof source.packageKey !== 'string' || !Object.prototype.hasOwnProperty.call(PACKAGE_CATALOG, source.packageKey)) errors.packageKey = 'Selecciona un paquete válido.';
  const extras = parseSalesExtras(source.extrasBs);
  if (!extras) errors.extrasBs = 'Escribe un importe entre 0 y 1.000.000 Bs, con un máximo de dos decimales y sin separadores de miles.';
  const totals = quoteMoney(source);
  if (extras && !errors.packageKey && !totals) errors.extrasBs = 'El total de la propuesta no puede superar 1.000.000 Bs.';
  if (extras && extras.cents > 0 && !errors.extrasLabel && !source.extrasLabel?.trim()) missing.push('extrasLabel');
  return { errors, missing, totals, ready: Object.keys(errors).length === 0 && missing.length === 0 };
}

export const SALES_PIPELINE = [
  { key: 'whatsapp_open', label: 'Intento de contacto', target: 'El enlace fue solicitado. Cuando llegue el mensaje, responder durante el horario comercial y marcar Conversación.' },
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
const displayDate = (value?: string) => value && validDate(value) ? new Date(`${value}T12:00:00Z`).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Por confirmar';

export function salesQuoteTotals(input: SalesQuoteInput): SalesQuoteTotals {
  const totals = quoteMoney(input);
  if (!totals) throw new Error('Revisa el paquete y el importe de adicionales antes de calcular la propuesta.');
  return totals;
}

export function formatSalesQuote(input: SalesQuoteInput, siteUrl = 'https://enkarta.vercel.app') {
  const validation = validateSalesQuote(input);
  if (Object.keys(validation.errors).length > 0 || !validation.totals) throw new Error('La cotización contiene datos inválidos. Revisa los campos señalados.');
  const pkg = PACKAGE_CATALOG[input.packageKey];
  const totals = validation.totals;
  const name = clean(input.clientName) || 'Cliente por confirmar';
  const event = clean(input.eventType) || 'Evento por confirmar';
  const design = clean(input.design) || 'A elegir del catálogo';
  const extras = totals.extras > 0 ? `${clean(input.extrasLabel) || 'Servicios adicionales'}: ${totals.extras.toLocaleString('es-BO')} Bs` : 'Sin adicionales';
  const payment = clean(input.paymentInstructions, 900);
  return [
    validation.ready ? 'RESUMEN DE PROPUESTA · ENKARTA' : 'BORRADOR DE PROPUESTA · ENKARTA',
    ...(!validation.ready ? [`Por confirmar: ${validation.missing.map(field => fieldLabels[field]).join(', ')}.`] : []),
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
  const totals = salesQuoteTotals(input);
  const client = clean(input.clientName) || '¡Hola!';
  const pkg = PACKAGE_CATALOG[input.packageKey];
  const event = clean(input.eventType) || 'tu evento';
  const design = clean(input.design) || 'el diseño que más te guste';
  const messages: Record<SalesReplyKey, string> = {
    greeting: `${client}, gracias por escribir a Enkarta. Será un gusto preparar la invitación digital para ${event}. Para confirmar disponibilidad, ¿podrías indicarnos la fecha del evento y el diseño o estilo que te interesa?`,
    availability: `${client}, tenemos disponibilidad para revisar tu proyecto. Por lo que nos comentas, el paquete ${pkg.label} es una buena base y podemos trabajar con ${design}. Te enviaré un resumen con alcance, precio y plazo antes de solicitar cualquier pago.`,
    reservation: `${client}, para reservar el espacio de producción se abonan ${totals.reservation.toLocaleString('es-BO')} Bs. La reserva se descuenta del total de ${totals.total.toLocaleString('es-BO')} Bs. Antes de pagar, revisa el resumen escrito con paquete, adicionales, plazo y condiciones.`,
    materials: `${client}, reserva confirmada. Para iniciar necesitamos: nombres, fecha y horarios, ubicaciones, programa, código de vestimenta, datos de regalos, fotografías y música. El plazo comienza cuando recibamos el material completo.`,
    followup: `${client}, te escribimos para saber si pudiste revisar la propuesta de Enkarta. Si la fecha, el paquete o el estilo cambiaron, podemos actualizar el resumen antes de reservar.`,
  };
  return messages[key];
}
