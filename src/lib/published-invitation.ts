import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';
import { activePublishedVersion, readVersionStorageMeta, type BuilderVersion } from '@/lib/builder-versions';
import { parseInvitation, type Invitation, type InvitationParsed } from '@/lib/types';

interface PublishedRow {
  id: string;
  snapshot: InvitationParsed;
  created_at: string;
}

export interface PublishedInvitationVersion {
  id: string;
  data: InvitationParsed;
  summary?: string;
  createdAt: string;
}

export async function latestPublishedInvitation(invitation: Invitation): Promise<PublishedInvitationVersion | null> {
  const { data, error } = await supabaseAdmin
    .from('builder_versions')
    .select('id,snapshot,created_at')
    .eq('invitation_id', invitation.id)
    .eq('source', 'publish')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error || !data?.length) return null;
  const versions = (data as PublishedRow[]).map(row => {
    const decoded = readVersionStorageMeta(row.snapshot);
    return {
      id: row.id, invitationId: invitation.id, label: '', source: 'publish' as const,
      createdAt: new Date(row.created_at).getTime(), data: decoded.data, summary: decoded.summary,
      role: decoded.role, publicationState: decoded.publicationState, publishAt: decoded.publishAt,
    } satisfies BuilderVersion;
  });
  const selected = activePublishedVersion(versions);
  if (!selected) return null;
  if (selected.publicationState === 'scheduled' && invitation.status === 'draft') {
    await supabaseAdmin.from('invitations').update({ status: 'ready' }).eq('id', invitation.id).eq('status', 'draft');
  }
  return {
    id: selected.id,
    summary: selected.summary,
    createdAt: new Date(selected.createdAt).toISOString(),
    data: {
      ...selected.data,
      id: invitation.id,
      slug: invitation.slug,
      status: 'ready',
      is_active: invitation.is_active,
      expires_at: invitation.expires_at,
      views_count: invitation.views_count,
    },
  };
}

/** Publicación si existe; fila actual para invitaciones legacy. */
export async function publicInvitationData(invitation: Invitation): Promise<InvitationParsed> {
  const version = await latestPublishedInvitation(invitation);
  return version?.data ?? parseInvitation(invitation);
}
