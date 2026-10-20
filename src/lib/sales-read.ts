type SalesReadOptions = { signal?: AbortSignal; timeoutMs: number; timeoutMessage: string; cancelMessage: string };

/** Bound a complete private read even when a transport or body reader ignores abort. */
export function runSalesRead<T>(attempt: (signal: AbortSignal) => Promise<T>, options: SalesReadOptions): Promise<T> {
  const { signal, timeoutMs, timeoutMessage, cancelMessage } = options;
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647) return Promise.reject(new Error('El límite de espera de la consulta es inválido.'));
  if (signal?.aborted) return Promise.reject(new Error(cancelMessage));
  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController(), started = Date.now();
    let settled = false, listening = false;
    const cleanup = () => {
      clearTimeout(timer);
      if (listening) signal?.removeEventListener('abort', cancelled);
    };
    const stop = (message: string) => {
      if (settled) return;
      settled = true; cleanup(); reject(new Error(message));
      // Reject our own promise first: a synchronous abort-driven transport rejection cannot replace the reason.
      controller.abort();
    };
    const cancelled = () => stop(cancelMessage);
    const timer = setTimeout(() => stop(timeoutMessage), timeoutMs);
    if (signal) { signal.addEventListener('abort', cancelled, { once: true }); listening = true; }
    if (signal?.aborted) { stop(cancelMessage); return; }
    const finish = (success: boolean, value: T | unknown) => {
      if (settled) return;
      if (signal?.aborted) { stop(cancelMessage); return; }
      if (Date.now() - started >= timeoutMs) { stop(timeoutMessage); return; }
      settled = true; cleanup();
      if (success) resolve(value as T); else reject(value);
    };
    try { Promise.resolve(attempt(controller.signal)).then(value => finish(true, value), cause => finish(false, cause)); }
    catch (cause) { finish(false, cause); }
  });
}
