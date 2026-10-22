import type { Metadata } from 'next';
import type { InvitationParsed } from './types';
import { activeInvitationLocale, formatInvitationDate } from './invitation-i18n';
import { SITE_URL } from './site';

/** Tokens and preview flags never belong to a social card or canonical URL. */
export function invitationShareUrl(slug: string): URL {
  const base = new URL(SITE_URL);
  return new URL(`/i/${encodeURIComponent(slug)}`, base.origin);
}

export function validInvitationSlug(value: unknown): value is string {
  // Historical rows were not restricted to the current builder's slug format.
  // Validate one exact path segment; never normalize an existing invitation key.
  return typeof value === 'string' && value.trim().length > 0 && value !== '.' && value !== '..'
    && !/[/\\\u0000-\u001f\u007f-\u009f]/.test(value);
}

/** Accept the historical IDs as well as the current generated eight-character IDs. */
export function validGuestLinkId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

export function invitationShareMetadata(slug: string, published: InvitationParsed | null): Metadata {
  const titles: Record<string, string> = { boda: 'Boda', xv: 'XV Años', cumpleanos: 'Cumpleaños', baby_shower: 'Baby Shower', bautizo: 'Bautizo' };
  const title = published?.names ? `${titles[published.type] || 'Invitación'} - ${published.names} | Enkarta` : 'Invitación Digital | Enkarta';
  const date = formatInvitationDate(published?.event_date, activeInvitationLocale(published?.config));
  const description = published?.names
    ? `Estás invitado(a) a la ${titles[published.type]?.toLowerCase() || 'celebración'} de ${published.names}${date ? ` · ${date}` : ''}`
    : 'Invitación digital personalizada';
  const url = invitationShareUrl(slug);
  return {
    title: { absolute: title }, description, metadataBase: new URL(url.origin),
    alternates: { canonical: url.href },
    referrer: 'no-referrer',
    robots: { index: false, follow: false, noarchive: true, noimageindex: true },
    openGraph: { title, description, url: url.href, type: 'website', siteName: 'Enkarta' },
    twitter: { card: 'summary_large_image', title, description },
  };
}
