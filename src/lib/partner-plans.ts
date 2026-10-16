import type { InvitationPackage } from './types';

// Programa de socios: terceros pagan una mensualidad a Enkarta para usar el
// sistema y revenden las invitaciones a sus propios clientes al precio que
// quieran. Es un producto distinto de PACKAGE_CATALOG (lo que Enkarta cobra por
// invitación); aquí se cobra el acceso a la plataforma, no el evento.
//
// Para cambiar precios, cupos o beneficios: edita solo PARTNER_PLANS. Todo lo
// demás (landing, panel, cobros, permisos) se deriva de esta matriz.

export type PartnerPlanKey = 'inicio' | 'estudio' | 'agencia';
export type PartnerSubscriptionStatus = 'none' | 'pending' | 'active' | 'canceled';
export type PartnerPaymentStatus = 'pending' | 'approved' | 'rejected' | 'canceled';
export type PartnerPaymentMethod = 'qr' | 'transfer' | 'cash';

export const PARTNER_PLAN_ORDER: PartnerPlanKey[] = ['inicio', 'estudio', 'agencia'];
export const PARTNER_PAYMENT_METHODS: PartnerPaymentMethod[] = ['qr', 'transfer', 'cash'];
export const PAYMENT_METHOD_LABELS: Record<PartnerPaymentMethod, string> = {
  qr: 'QR bancario', transfer: 'Transferencia', cash: 'Efectivo / depósito',
};

/** Días que una invitación publicada sigue en línea después de vencer el pago. */
export const PARTNER_GRACE_DAYS = 5;
/** Umbral para avisar al socio que su mensualidad está por vencer. */
export const PARTNER_RENEWAL_NOTICE_DAYS = 7;

export interface PartnerPlan {
  label: string;
  bs: number;
  tag: string;
  /** Invitaciones publicadas a la vez. 0 = sin límite. */
  activeInvitations: number;
  /** Nivel de funciones que recibe cada invitación que publica el socio. */
  invitationPackage: InvitationPackage;
  summary: string;
  highlights: string[];
}

export const PARTNER_PLANS = {
  inicio: {
    label: 'Inicio', bs: 249, tag: 'Para arrancar', activeInvitations: 3, invitationPackage: 'plus',
    summary: 'Prueba el negocio con tus primeros clientes.',
    highlights: [
      '3 invitaciones publicadas a la vez',
      'Todos los diseños del catálogo',
      'Constructor completo y vista previa ilimitada',
      'Confirmación por WhatsApp, música y apertura tipo sobre',
    ],
  },
  estudio: {
    label: 'Estudio', bs: 449, tag: 'El favorito', activeInvitations: 10, invitationPackage: 'premium',
    summary: 'Para quien ya vende invitaciones todos los meses.',
    highlights: [
      '10 invitaciones publicadas a la vez',
      'Confirmación por formulario y planilla exportable',
      'Nombres de invitados, pases y galería de 8 fotos',
      'Tu marca en el panel y soporte prioritario',
    ],
  },
  agencia: {
    label: 'Agencia', bs: 749, tag: 'Sin límite', activeInvitations: 0, invitationPackage: 'exclusive',
    summary: 'Volumen sin techo y todos los servicios operativos.',
    highlights: [
      'Invitaciones publicadas ilimitadas',
      'Confirmación inteligente + panel del anfitrión',
      'Escáner QR de acceso y asignación de mesas',
      'Galería de 20 fotos, hospedaje y calendario',
    ],
  },
} satisfies Record<PartnerPlanKey, PartnerPlan>;

/** Pagar varios meses por adelantado tiene descuento; ayuda al flujo de caja. */
export const BILLING_CYCLES: { months: number; label: string; discount: number }[] = [
  { months: 1, label: '1 mes', discount: 0 },
  { months: 3, label: '3 meses', discount: 0.05 },
  { months: 6, label: '6 meses', discount: 0.1 },
  { months: 12, label: '12 meses', discount: 0.2 },
];

export const isPartnerPlan = (value: unknown): value is PartnerPlanKey =>
  typeof value === 'string' && PARTNER_PLAN_ORDER.includes(value as PartnerPlanKey);

export const isBillingCycle = (months: unknown): boolean =>
  BILLING_CYCLES.some(cycle => cycle.months === months);

/** Precio final en Bs de `months` meses del plan, con el descuento por ciclo. */
export function cyclePrice(plan: PartnerPlanKey, months: number): number {
  const cycle = BILLING_CYCLES.find(item => item.months === months) ?? BILLING_CYCLES[0];
  return Math.round(PARTNER_PLANS[plan].bs * cycle.months * (1 - cycle.discount));
}

