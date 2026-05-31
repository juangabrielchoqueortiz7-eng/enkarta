import { supabaseAdmin } from '@/lib/supabase/server';
import { Invitation, parseInvitation } from '@/lib/types';
import { notFound } from 'next/navigation';
import Perla from '@/components/templates/Perla';
import Marmol from '@/components/templates/Marmol';
import Terra from '@/components/templates/Terra';
import Sobre from '@/components/templates/Sobre';
import Carmesi from '@/components/templates/Carmesi';
import Gerbera from '@/components/templates/Gerbera';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function InvitationPage({ params }: Props) {
  const { slug } = await params;

  const { data, error } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    notFound();
  }

  const invitation = data as Invitation;

  if (invitation.status === 'draft') {
    return (
      <div className="min-h-screen bg-enkarta-cream flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-enkarta-gold/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-enkarta-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="font-playfair text-2xl text-enkarta-dark mb-3">Invitación en preparación</h1>
          <p className="text-gray-500 font-outfit">Esta invitación aún no está disponible. Pronto estará lista para ti.</p>
        </div>
      </div>
    );
  }

  const parsed = parseInvitation(invitation);

  const templates = {
    perla: Perla,
    marmol: Marmol,
    terra: Terra,
    sobre: Sobre,
    carmesi: Carmesi,
    gerbera: Gerbera,
  };

  const Template = templates[invitation.template] || Perla;

  return <Template invitation={parsed} />;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;

  const { data } = await supabaseAdmin
    .from('invitations')
    .select('names, type')
    .eq('slug', slug)
    .single();

  const titles: Record<string, string> = {
    boda: 'Boda',
    xv: 'XV Años',
    cumpleanos: 'Cumpleaños',
    baby_shower: 'Baby Shower',
    bautizo: 'Bautizo',
  };

  return {
    title: data?.names
      ? `${titles[data.type] || 'Invitación'} - ${data.names} | Enkarta`
      : 'Invitación Digital | Enkarta',
    description: data?.names
      ? `Estás invitado(a) a la ${titles[data.type]?.toLowerCase() || 'celebración'} de ${data.names}`
      : 'Invitación digital personalizada',
  };
}
