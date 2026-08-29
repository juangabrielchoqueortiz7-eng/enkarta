import { supabaseAdmin } from './supabase/server';
import { storedServiceConfig } from './package-services-server';
import { invitationValidity, type ValidityEvent, type ValiditySnapshot } from './invitation-validity';
import { privateJson, serviceError } from './services-server';

export const VALIDITY_COLUMNS = 'event_date,expires_at,status,is_active,validity_mode,validity_extra_days,validity_revision,builder_config';
/** Only after admin/owner authorization. No credentials or guest data in this DTO. */
export async function readValidity(id: string, history = false): Promise<ValiditySnapshot> {
  const { data, error } = await supabaseAdmin.from('invitations').select(VALIDITY_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('NOT_FOUND');
  let events: ValidityEvent[] = [];
  if (history) {
    const result = await supabaseAdmin.from('invitation_validity_events')
      .select('id,action,days,reason,before_expires_at,after_expires_at,before_revision,after_revision,created_at')
      .eq('invitation_id', id).order('after_revision', { ascending: false }).limit(30);
    if (result.error) throw result.error;
    events = result.data ?? [];
  }
  return { validity: invitationValidity({ ...data, config: storedServiceConfig(data.builder_config) }), history: events };
}
export function validityError(error: unknown) {
  const value = error as { code?: string; message?: string };
  if (['PGRST202', 'PGRST204', 'PGRST205', '42883', '42703', '42P01'].includes(value?.code ?? '')) {
    return privateJson({ code: 'MIGRATION_REQUIRED', error: 'Falta activar la vigencia. Aplica completa la migración 009 después de la 008.' }, 503);
  }
  const messages: Record<string, string> = {
    STALE_VALIDITY: 'La fecha, el paquete o la vigencia cambió en otra sesión. Actualiza y revisa el nuevo plazo.',
    VALIDITY_CONTRACT_REQUIRED: 'Primero guarda un paquete del catálogo vigente en Configuración.',
    VALIDITY_EVENT_REQUIRED: 'Guarda la fecha del evento antes de activar la vigencia o publicar.',
    VALIDITY_DATE_REQUIRED: 'Primero define una fecha de vencimiento; no se amplía un plazo indefinido.',
    VALIDITY_ALREADY_AUTOMATIC: 'La vigencia automática ya está activa. Actualiza los datos.',
    VALIDITY_AUTOMATIC: 'El vencimiento lo calcula el paquete. Utiliza una ampliación para añadir días.',
    VALIDITY_BEFORE_EVENT: 'El vencimiento no puede ser anterior al evento.',
    VALIDITY_NO_CHANGE: 'La fecha indicada ya está guardada.',
  };
  if (messages[value?.message ?? '']) return privateJson({ code: value.message, error: messages[value.message!] }, 409);
  // A reused UUID on another invitation can conflict at the unique constraint.
  if (value?.code === '23505') return serviceError(new Error('REQUEST_REUSED'));
  return serviceError(error);
}