export const planLimit = (plan: PartnerPlanKey) => PARTNER_PLANS[plan].activeInvitations;

/** Tope de invitaciones creadas (borradores incluidos): frena el abuso sin estorbar. */
export function draftCap(plan: PartnerPlanKey): number {
  const limit = planLimit(plan);
  return limit === 0 ? 200 : Math.max(12, limit * 3);
}
export const formatBs = (amount: number) => `Bs ${amount.toLocaleString('es-BO')}`;

// ── Estado vigente de la suscripción ────────────────────────────────────────

export interface SubscriptionRow {
  plan_key: string;
  status: string;
  started_at: string | null;
  current_period_end: string | null;
}

export interface SubscriptionState {
  plan: PartnerPlanKey;
  status: PartnerSubscriptionStatus;
  /** Puede publicar y mantener invitaciones en línea. */
  active: boolean;
  /** Vencida pero dentro de los días de gracia: lo publicado sigue en línea. */
  inGrace: boolean;
  /** Días completos que faltan para vencer (negativo si ya venció). */
  daysLeft: number;
  periodEnd: string | null;
  /** Vence pronto y conviene avisarle. */
  renewalDue: boolean;
  label: string;
  tone: 'active' | 'warning' | 'pending' | 'inactive';
}

const DAY = 24 * 60 * 60 * 1000;

/** Único lugar donde se decide si un socio está al día. Sirve en cliente y servidor. */
export function subscriptionState(row: SubscriptionRow | null | undefined, now: Date = new Date()): SubscriptionState {
  const plan = isPartnerPlan(row?.plan_key) ? row!.plan_key as PartnerPlanKey : 'inicio';
  const status: PartnerSubscriptionStatus = ['none', 'pending', 'active', 'canceled'].includes(row?.status ?? '')
    ? row!.status as PartnerSubscriptionStatus : 'none';
  const endMs = row?.current_period_end ? Date.parse(row.current_period_end) : NaN;
  const hasEnd = Number.isFinite(endMs);
  const daysLeft = hasEnd ? Math.ceil((endMs - now.getTime()) / DAY) : 0;
  const active = status === 'active' && hasEnd && endMs > now.getTime();
  const inGrace = !active && status === 'active' && hasEnd && endMs + PARTNER_GRACE_DAYS * DAY > now.getTime();

  const base = { plan, status, active, inGrace, daysLeft, periodEnd: row?.current_period_end ?? null };
  if (active) {
    const renewalDue = daysLeft <= PARTNER_RENEWAL_NOTICE_DAYS;
    return {
      ...base, renewalDue,
      label: renewalDue ? `Vence en ${Math.max(daysLeft, 0)} día${daysLeft === 1 ? '' : 's'}` : 'Suscripción activa',
      tone: renewalDue ? 'warning' : 'active',
    };
  }
  if (inGrace) return { ...base, renewalDue: true, label: `Vencida · ${PARTNER_GRACE_DAYS + daysLeft} días de gracia`, tone: 'warning' };
  if (status === 'pending') return { ...base, renewalDue: true, label: 'Pago en revisión', tone: 'pending' };
  if (status === 'active' || status === 'canceled') return { ...base, renewalDue: true, label: 'Suscripción vencida', tone: 'inactive' };
  return { ...base, renewalDue: false, label: 'Sin suscripción', tone: 'inactive' };
}

/** Lo publicado sigue sirviéndose mientras haya suscripción o gracia. */
export const servesPublished = (state: SubscriptionState) => state.active || state.inGrace;

export interface QuotaState { limit: number; used: number; remaining: number; unlimited: boolean; reached: boolean }

/** Cupo de invitaciones publicadas del plan frente a las que ya tiene en línea. */
export function planQuota(plan: PartnerPlanKey, publishedCount: number): QuotaState {
  const limit = planLimit(plan);
  const unlimited = limit === 0;
  const remaining = unlimited ? Infinity : Math.max(limit - publishedCount, 0);
  return { limit, used: publishedCount, remaining, unlimited, reached: !unlimited && publishedCount >= limit };
}

/** Fin del nuevo periodo al aprobar un pago: nunca recorta el tiempo ya pagado. */
export function extendPeriod(currentEnd: string | null | undefined, months: number, now: Date = new Date()): Date {
  const currentMs = currentEnd ? Date.parse(currentEnd) : NaN;
  const from = Number.isFinite(currentMs) && currentMs > now.getTime() ? new Date(currentMs) : new Date(now);
  const next = new Date(from);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + Math.max(1, Math.trunc(months)));
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}
