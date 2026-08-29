import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/lib/host-session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { parseInvitation, type Invitation } from '@/lib/types';
import { clientInvitation } from '@/lib/client-invitation';
import ValidityPanel from '@/components/admin/builder/panels/ValidityPanel';

export const dynamic = 'force-dynamic';
export default async function ValidityPage({ params }: { params: { id: string } }) {
  await requireAdminPage();
  const { data, error } = await supabaseAdmin.from('invitations').select('*').eq('id', params.id).maybeSingle();
  if (error || !data) notFound();
  return <main className="min-h-screen bg-[#f5f3ee] px-4 py-8 font-outfit"><div className="mx-auto max-w-xl"><a href="/admin" className="text-sm text-gray-600">← Invitaciones</a><h1 className="mt-6 font-playfair text-3xl text-gray-900">Vigencia del servicio</h1><p className="mt-2 text-sm text-gray-500">{data.names || data.slug}</p><div className="mt-6 rounded-3xl border border-[#e8e2d8] bg-white p-5"><ValidityPanel data={clientInvitation(parseInvitation(data as Invitation), true)} /></div></div></main>;
}
