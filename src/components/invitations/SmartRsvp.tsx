'use client';

import type { Guest, InvitationLocale, TemplateTheme } from '@/lib/types';
import { resolveBlockTheme } from './blocks/theme';
import ConfirmationForm from './ConfirmationForm';
import { invitationCopy } from '@/lib/invitation-i18n';

interface Props {
  slug: string;
  theme?: TemplateTheme;
  publicId?: string;
  guestName?: string;
  maxPasses?: number;
  tableNo?: string;
  guest?: Guest;
  deadlinePassed?: boolean;
  demo?: boolean;
  viewport?: 'mobile' | 'desktop' | 'both';
  locale?: InvitationLocale;
}

/** Adaptador para plantillas sin un bloque de confirmación integrado. */
export default function SmartRsvp({ slug, theme, guestName, maxPasses, guest, deadlinePassed, demo = false, viewport = 'both', locale = 'es-BO' }: Props) {
  const t = resolveBlockTheme(theme);
  const copy = invitationCopy(locale);
  return <section id="enkarta-confirmar" className={`relative z-10 px-6 py-16 ${viewport === 'mobile' ? 'sm:hidden' : viewport === 'desktop' ? 'hidden sm:block' : ''}`} style={{ background: t.bg }}>
    <div className="mx-auto max-w-[420px]">
      <p className="mb-5 text-center font-cinzel text-sm uppercase tracking-[.18em]" style={{ color: t.muted }}>{copy.confirmation}</p>
      <ConfirmationForm slug={slug} theme={t} guest={guest} guestName={guestName} maxPasses={maxPasses} deadlinePassed={deadlinePassed} demo={demo} locale={locale} />
    </div>
  </section>;
}
