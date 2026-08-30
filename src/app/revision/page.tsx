import { getHostSession, getReviewSession } from '@/lib/host-session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { parseInvitation, type Invitation } from '@/lib/types';
import { clientInvitation } from '@/lib/client-invitation';
import HostLogin from '@/components/admin/host/HostLogin';
import ClientReviewPanel from '@/components/admin/host/ClientReviewPanel';
import SessionExit from '@/components/admin/host/SessionExit';
import { isCurrentContract } from '@/lib/packages';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Revisión privada', robots: { index: false, follow: false } };
export default async function ReviewPage() {
  const reviewId = await getReviewSession();
  const id = reviewId || await getHostSession();
  if (!id) return <HostLogin scope="review" />;
  const { data } = await supabaseAdmin.from('invitations').select('*').eq('id', id).maybeSingle();
  if (!data) return <HostLogin scope="review" />;
  if (!reviewId && isCurrentContract(parseInvitation(data as Invitation).config)) return <HostLogin scope="review" />;
  return <main className="min-h-screen bg-[#f7f4ee] px-4 py-8"><div className="mx-auto max-w-3xl"><header className="mb-6 flex items-center justify-between gap-3"><div><p className="font-great text-3xl text-enkarta-gold">Enkarta</p><h1 className="font-outfit text-sm text-gray-600">Revisión privada del diseño</h1></div><SessionExit scope={reviewId ? "review" : "host"} /></header><ClientReviewPanel invitation={clientInvitation(parseInvitation(data as Invitation), true)} /><p className="mt-4 text-center font-outfit text-xs text-gray-500">Este acceso permite revisar y comentar el diseño. No permite gestionar invitados, abrir la planilla ni registrar ingresos.</p></div></main>;
}
