import { parseCommercialLead } from './commercial-lookup';
import { isSalesCommercialReference } from './sales-playbook';
import type { SalesDraftInput } from './sales-draft';
import type { InvitationPackage } from './types';

export type SalesQuoteContact = { reference: string; eventType: string; design: string; packageKey: InvitationPackage | null };

const validPackage = (value: unknown): value is InvitationPackage => typeof value === 'string' && ['plus', 'premium', 'exclusive'].includes(value);
const contextText = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
const validContext = (value: unknown): value is SalesQuoteContact => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const contact = value as Record<string, unknown>;
  return isSalesCommercialReference(contact.reference) && contextText(contact.eventType, 50) && contextText(contact.design, 100) && (contact.packageKey === null || validPackage(contact.packageKey));
};

/** Only the explicit quotation context leaves the validated commercial snapshot. */
export function salesQuoteContact(value: unknown): SalesQuoteContact | null {
  const lead = parseCommercialLead(value);
  if (!lead) return null;
  const contact: SalesQuoteContact = { reference: lead.reference, eventType: lead.event_category, design: lead.design, packageKey: lead.package_key === 'general' ? null : lead.package_key as InvitationPackage };
  return validContext(contact) ? contact : null;
}

/** A package must be chosen explicitly; names, dates and additional services never carry over. */
export function prepareSalesContactDraft(contact: SalesQuoteContact, packageKey: InvitationPackage): SalesDraftInput | null {
  if (!validContext(contact) || !validPackage(packageKey)) return null;
  return { commercialReference: contact.reference, eventType: contact.eventType, design: contact.design, packageKey, extrasBs: 0 };
}
