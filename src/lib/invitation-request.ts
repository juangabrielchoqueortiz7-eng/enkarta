/** Public invitation requests never retry automatically or cache private replies. */
export class InvitationRequestError extends Error {
  constructor(message: string, readonly status?: number) { super(message); this.name = 'InvitationRequestError'; }
}

/** Covers headers, body decoding and local generation even when work ignores abort. */
export async function boundedInvitationTask<T>(work: (signal: AbortSignal) => Promise<T>, options: { signal?: AbortSignal; timeout: number }): Promise<T> {
  const controller = new AbortController(), started = Date.now();
  let stopped: InvitationRequestError | undefined, rejectStop!: (reason: Error) => void;
  const interrupted = new Promise<never>((_resolve, reject) => { rejectStop = reject; });
  const stop = () => {
    if (stopped) return;
    stopped = new InvitationRequestError('La espera terminó sin comprobar el resultado.');
    rejectStop(stopped); controller.abort();
  };
  const timer = setTimeout(stop, options.timeout);
  options.signal?.addEventListener('abort', stop, { once: true });
  const check = () => {
    if (options.signal?.aborted || Date.now() - started >= options.timeout) stop();
    if (stopped) throw stopped;
  };
  const attempt = async () => { check(); const result = await work(controller.signal); check(); return result; };
  try { return await Promise.race([interrupted, attempt()]); }
  finally { clearTimeout(timer); options.signal?.removeEventListener('abort', stop); }
}

export function invitationJson<T>(url: string, init: RequestInit, validate: (value: unknown) => value is T, timeout: number): Promise<T> {
  return boundedInvitationTask(async signal => {
    const response = await fetch(url, { ...init, cache: 'no-store', signal });
    let value: unknown;
    try { value = await response.json(); }
    catch { throw new InvitationRequestError('La respuesta llegó incompleta.', response.ok ? undefined : response.status); }
    if (!response.ok) {
      const message = value && typeof value === 'object' && 'error' in value && typeof value.error === 'string' ? value.error : 'No se pudo completar la operación.';
      throw new InvitationRequestError(message, response.status);
    }
    if (!validate(value)) throw new InvitationRequestError('No pudimos verificar la respuesta del servidor.');
    return value;
  }, { signal: init.signal ?? undefined, timeout });
}
