export type SyncState = 'loading' | 'current' | 'retrying' | 'offline' | 'paused' | 'denied';
export class SyncDenied extends Error {}
export const SYNC_INTERVAL = 8000;
export const retryDelay = (failures: number) => Math.min(60000, SYNC_INTERVAL * 2 ** Math.min(failures, 3));

/** Un solo request activo. Las respuestas antiguas nunca pisan una lectura nueva. */
export function createLiveSync<T>(options: {
  read: (signal: AbortSignal) => Promise<T>;
  receive: (value: T) => void;
  status: (state: SyncState) => void;
  schedule?: typeof setTimeout;
  cancel?: typeof clearTimeout;
}) {
  const schedule = options.schedule ?? setTimeout;
  const cancel = options.cancel ?? clearTimeout;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let requestTimeout: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let generation = 0, failures = 0;
  let stopped = false, suspended = false, denied = false;
  function clear() {
    generation++;
    if (timer !== undefined) cancel(timer);
    if (requestTimeout !== undefined) cancel(requestTimeout);
    timer = undefined;
    requestTimeout = undefined;
    controller?.abort();
  }
  async function refresh() {
    if (stopped || suspended || denied) return;
    clear();
    const current = generation;
    const request = new AbortController();
    controller = request;
    const timeout = schedule(() => request.abort(), 12000);
    requestTimeout = timeout;
    options.status('loading');
    try {
      const value = await options.read(request.signal);
      if (current !== generation || stopped) return;
      options.receive(value); failures = 0; options.status('current');
    } catch (error) {
      if (current !== generation || stopped) return;
      if (error instanceof SyncDenied) { denied = true; options.status('denied'); return; }
      failures++; options.status('retrying');
    } finally {
      cancel(timeout);
      if (current === generation && !stopped && !suspended && !denied) timer = schedule(refresh, retryDelay(failures));
    }
  }
  return {
    refresh,
    pause(state: 'offline' | 'paused') { suspended = true; clear(); if (!denied && !stopped) options.status(state); },
    resume() { suspended = false; if (!denied) void refresh(); },
    stop() { stopped = true; clear(); },
  };
}
