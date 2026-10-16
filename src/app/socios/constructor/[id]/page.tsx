import { notFound, redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Invitation, parseInvitation, InvitationParsed } from '@/lib/types';
import { requirePartnerPage } from '@/lib/partner-session';
import InvitationBuilder from '@/components/admin/builder/InvitationBuilder';
import { editorInvitation } from '@/lib/client-invitation';

export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ id: string }> }

/** Mismo constructor que usa el equipo Enkarta, montado en el espacio del socio. */
export default async function PartnerBuilderPage({ params }: Props) {
  noStore();
  const { id } = await params;
  const context = await requirePartnerPage(`/socios/constructor/${id}`);

  const { data, error } = await supabaseAdmin.from('invitations').select('*').eq('id', id).single();
  if (error || !data) notFound();
  // Una invitación de Enkarta o de otro socio no se abre aquí.
  if ((data as { partner_id?: string | null }).partner_id !== context.partner.id) redirect('/socios/panel');

  const invitation = data as Invitation;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = invitation as any;
  const withDefaults: InvitationParsed = {
    ...parseInvitation(invitation),
    is_active: raw.is_active ?? true,
    expires_at: raw.expires_at ?? null,
    views_count: raw.views_count ?? 0,
    builder_config: raw.builder_config ?? null,
    phone_whatsapp: raw.phone_whatsapp ?? null,
  };

  return <InvitationBuilder initialData={editorInvitation(withDefaults)} backHref="/socios/panel" builderPath="/socios/constructor" />;
}

export async function generateMetadata({ params }: Props) {
  const context = await requirePartnerPage();
  const { id } = await params;
  const { data } = await supabaseAdmin.from('invitations').select('names').eq('id', id).eq('partner_id', context.partner.id).single();
  return { title: `Editor — ${data?.names ?? 'Invitación'}` };
}
