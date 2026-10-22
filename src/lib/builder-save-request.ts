export const BUILDER_SAVE_TIMEOUT_MS = 25_000;

export class BuilderSaveTimeoutError extends Error {
  constructor() {
    super('El guardado no respondió en 25 segundos. Conservamos tus cambios en esta pestaña. El servidor puede haberlos recibido. Descarga un respaldo y recarga para comprobar el borrador antes de continuar.');
    this.name = 'BuilderSaveTimeoutError';
  }
}

/** Bound headers AND JSON. Aborting a PUT does not undo a possible server write. */
export async function requestBuilderSave(payload: Record<string, unknown>, transport: typeof fetch = fetch) {
  const controller = new AbortController(), startedAt = Date.now();
  let expired: BuilderSaveTimeoutError | null = null;
  let rejectDeadline!: (error: BuilderSaveTimeoutError) => void;
  const deadline = new Promise<never>((_resolve, reject) => { rejectDeadline = reject; });
  const expire = () => {
    if (expired) return;
    expired = new BuilderSaveTimeoutError();
    rejectDeadline(expired);
    controller.abort();
  };
  const timer = setTimeout(expire, BUILDER_SAVE_TIMEOUT_MS);
  const check = () => {
    if (Date.now() - startedAt >= BUILDER_SAVE_TIMEOUT_MS) expire();
    if (expired) throw expired;
  };
  const attempt = async () => {
    const response = await transport('/api/admin/invitations', {
      method: 'PUT', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: controller.signal,
    });
    check();
    const stored = await response.json().catch(error => {
      check();
      if (!response.ok) return {};
      throw error;
    });
    check();
    if (!response.ok) throw new Error(stored?.error || 'No se pudo guardar el borrador');
    return stored;
  };
  try { return await Promise.race([deadline, attempt()]); }
  finally { clearTimeout(timer); }
}
