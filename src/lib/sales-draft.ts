import type { SalesQuoteInput } from './sales-playbook';

export type SalesDraftInput = Omit<SalesQuoteInput, 'paymentInstructions'>;
export type SalesDraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type SalesConfig = { paymentInstructions: string; paymentConfigured: boolean; salesHours: string; draftScope: string };
export const SALES_DRAFT_TTL = 24 * 60 * 60 * 1000;
export const EMPTY_SALES_DRAFT: SalesDraftInput = { packageKey: 'premium', eventType: 'Boda', extrasBs: 0 };
const fields = ['clientName', 'eventType', 'eventDate', 'design', 'extrasLabel'] as const;

export function salesDraftKey(scope: string) {
  if (!/^[a-f0-9]{64}$/.test(scope)) throw new Error('Sesión de cotización inválida.');
  return `enkarta.sales-quote.v1:${scope}`;
}

function inputValue(value: unknown): SalesDraftInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Borrador inválido.');
  const source = value as Record<string, unknown>;
  if (typeof source.packageKey !== 'string' || !['plus', 'premium', 'exclusive'].includes(source.packageKey)) throw new Error('Paquete inválido.');
  const result: SalesDraftInput = { packageKey: source.packageKey as SalesDraftInput['packageKey'] };
  for (const field of fields) {
    const text = source[field];
    if (text === undefined) continue;
    if (typeof text !== 'string' || text.length > (field === 'eventDate' ? 10 : 140) || /[\u0000-\u001f\u007f]/.test(text)) throw new Error('Campo de borrador inválido.');
    result[field] = text;
  }
  if (source.extrasBs !== undefined) {
    if (typeof source.extrasBs !== 'number' || source.extrasBs < 0 || !Number.isSafeInteger(Math.round(source.extrasBs * 100))) throw new Error('Importe de borrador inválido.');
    result.extrasBs = source.extrasBs;
  }
  return result;
}

export type SalesDraftRead = { kind: 'ready'; input: SalesDraftInput } | { kind: 'empty' | 'expired' | 'unavailable' | 'invalid' };
export function readSalesDraft(storage: SalesDraftStorage, scope: string, now = Date.now()): SalesDraftRead {
  let raw: string | null;
  try { raw = storage.getItem(salesDraftKey(scope)); } catch { return { kind: 'unavailable' }; }
  if (raw === null) return { kind: 'empty' };
  try {
    if (!Number.isSafeInteger(now)) return { kind: 'invalid' };
    if (raw.length > 4096) throw new Error('Borrador demasiado grande.');
    const record = JSON.parse(raw);
    if (!record || record.version !== 1 || record.scope !== scope || !Number.isSafeInteger(record.savedAt) || record.savedAt > now + 60_000) throw new Error('Borrador inválido.');
    if (now - record.savedAt > SALES_DRAFT_TTL) return { kind: 'expired' };
    return { kind: 'ready', input: inputValue(record.input) };
  } catch { return { kind: 'invalid' }; }
}

export function saveSalesDraft(storage: SalesDraftStorage, scope: string, input: SalesDraftInput, now = Date.now()) {
  try {
    if (!Number.isSafeInteger(now)) return false;
    const record = JSON.stringify({ version: 1, scope, savedAt: now, input: inputValue(input) });
    if (record.length > 4096) return false;
    storage.setItem(salesDraftKey(scope), record);
    return true;
  } catch { return false; }
}

export function clearSalesDraft(storage: SalesDraftStorage, scope: string) {
  try { storage.removeItem(salesDraftKey(scope)); return true; } catch { return false; }
}

export async function requestSalesConfig(transport: typeof fetch = fetch, signal?: AbortSignal): Promise<SalesConfig> {
  let response: Response;
  try { response = await transport('/api/admin/sales-config', { cache: 'no-store', signal }); }
  catch { throw new Error(signal?.aborted ? 'La comprobación tardó demasiado. Inténtalo de nuevo.' : 'No se pudo conectar para comprobar la configuración. Inténtalo de nuevo.'); }
  if (!response.ok) throw new Error(response.status === 401 ? 'Tu sesión terminó. Vuelve a ingresar al panel.' : 'No se pudo comprobar la configuración. Inténtalo de nuevo.');
  let value;
  try { value = await response.json(); } catch { throw new Error('La configuración llegó incompleta. Inténtalo de nuevo.'); }
  if (!value || typeof value.paymentInstructions !== 'string' || value.paymentInstructions.length > 900 || typeof value.salesHours !== 'string' || value.salesHours.length > 120 || typeof value.paymentConfigured !== 'boolean' || value.paymentConfigured !== Boolean(value.paymentInstructions) || typeof value.draftScope !== 'string' || !/^[a-f0-9]{64}$/.test(value.draftScope)) throw new Error('La configuración llegó incompleta. Inténtalo de nuevo.');
  return { paymentInstructions: value.paymentInstructions, paymentConfigured: value.paymentConfigured, salesHours: value.salesHours, draftScope: value.draftScope };
}

export async function copySalesText(value: string, writeText: (text: string) => Promise<void>) {
  if (!value.trim()) throw new Error('No hay texto para copiar.');
  await writeText(value);
}
