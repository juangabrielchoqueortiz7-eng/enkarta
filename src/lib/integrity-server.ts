import { NextResponse } from 'next/server';

/** Stable domain errors; never expose bank responses, credentials or raw SQL. */
export function integrityError(error: { code?: string; message?: string } | null) {
  const message = error?.message || '';
  if (['42P01', '42703', '42883', 'PGRST202'].includes(error?.code || '')) {
    return NextResponse.json({ error: 'Falta aplicar las migraciones de integridad 014 y 015.', migrationRequired: true }, { status: 503 });
  }
  const errors: Record<string, [number, string]> = {
    NOT_FOUND: [404, 'No se encontró el registro.'],
    PUBLISH_FORBIDDEN: [403, 'No tienes permiso para publicar esta invitación.'],
    BUILDER_FORBIDDEN: [403, 'No puedes modificar datos de otra invitación.'],
    PAYMENT_FORBIDDEN: [403, 'No puedes operar sobre este pago.'],
    SUBSCRIPTION_REQUIRED: [402, 'Necesitas una suscripción activa para publicar.'],
    QUOTA_REACHED: [402, 'Llegaste al límite de publicaciones de tu plan.'],
    PUBLICATION_REQUIRED: [409, 'Abre el constructor y publica una versión antes de compartirla.'],
    PUBLICATION_ACTION_REQUIRED: [400, 'Publicar requiere una acción explícita de publicación.'],
    IMMUTABLE_PUBLICATION: [409, 'Una publicación es inmutable. Crea una versión nueva.'],
    ACTIVE_PUBLICATION: [409, 'No puedes eliminar una publicación activa.'],
    INVALID_SCHEDULE: [400, 'Elige una fecha de publicación al menos un minuto en el futuro.'],
    PAYMENT_LOCKED: [409, 'Este pago ya fue enviado a revisión o finalizado. Conservamos su importe y comprobante.'],
    BANK_CONFIRMATION_REQUIRED: [409, 'El pago BCP requiere confirmación verificada del banco.'],
    INVALID_PAYMENT: [400, 'Los datos del pago no son válidos.'],
  };
  const key = Object.keys(errors).find(value => message.includes(value));
  const [status, text] = key ? errors[key] : [500, 'No se pudo completar la operación. No se confirmó ningún cambio.'];
  return NextResponse.json({ error: text, code: key || 'OPERATION_FAILED' }, { status });
}
