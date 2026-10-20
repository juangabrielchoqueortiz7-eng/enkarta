import { resourceBudgetBytes, type PublicationResource } from './publication-audit';

export const PUBLICATION_AUDIT_TIMEOUT_MS = 25_000;
const FAILURE = 'No pudimos verificar los recursos. Revisa tu sesión o conexión y repite el análisis.';
const TIMEOUT = 'El análisis superó los 25 segundos. Puedes volver a intentarlo.';

export interface RemoteResult {
  url: string; kind: string; label: string; blockId?: string;
  ok: boolean; status?: number; bytes?: number; durationMs: number; error?: string;
}
export interface RemoteAudit {
  results: RemoteResult[];
  summary: { checked: number; available: number; unknownSize: number; failed: number; totalBytes: number; averageResponseMs: number; slow: number; heavy: number };
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;

function checkedAudit(value: unknown, resources: PublicationResource[]): RemoteAudit {
  const fail = (): never => { throw new Error(FAILURE); };
  if (!record(value) || !Array.isArray(value.results) || !record(value.summary)) return fail();
  const expected = resources.slice(0, 24);
  if (value.results.length !== expected.length || !value.results.every((row: unknown, index: number) => {
    if (!record(row)) return false;
    const item = expected[index];
    return row.url === item.url.trim() && row.kind === String(item.kind || 'link')
      && row.label === String(item.label || 'Recurso').slice(0, 120)
      && row.blockId === (item.blockId ? String(item.blockId).slice(0, 120) : undefined)
      && typeof row.ok === 'boolean' && count(row.durationMs)
      && (row.bytes === undefined || count(row.bytes))
      && (row.status === undefined || (count(row.status) && row.status >= 100 && row.status <= 599))
      && (row.status === undefined ? !row.ok : row.ok === (Number(row.status) >= 200 && Number(row.status) < 300))
      && (row.error === undefined || typeof row.error === 'string');
  })) return fail();
  const results = value.results as RemoteResult[];
  const durations = results.map(row => row.durationMs).filter(duration => duration > 0);
  const summary: RemoteAudit['summary'] = {
    checked: results.length, available: resources.length,
    unknownSize: results.filter(row => row.kind !== 'link' && row.bytes === undefined).length,
    failed: results.filter(row => !row.ok).length,
    totalBytes: results.reduce((sum, row) => sum + (row.bytes ?? 0), 0),
    averageResponseMs: durations.length ? Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length) : 0,
    slow: results.filter(row => row.durationMs > 1800).length,
    heavy: results.filter(row => (row.bytes ?? 0) > resourceBudgetBytes(row.kind, row.url)).length,
  };
  const reported = value.summary;
  if (!Object.entries(summary).every(([key, expectedCount]) => count(expectedCount) && reported[key] === expectedCount)) return fail();
  return { results, summary };
}

/** Read-only analysis: one deadline for transport, body and validation; never retries. */
export async function requestPublicationAudit(invitationId: string, resources: PublicationResource[], signal: AbortSignal, transport: typeof fetch = fetch): Promise<RemoteAudit> {
  if (signal.aborted) throw new Error(FAILURE);
  const snapshot = resources.map(resource => ({ ...resource }));
  const controller = new AbortController(), started = Date.now();
  let stopped: Error | null = null, settled = false;
  let rejectStop!: (error: Error) => void;
  const interrupted = new Promise<never>((_resolve, reject) => { rejectStop = reject; });
  const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', cancelled); };
  const stop = (message: string) => {
    if (settled) return;
    stopped = new Error(message); settled = true; cleanup();
    rejectStop(stopped); controller.abort();
  };
  const cancelled = () => stop(FAILURE);
  const timer = setTimeout(() => stop(TIMEOUT), PUBLICATION_AUDIT_TIMEOUT_MS);
  signal.addEventListener('abort', cancelled, { once: true });
  const assertCurrent = () => {
    if (!stopped && signal.aborted) stop(FAILURE);
    if (!stopped && Date.now() - started >= PUBLICATION_AUDIT_TIMEOUT_MS) stop(TIMEOUT);
    if (stopped) throw stopped;
  };
  const attempt = async () => {
    assertCurrent();
    let response: Response;
    try {
      response = await transport('/api/admin/publication-audit', {
        method: 'POST', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ invitationId, resources: snapshot }),
      });
    } catch { assertCurrent(); throw new Error(FAILURE); }
    assertCurrent();
    if (!response.ok) { void response.body?.cancel().catch(() => {}); throw new Error(FAILURE); }
    let value: unknown;
    try { value = await response.json(); }
    catch { assertCurrent(); throw new Error(FAILURE); }
    assertCurrent();
    const audit = checkedAudit(value, snapshot);
    assertCurrent();
    return audit;
  };
  const completed = attempt().then(value => { assertCurrent(); return value; }, error => { assertCurrent(); throw error; });
  try { return await Promise.race([interrupted, completed]); }
  finally { settled = true; cleanup(); }
}
