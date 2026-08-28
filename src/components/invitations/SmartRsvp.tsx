'use client';

import type { Guest, TemplateTheme } from '@/lib/types';
import { resolveBlockTheme } from './blocks/theme';
import ConfirmationForm from './ConfirmationForm';

interface Props {
  slug: string;
  theme?: TemplateTheme;
  publicId?: string;
  guestName?: string;
  maxPasses?: number;
  tableNo?: string;
  guest?: Guest;
  deadlinePassed?: boolean;
  viewport?: 'mobile' | 'desktop' | 'both';
}

/** Adaptador para plantillas sin un bloque de confirmación integrado. */
export default function SmartRsvp({ slug, theme, guestName, maxPasses, guest, deadlinePassed, viewport = 'both' }: Props) {
  const t = resolveBlockTheme(theme);
  return <section id="enkarta-confirmar" className={`relative z-10 px-6 py-16 ${viewport === 'mobile' ? 'sm:hidden' : viewport === 'desktop' ? 'hidden sm:block' : ''}`} style={{ background: t.bg }}>
    <div className="mx-auto max-w-[420px]">
      <p className="mb-5 text-center font-cinzel text-sm uppercase tracking-[.18em]" style={{ color: t.muted }}>Confirmación</p>
      <ConfirmationForm slug={slug} theme={t} guest={guest} guestName={guestName} maxPasses={maxPasses} deadlinePassed={deadlinePassed} />
    </div>
  </section>;
}
