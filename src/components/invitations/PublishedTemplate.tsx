'use client';

import dynamic from 'next/dynamic';
import { premiumFor, PREMIUM_REGISTRY } from '@/lib/template-registry';
import type { InvitationParsed } from '@/lib/types';

// The client boundary makes lazy template imports effective for public pages.
// No family is converted into a different layout or an approximate animation.
const CLASSIC = {
  perla: dynamic(() => import('@/components/templates/Perla')),
  marmol: dynamic(() => import('@/components/templates/Marmol')),
  terra: dynamic(() => import('@/components/templates/Terra')),
  sobre: dynamic(() => import('@/components/templates/Sobre')),
  carmesi: dynamic(() => import('@/components/templates/Carmesi')),
  gerbera: dynamic(() => import('@/components/templates/Gerbera')),
};

export default function PublishedTemplate({ invitation, demo, skipEntry, deadlinePassed }: {
  invitation: InvitationParsed; demo: boolean; skipEntry: boolean; deadlinePassed: boolean;
}) {
  const premium = premiumFor(invitation);
  if (premium) return <div className="ek-invite"><premium.Comp data={premium.map(invitation)} demo={demo} skipEntry={skipEntry} deadlinePassed={deadlinePassed} /></div>;
  const Classic = CLASSIC[invitation.template as keyof typeof CLASSIC] || CLASSIC.perla;
  return <div className="ek-invite"><Classic invitation={invitation} /></div>;
}

export function SampleTemplate({ template, data }: { template: string; data: Record<string, unknown> }) {
  const entry = PREMIUM_REGISTRY[template];
  return entry ? <entry.Comp data={data} /> : null;
}
