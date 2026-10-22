export class BuilderRequestError extends Error {
  constructor(message: string, readonly uncertain = false, readonly status?: number) {
    super(message); this.name = 'BuilderRequestError';
  }
}

/** A deadline settles our wait even if the transport ignores AbortSignal. */
export async function boundedBuilderTask<T>(work: (signal: AbortSignal) => Promise<T>, options: { signal?: AbortSignal; timeout?: number; mutation?: boolean } = {}): Promise<T> {
  const controller = new AbortController(), started = Date.now(), timeout = options.timeout ?? 25_000;
  let stopped: BuilderRequestError | null = null, rejectStop!: (reason: Error) => void;
  const interrupted = new Promise<never>((_resolve, reject) => { rejectStop = reject; });
  const stop = (message: string) => {
    if (stopped) return;
    stopped = new BuilderRequestError(message, options.mutation === true);
    rejectStop(stopped); controller.abort();
  };
  const cancel = () => stop('La consulta se interrumpió. Comprueba el estado antes de continuar.');
  const timer = setTimeout(() => stop('La espera terminó sin confirmar el resultado. Actualiza el estado antes de repetir la operación.'), timeout);
  options.signal?.addEventListener('abort', cancel, { once: true });
  const check = () => {
    if (options.signal?.aborted) cancel();
    if (!stopped && Date.now() - started >= timeout) stop('La espera terminó sin confirmar el resultado. Actualiza el estado antes de repetir la operación.');
    if (stopped) throw stopped;
  };
  const attempt = async () => { check(); const value = await work(controller.signal); check(); return value; };
  try { return await Promise.race([interrupted, attempt()]); }
  finally { clearTimeout(timer); options.signal?.removeEventListener('abort', cancel); }
}

/** No retries. Mutations require an explicit acknowledgement predicate. */
export async function builderRequest<T>(url: string, init: RequestInit = {}, accept?: (value: T) => boolean): Promise<T> {
  const mutation = !!init.method && init.method !== 'GET';
  return boundedBuilderTask(async signal => {
    let response: Response;
    try { response = await fetch(url, { ...init, cache: 'no-store', signal }); }
    catch { throw new BuilderRequestError('No pudimos comprobar el resultado por un problema de conexión. Actualiza el estado antes de repetir.', mutation); }
    let value;
    try { value = await response.json(); }
    catch { throw new BuilderRequestError('La respuesta llegó incompleta. Actualiza el estado antes de continuar.', mutation && (response.ok || response.status >= 500), response.status); }
    if (!response.ok) throw new BuilderRequestError(typeof value?.error === 'string' ? value.error : 'No se pudo completar la operación.', mutation && response.status >= 500, response.status);
    if (accept && !accept(value)) throw new BuilderRequestError('No pudimos verificar la respuesta. Actualiza el estado antes de continuar.', mutation);
    return value as T;
  }, { signal: init.signal ?? undefined, mutation });
}
