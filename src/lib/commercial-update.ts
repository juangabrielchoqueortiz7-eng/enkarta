import { COMMERCIAL_LEAD_STATUSES, type CommercialLeadStatus } from './commercial';
import { parseCommercialLead, type CommercialLead } from './commercial-lookup';
import { isUuid } from './rsvp-contract';

export type CommercialUpdate = { id: string; requestId: string; expectedRevision: number; status: CommercialLeadStatus; revenueBs: number | null; notes: string };
export type CommercialDraft = { status: CommercialLeadStatus; revenue: string; notes: string };
export type CommercialSaveResult =
  | { kind: 'confirmed'; lead: CommercialLead; outcome: 'saved' | 'unchanged' | 'replayed' }
  | { kind: 'conflict'; lead: CommercialLead }
  | { kind: 'uncertain'; message: string };

export function commercialRevenue(value: unknown): number | null | undefined {
  if (value === '' || value === null) return null;
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  const text = String(value);
  if (text.length > 16 || !/^\d+(?:\.\d{1,2})?$/.test(text)) return undefined;
  const amount = Number(text);
  return Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000 ? amount : undefined;
}

export function parseCommercialUpdate(value: unknown): CommercialUpdate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>, revenue = commercialRevenue(body.revenueBs);
  if (typeof body.id !== 'string' || !isUuid(body.id) || typeof body.requestId !== 'string' || !isUuid(body.requestId) || !Number.isInteger(body.expectedRevision) || Number(body.expectedRevision) < 0 || Number(body.expectedRevision) > 2147483646 || !COMMERCIAL_LEAD_STATUSES.includes(body.status as CommercialLeadStatus) || typeof body.notes !== 'string' || body.notes.length > 1000 || body.notes.includes('\0') || revenue === undefined) return null;
  return { id: body.id.toLowerCase(), requestId: body.requestId.toLowerCase(), expectedRevision: Number(body.expectedRevision), status: body.status as CommercialLeadStatus, revenueBs: revenue, notes: body.notes.trim() };
}

export const commercialDraft = (lead: CommercialLead): CommercialDraft => ({ status: lead.status, revenue: lead.revenue_bs?.toString() ?? '', notes: lead.notes });
export function commercialDraftDirty(draft: CommercialDraft, base: CommercialLead): boolean {
  return draft.status !== base.status || commercialRevenue(draft.revenue) !== base.revenue_bs || draft.notes.trim() !== base.notes;
}

/** One explicit attempt only. An uncertain response must replay this exact requestId/body. */
export async function saveCommercialLead(update: CommercialUpdate, reference: string, transport: typeof fetch = fetch, signal?: AbortSignal): Promise<CommercialSaveResult> {
  const uncertain = (message = 'No se pudo confirmar el guardado. Pulsa «Comprobar guardado»; se usará la misma operación para evitar duplicados.'): CommercialSaveResult => ({ kind: 'uncertain', message });
  const command = parseCommercialUpdate(update);
  if (!command) return uncertain('El cambio no es válido. Conserva tus datos y vuelve a cargar el contacto antes de continuar.');
  let response: Response, body: Record<string, unknown>;
  try {
    response = await transport('/api/admin/commercial', { method: 'PATCH', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command), signal });
    body = await response.json();
  } catch { return uncertain(); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return uncertain();
  if (response.status === 401) return uncertain('Tu sesión terminó. Vuelve a ingresar. El guardado anterior aún no está confirmado.');
  if (response.status === 503 && body.code === 'MIGRATION_REQUIRED') return uncertain('El guardado seguro requiere la migración 019. Tus cambios siguen aquí y no se enviarán por el método anterior.');
  if (body.requestId !== command.requestId) return uncertain();
  const lead = parseCommercialLead(body.lead, reference);
  if (response.status === 409 && body.code === 'REVISION_CONFLICT' && lead?.id === command.id && lead.revision !== command.expectedRevision) return { kind: 'conflict', lead };
  if (!response.ok || !lead || lead.id !== command.id || !['saved', 'unchanged', 'replayed'].includes(String(body.outcome))) return uncertain();
  const expected = body.outcome === 'saved' ? lead.revision === command.expectedRevision + 1 : body.outcome === 'unchanged' ? lead.revision === command.expectedRevision : [command.expectedRevision, command.expectedRevision + 1].includes(lead.revision);
  if (!expected || lead.status !== command.status || lead.notes !== command.notes || lead.revenue_bs !== command.revenueBs) return uncertain();
  return { kind: 'confirmed', lead, outcome: body.outcome as 'saved' | 'unchanged' | 'replayed' };
}

