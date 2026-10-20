import { COMMERCIAL_LEAD_STATUSES, type CommercialLeadStatus } from './commercial';

export type CommercialLead = {
  id: string; reference: string; status: CommercialLeadStatus; package_key: string; design: string; event_category: string;
  placement: string; utm_source: string; utm_medium: string; utm_campaign: string; referrer_host: string;
  revenue_bs: number | null; notes: string; created_at: string; updated_at: string; revision: number;
};

/** Full commercial references only: never a partial, wildcard or payment reference. */
export function normalizeCommercialReference(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return /^EK-[A-F0-9]{8}$/.test(normalized) ? normalized : null;
}

export function parseCommercialLead(value: unknown, reference?: string): CommercialLead | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const lead = value as Record<string, unknown>;
  reference = reference ?? normalizeCommercialReference(lead.reference) ?? undefined;
  if (!reference || !Number.isInteger(lead.revision) || Number(lead.revision) < 0 || Number(lead.revision) > 2147483647) return null;
  if (typeof lead.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lead.id) || lead.reference !== reference || !COMMERCIAL_LEAD_STATUSES.includes(lead.status as CommercialLeadStatus)) return null;
  const fields = { package_key: 20, design: 100, event_category: 50, placement: 60, utm_source: 80, utm_medium: 80, utm_campaign: 120, referrer_host: 100, notes: 1000 };
  for (const [field, max] of Object.entries(fields)) if (typeof lead[field] !== 'string' || (lead[field] as string).length > max) return null;
  if (!['general', 'plus', 'premium', 'exclusive'].includes(lead.package_key as string)) return null;
  for (const date of [lead.created_at, lead.updated_at]) if (typeof date !== 'string' || !Number.isFinite(Date.parse(date))) return null;
  const revenue = lead.revenue_bs === null ? null : typeof lead.revenue_bs === 'number' || (typeof lead.revenue_bs === 'string' && /^\d+(\.\d{1,2})?$/.test(lead.revenue_bs)) ? Number(lead.revenue_bs) : NaN;
  if (revenue !== null && (!Number.isFinite(revenue) || revenue < 0)) return null;
  // Whitelist fields; private/session data from an unexpected reply never enters UI state.
  return { id: lead.id, reference, status: lead.status as CommercialLeadStatus, ...Object.fromEntries(Object.keys(fields).map(field => [field, lead[field]])), revenue_bs: revenue, created_at: lead.created_at as string, updated_at: lead.updated_at as string, revision: Number(lead.revision) } as CommercialLead;
}

export async function requestCommercialLead(reference: string, transport: typeof fetch = fetch, signal?: AbortSignal): Promise<CommercialLead | null> {
  const normalized = normalizeCommercialReference(reference);
  if (!normalized) throw new Error('Escribe la referencia completa: EK- y los 8 caracteres del mensaje de WhatsApp.');
  if (signal?.aborted) throw new Error('La búsqueda se interrumpió. Vuelve a intentarlo.');
  let response: Response;
  try {
    response = await transport(`/api/admin/commercial/lookup?reference=${encodeURIComponent(normalized)}`, { cache: 'no-store', signal });
  } catch {
    throw new Error('No se pudo comprobar la referencia. Revisa tu conexión y vuelve a buscar.');
  }
  if (signal?.aborted) throw new Error('La búsqueda se interrumpió. Vuelve a intentarlo.');
  if (response.status === 401) throw new Error('Tu sesión de administración terminó. Vuelve a ingresar para buscar.');
  let body: Record<string, unknown>;
  try { body = await response.json(); } catch { throw new Error('La respuesta llegó incompleta. Vuelve a buscar la referencia.'); }
  if (signal?.aborted) throw new Error('La búsqueda se interrumpió. Vuelve a intentarlo.');
  if (!response.ok) throw new Error(body?.code === 'MIGRATION_REQUIRED' ? 'La búsqueda comercial aún no está disponible. Comprueba las migraciones 012 y 019 con administración.' : 'No se pudo comprobar la referencia. Vuelve a intentarlo.');
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.prototype.hasOwnProperty.call(body, 'lead')) throw new Error('La respuesta llegó incompleta. Vuelve a buscar la referencia.');
  if (body.lead === null) return null;
  const lead = parseCommercialLead(body.lead, normalized);
  if (!lead) throw new Error('La respuesta no corresponde a esta referencia o está incompleta. Vuelve a buscar.');
  return lead;
}
