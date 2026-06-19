import { supabaseAdmin } from '@/lib/supabase/server';
import { Invitation, parseInvitation, InvitationParsed } from '@/lib/types';
import { notFound } from 'next/navigation';
import InvitationBuilder from '@/components/admin/builder/InvitationBuilder';
import { requireAdminPage } from '@/lib/host-session';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BuilderPage({ params }: Props) {
  noStore(); // forzar datos frescos sin cache
  await requireAdminPage(); // solo el equipo Enkarta
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) notFound();

  const invitation = data as Invitation;
  const parsed = parseInvitation(invitation);

  // Rellenar campos nuevos con defaults si no existen en la DB aún
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = invitation as any;
  const withDefaults: InvitationParsed = {
    ...parsed,
    is_active:      raw.is_active      ?? true,
    expires_at:     raw.expires_at     ?? null,
    views_count:    raw.views_count    ?? 0,
    builder_config: raw.builder_config ?? null,
    phone_whatsapp: raw.phone_whatsapp ?? null,
  };

  return <InvitationBuilder initialData={withDefaults} />;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const { data } = await supabaseAdmin.from('invitations').select('names').eq('id', id).single();
  return { title: `Editor — ${data?.names ?? 'Invitación'} | Enkarta Admin` };
}
