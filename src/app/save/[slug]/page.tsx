import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';
import { parseInvitation, type Invitation } from '@/lib/types';
import { canReviewInvitation } from '@/lib/host-session';
import { activeInvitationLocale, formatInvitationDate } from '@/lib/invitation-i18n';
import { publishedSaveDate } from '@/lib/save-date';
import { latestPublishedInvitation } from '@/lib/published-invitation';
import SaveDateExperience from '@/components/invitations/SaveDateExperience';
import FontScope from '@/components/invitations/FontScope';

export const dynamic = 'force-dynamic';

export default async function SaveDatePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const { data, error } = await supabaseAdmin.from('invitations').select('*').eq('slug', slug).single();
  if (error || !data) notFound();
  const invitation = data as Invitation;
  const privatePreview = preview === '1' && await canReviewInvitation(invitation.id);
  const draft = parseInvitation(invitation);
  const publicConfig = publishedSaveDate(draft);
  const config = privatePreview ? draft.config.additionalServices?.saveDate : publicConfig;
  if (!config || (!privatePreview && (!config.enabled || !config.published || invitation.is_active === false || ['disabled', 'expired'].includes(invitation.status)))) notFound();
  const published = await latestPublishedInvitation(invitation);
  const locale = activeInvitationLocale(draft.config);
  const ready = invitation.status === 'ready' && !!published;
  return <FontScope config={draft.config}><SaveDateExperience slug={slug} names={draft.names || 'Save the Date'} dateLabel={formatInvitationDate(draft.event_date, locale)} config={config} theme={draft.config.theme} locale={locale} invitationReady={ready} demo={privatePreview} /></FontScope>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await supabaseAdmin.from('invitations').select('*').eq('slug', slug).maybeSingle();
  const invitation = data ? parseInvitation(data as Invitation) : null;
  return { title: { absolute: invitation?.names ? `Save the Date · ${invitation.names} | Enkarta` : 'Save the Date | Enkarta' }, robots: { index: false, follow: false } };
}
