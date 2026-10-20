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

export const PARTNER_REQUEST_TIMEOUT_MS = 25_000;
const TIMEOUT_MESSAGE = 'No pudimos comprobar el resultado en 25 segundos. Pulsa «Actualizar estado» antes de repetir. La operación puede haberse recibido en el servidor.';
const CANCEL_MESSAGE = 'Se interrumpió la espera y no pudimos comprobar el resultado. Pulsa «Actualizar estado» antes de repetir. La operación puede haberse recibido en el servidor.';

/** Only a received HTTP rejection carries domain metadata; network uncertainty does not. */
export class PartnerRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string, readonly needsSubscription = false) {
    super(message);
    this.name = 'PartnerRequestError';
  }
}

/** Bound the complete attempt, including its body. Never retries or assumes an aborted write rolled back. */
export async function partnerRequest<T>(url: string, options?: RequestInit, transport: typeof fetch = fetch): Promise<T> {
  const signal = options?.signal;
  if (signal?.aborted) throw new Error(CANCEL_MESSAGE);
  const controller = new AbortController(), started = Date.now();
  let settled = false, listening = false, stopped: Error | null = null;
  let rejectStop!: (reason: Error) => void;
  const interrupted = new Promise<never>((_resolve, reject) => { rejectStop = reject; });
  const cleanup = () => {
    clearTimeout(timer);
    if (listening) { signal?.removeEventListener('abort', cancelled); listening = false; }
  };
  const stop = (message: string) => {
    if (settled) return;
    settled = true; stopped = new Error(message); cleanup();
    // Settle our deadline first so a synchronous abort rejection cannot replace its reason.
    rejectStop(stopped); controller.abort();
  };
  const cancelled = () => stop(CANCEL_MESSAGE);
  const timer = setTimeout(() => stop(TIMEOUT_MESSAGE), PARTNER_REQUEST_TIMEOUT_MS);
  if (signal) { signal.addEventListener('abort', cancelled, { once: true }); listening = true; }
  const assertCurrent = () => {
    if (!stopped && signal?.aborted) stop(CANCEL_MESSAGE);
    if (!stopped && Date.now() - started >= PARTNER_REQUEST_TIMEOUT_MS) stop(TIMEOUT_MESSAGE);
    if (stopped) throw stopped;
  };
  const attempt = async (): Promise<T> => {
    assertCurrent();
    let response: Response;
    try { response = await transport(url, { cache: 'no-store', ...options, signal: controller.signal }); }
    catch { assertCurrent(); throw new Error('No pudimos comprobar el resultado por un problema de conexión. Actualiza los datos antes de repetir la operación.'); }
    assertCurrent();
    let value;
    try { value = await response.json(); }
    catch { assertCurrent(); throw new Error('La respuesta llegó incompleta. Actualiza los datos para comprobar el resultado antes de repetir.'); }
    assertCurrent();
    if (!response.ok) throw new PartnerRequestError(
      typeof value?.error === 'string' ? value.error : 'No se pudo completar la operación. Actualiza los datos y vuelve a revisar.',
      response.status,
      typeof value?.code === 'string' && /^[A-Z][A-Z0-9_]{0,79}$/.test(value.code) ? value.code : undefined,
      value?.needsSubscription === true,
    );
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('No pudimos verificar la respuesta. Actualiza los datos antes de continuar.');
    assertCurrent();
    return value as T;
  };
  const completed = attempt().then(value => { assertCurrent(); return value; }, error => { assertCurrent(); throw error; });
  try { return await Promise.race([interrupted, completed]); }
  finally { settled = true; cleanup(); }
}
