import { NextResponse } from 'next/server';

/** Stable creation failures from migration 021; do not expose raw SQL details. */
export function partnerDraftCreationError(error: { message?: string; details?: string } | null) {
  if (!error) return null;
  if (error.message === 'DRAFT_QUOTA_REACHED') {
    const limit = ['12', '30', '200'].includes(error.details ?? '') ? error.details : null;
    return NextResponse.json({
      error: limit ? `Llegaste al máximo de ${limit} invitaciones. Elimina alguna o sube de plan.` : 'Llegaste al máximo de invitaciones de tu plan. Elimina alguna o sube de plan.',
      code: 'DRAFT_QUOTA_REACHED',
    }, { status: 409 });
  }
  if (error.message === 'DRAFT_PLAN_CHANGED') {
    return NextResponse.json({ error: 'Tu plan cambió. Actualiza el panel antes de crear la invitación.', code: 'DRAFT_PLAN_CHANGED' }, { status: 409 });
  }
  if (error.message === 'DRAFT_CREATE_FORBIDDEN') {
    return NextResponse.json({ error: 'Tu cuenta no puede crear esta invitación. Actualiza el panel o contacta al equipo.', code: 'DRAFT_CREATE_FORBIDDEN' }, { status: 403 });
  }
  return null;
}
