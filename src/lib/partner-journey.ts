import { STARTER_DESIGNS, type StarterDesignKey } from './enkarta-collections';
import { isPartnerPlan, type PartnerPlanKey } from './partner-plans';
import { isUuid } from './rsvp-contract';

export function selectedPartnerDesign(value: unknown): StarterDesignKey | undefined {
  return typeof value === 'string' ? STARTER_DESIGNS.find(design => design.key === value)?.key : undefined;
}

export const partnerNewDesignPath = (design?: unknown) => {
  const key = selectedPartnerDesign(design);
  return '/socios/panel/nueva' + (key ? `?design=${encodeURIComponent(key)}` : '');
};
export const partnerPlanPath = (plan: PartnerPlanKey) => `/socios/panel?tab=suscripcion&plan=${plan}`;

/** OAuth continuation is an allowlisted route, never an arbitrary internal/external URL. */
export function safePartnerNext(value: unknown): string {
  const fallback = '/socios/panel';
  if (typeof value !== 'string' || value.length > 500 || !value.startsWith('/') || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  try {
    const url = new URL(value, 'https://enkarta.invalid');
    if (url.origin !== 'https://enkarta.invalid' || url.hash) return fallback;
    if (url.pathname === '/socios/panel/nueva') return partnerNewDesignPath(url.searchParams.get('design'));
    if (url.pathname === fallback) {
      const params = new URLSearchParams();
      const tab = url.searchParams.get('tab'), plan = url.searchParams.get('plan');
      if (tab && ['invitaciones', 'suscripcion', 'cuenta'].includes(tab)) params.set('tab', tab);
      if (isPartnerPlan(plan)) params.set('plan', plan);
      return fallback + (params.size ? '?' + params : '');
    }
    const id = url.pathname.split('/')[3];
    if (url.pathname === `/socios/constructor/${id}` && isUuid(id)) return url.pathname;
  } catch { /* Invalid continuation uses the account home. */ }
  return fallback;
}

export const partnerEntryPath = (next: string) => `/socios?next=${encodeURIComponent(safePartnerNext(next))}`;
export const partnerLoginErrorPath = (error: string, next: unknown) => `/socios?${new URLSearchParams({ error, next: safePartnerNext(next) })}`;
