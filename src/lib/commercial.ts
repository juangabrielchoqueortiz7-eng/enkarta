import type { InvitationPackage } from './types';
import { BUSINESS_WHATSAPP, BRAND_NAME } from './brand';
import { PACKAGE_CATALOG } from './packages';

export type CommercialPackage = InvitationPackage | 'general';
export type CommercialViewEvent = 'landing_view' | 'design_view' | 'process_view';
export type CommercialLeadStatus = 'whatsapp_open' | 'contacted' | 'reserved' | 'won' | 'lost';

export const COMMERCIAL_PACKAGES: CommercialPackage[] = ['general', 'plus', 'premium', 'exclusive'];
export const COMMERCIAL_VIEW_EVENTS: CommercialViewEvent[] = ['landing_view', 'design_view', 'process_view'];
export const COMMERCIAL_LEAD_STATUSES: CommercialLeadStatus[] = ['whatsapp_open', 'contacted', 'reserved', 'won', 'lost'];

export interface CommercialContext {
  packageKey: CommercialPackage;
  design: string;
  eventType: string;
  placement: string;
  landingPath: string;
  referrerHost: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
}

const clean = (value: unknown, max = 80) => String(value ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
const cleanPath = (value: unknown) => {
  const path = clean(value, 160);
  return path.startsWith('/') && !path.startsWith('//') ? path : '/';
};

export function parseCommercialContext(value: Record<string, unknown>): CommercialContext {
  const packageValue = clean(value.packageKey ?? value.package, 20).toLowerCase() as CommercialPackage;
  return {
    packageKey: COMMERCIAL_PACKAGES.includes(packageValue) ? packageValue : 'general',
    design: clean(value.design),
    eventType: clean(value.eventType ?? value.event_type, 50),
    placement: clean(value.placement, 60) || 'sin_etiqueta',
    landingPath: cleanPath(value.landingPath ?? value.landing_path),
    referrerHost: clean(value.referrerHost ?? value.referrer_host, 100).toLowerCase(),
    utmSource: clean(value.utmSource ?? value.utm_source),
    utmMedium: clean(value.utmMedium ?? value.utm_medium),
    utmCampaign: clean(value.utmCampaign ?? value.utm_campaign, 120),
    utmContent: clean(value.utmContent ?? value.utm_content, 120),
    utmTerm: clean(value.utmTerm ?? value.utm_term, 120),
  };
}

export function commercialMessage(context: CommercialContext, reference: string): string {
  const plan = context.packageKey === 'general' ? '' : PACKAGE_CATALOG[context.packageKey];
  const lines = [
    `Hola ${BRAND_NAME}, ${plan ? `me interesa el paquete ${plan.label} de ${plan.bs} Bs.` : 'quiero información para crear una invitación digital.'}`,
    context.design ? `Estoy viendo el diseño ${context.design}.` : '',
    context.eventType ? `Tipo de evento: ${context.eventType}.` : '',
    'Quisiera conocer disponibilidad y los siguientes pasos para reservar.',
    `Referencia: ${clean(reference, 20)}`,
  ];
  return lines.filter(Boolean).join('\n');
}

export function commercialWhatsappUrl(context: CommercialContext, reference: string): string {
  return `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(commercialMessage(context, reference))}`;
}

export function commercialContactPath({ packageKey = 'general', design = '', eventType = '', placement }: Partial<CommercialContext> & { placement: string }): string {
  const params = new URLSearchParams({ package: packageKey, placement });
  if (design) params.set('design', design);
  if (eventType) params.set('event_type', eventType);
  return `/contacto/whatsapp?${params}`;
}

export function commercialConfirmationPath({ packageKey = 'general', design = '', eventType = '', landingPath = '/' }: Partial<CommercialContext>): string {
  const context = parseCommercialContext({ package: packageKey, design, event_type: eventType, landing_path: landingPath });
  const params = new URLSearchParams();
  if (context.packageKey !== 'general') params.set('package', context.packageKey);
  if (context.design) params.set('design', context.design);
  if (context.eventType) params.set('event_type', context.eventType);
  params.set('from', context.landingPath);
  return `/contacto/preparado?${params}`;
}

export function leadStatusLabel(status: CommercialLeadStatus): string {
  return ({ whatsapp_open: 'WhatsApp abierto', contacted: 'Conversación', reserved: 'Reserva', won: 'Venta', lost: 'No concretó' })[status];
}
