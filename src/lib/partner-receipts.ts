import { supabaseAdmin } from './supabase/server';

// Comprobantes de pago de los socios. Van a un bucket PRIVADO: son documentos
// bancarios, así que nunca se sirven por URL pública, solo con enlace firmado.
// Solo servidor.

export const RECEIPT_BUCKET = 'comprobantes';
export const MAX_RECEIPT_BYTES = 6 * 1024 * 1024;
export const ALLOWED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const SIGNED_URL_SECONDS = 60 * 30;

let bucketReady = false;

/** Crea el bucket privado una sola vez por proceso (idempotente). */
export async function ensureReceiptBucket() {
  if (bucketReady) return;
  const { data } = await supabaseAdmin.storage.getBucket(RECEIPT_BUCKET);
  if (!data) {
    await supabaseAdmin.storage.createBucket(RECEIPT_BUCKET, { public: false, fileSizeLimit: MAX_RECEIPT_BYTES });
  }
  bucketReady = true;
}

const extensionFor = (contentType: string) =>
  ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf' } as Record<string, string>)[contentType] || 'bin';

/** Guarda el comprobante y devuelve su ruta (lo que se escribe en partner_payments). */
export async function storeReceipt(partnerId: string, reference: string, file: File): Promise<string> {
  await ensureReceiptBucket();
  const path = `${partnerId}/${reference}-${Date.now()}.${extensionFor(file.type)}`;
  const { error } = await supabaseAdmin.storage
    .from(RECEIPT_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

/** Enlace temporal para que el socio o el equipo vean un comprobante. */
export async function signedReceiptUrl(path: string): Promise<string> {
  if (!path) return '';
  const { data } = await supabaseAdmin.storage.from(RECEIPT_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  return data?.signedUrl ?? '';
}

/** Firma en lote los comprobantes de una lista de pagos. */
export async function withSignedReceipts<T extends { receipt_url?: string | null }>(rows: T[]): Promise<(T & { receiptUrl: string })[]> {
  return Promise.all(rows.map(async row => ({ ...row, receiptUrl: await signedReceiptUrl(row.receipt_url ?? '') })));
}