export type CommercialEditorState = { base: CommercialLead; draft: CommercialDraft; phase: 'editing' | 'saving' | 'uncertain' | 'conflict'; request: CommercialUpdate | null; incoming: CommercialLead | null; message: string };
export type CommercialEditorAction =
  | { type: 'edit'; draft: CommercialDraft }
  | { type: 'start'; request: CommercialUpdate }
  | { type: 'result'; result: CommercialSaveResult }
  | { type: 'receive'; lead: CommercialLead }
  | { type: 'rebase' | 'discard' | 'reset' };
export const createCommercialEditor = (lead: CommercialLead): CommercialEditorState => ({ base: lead, draft: commercialDraft(lead), phase: 'editing', request: null, incoming: null, message: '' });

export function commercialEditorReducer(state: CommercialEditorState, action: CommercialEditorAction): CommercialEditorState {
  if (action.type === 'reset') return state.phase === 'editing' && !state.request ? { ...createCommercialEditor(state.base), message: 'Se retiraron los cambios locales.' } : state;
  if (action.type === 'edit') return state.phase === 'editing' ? { ...state, draft: action.draft, message: '' } : state;
  if (action.type === 'start') {
    const command = parseCommercialUpdate(action.request);
    if (!command || state.phase === 'saving' || state.phase === 'conflict') return state;
    if (state.phase === 'uncertain' && JSON.stringify(command) !== JSON.stringify(state.request)) return state;
    if (state.phase === 'editing' && (command.id !== state.base.id || command.expectedRevision !== state.base.revision || command.status !== state.draft.status || command.notes !== state.draft.notes.trim() || command.revenueBs !== commercialRevenue(state.draft.revenue))) return state;
    return { ...state, phase: 'saving', request: command, message: '' };
  }
  if (action.type === 'receive') {
    if (action.lead.id !== state.base.id || action.lead.revision <= Math.max(state.base.revision, state.incoming?.revision ?? -1)) return state;
    if (state.phase === 'saving' || state.phase === 'uncertain') return { ...state, incoming: action.lead };
    if (!commercialDraftDirty(state.draft, state.base)) return { ...createCommercialEditor(action.lead), message: 'Se cargó una versión más reciente del contacto.' };
    return { ...state, phase: 'conflict', incoming: action.lead, message: 'Otro dispositivo actualizó este contacto. Tus cambios aún no se guardaron.' };
  }
  if (action.type === 'result') {
    if (!state.request || (state.phase !== 'saving' && state.phase !== 'uncertain')) return state;
    const result = action.result;
    if (result.kind === 'uncertain') return { ...state, phase: 'uncertain', message: result.message };
    if (result.kind === 'conflict') return { ...state, phase: 'conflict', request: null, incoming: state.incoming && state.incoming.revision > result.lead.revision ? state.incoming : result.lead, message: 'Otro dispositivo actualizó este contacto. Tus cambios aún no se guardaron.' };
    const latest = state.incoming && state.incoming.revision > result.lead.revision ? state.incoming : result.lead;
    return { ...createCommercialEditor(latest), message: latest.revision > result.lead.revision ? 'Tu guardado se confirmó. Hay cambios posteriores; se muestra la versión más reciente.' : result.outcome === 'unchanged' ? 'Sin cambios pendientes. El contacto ya tenía estos datos.' : 'Guardado confirmado.' };
  }
  if (!state.incoming || state.phase !== 'conflict') return state;
  if (action.type === 'discard') return { ...createCommercialEditor(state.incoming), message: 'Se cargó la versión actual.' };
  const current = commercialDraft(state.incoming);
  const draft = {
    status: state.draft.status === state.base.status ? current.status : state.draft.status,
    revenue: commercialRevenue(state.draft.revenue) === state.base.revenue_bs ? current.revenue : state.draft.revenue,
    notes: state.draft.notes.trim() === state.base.notes ? current.notes : state.draft.notes,
  };
  return { ...createCommercialEditor(state.incoming), draft, message: 'Se conservaron solo los campos que editaste. Revisa los valores y pulsa Guardar cambios; aún no se guardaron.' };
}
