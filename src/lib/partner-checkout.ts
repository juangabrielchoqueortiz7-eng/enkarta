import type { PartnerPaymentMethod, PartnerPlanKey, PartnerPaymentStatus } from './partner-plans';
import { isBillingCycle, isPartnerPlan, PARTNER_PAYMENT_METHODS } from './partner-plans';
import { isUuid } from './rsvp-contract';

export interface CheckoutPayment {
  id: string; status: PartnerPaymentStatus; plan_key: PartnerPlanKey; months: number;
  method: PartnerPaymentMethod; amount_bs: number; receipt_url: string; quote_locked_at?: string | null;
}
export function validCheckoutPayment(value: unknown, expectedId?: string): value is CheckoutPayment & { reference: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return isUuid(item.id) && (!expectedId || item.id === expectedId) && typeof item.reference === 'string' && !!item.reference.trim()
    && isPartnerPlan(item.plan_key) && isBillingCycle(item.months) && PARTNER_PAYMENT_METHODS.includes(item.method as PartnerPaymentMethod)
    && Number.isFinite(Number(item.amount_bs)) && Number(item.amount_bs) > 0 && typeof item.receipt_url === 'string'
    && ['pending', 'approved', 'rejected', 'canceled'].includes(String(item.status))
    && (item.quote_locked_at === undefined || item.quote_locked_at === null || (typeof item.quote_locked_at === 'string' && Number.isFinite(Date.parse(item.quote_locked_at))));
}
export const paymentUnderReview = (payment: Pick<CheckoutPayment, 'receipt_url' | 'quote_locked_at'>) => Boolean(payment.receipt_url || payment.quote_locked_at);
export function checkoutPaymentLabel(payment: Pick<CheckoutPayment, 'status' | 'receipt_url' | 'quote_locked_at'>) {
  if (payment.status === 'pending') return paymentUnderReview(payment) ? 'Comprobante en revisión' : 'Referencia preparada';
  return { approved: 'Aprobado', rejected: 'Rechazado', canceled: 'Cancelado' }[payment.status];
}
export function checkoutQuoteMatches(payment: CheckoutPayment | null, plan: PartnerPlanKey, months: number, method: PartnerPaymentMethod, total: number) {
  return !!payment && payment.status === 'pending' && payment.plan_key === plan && payment.months === months && payment.method === method && Number(payment.amount_bs) === total;
}

/** Keep network failures and malformed replies out of the success path. Never retries writes. */
export async function partnerRequest<T>(url: string, options?: RequestInit, transport: typeof fetch = fetch): Promise<T> {
  let response: Response;
  try { response = await transport(url, { cache: 'no-store', ...options }); }
  catch { throw new Error('No pudimos comprobar el resultado por un problema de conexión. Actualiza los datos antes de repetir la operación.'); }
  let value;
  try { value = await response.json(); }
  catch { throw new Error('La respuesta llegó incompleta. Actualiza los datos para comprobar el resultado antes de repetir.'); }
  if (!response.ok) throw new Error(typeof value?.error === 'string' ? value.error : 'No se pudo completar la operación. Actualiza los datos y vuelve a revisar.');
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('No pudimos verificar la respuesta. Actualiza los datos antes de continuar.');
  return value as T;
}
