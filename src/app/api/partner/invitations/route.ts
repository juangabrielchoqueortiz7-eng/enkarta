import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getPartnerContext, packageForPlan, partnerContextFor } from '@/lib/partner-session';
import { invitationStarter, STARTER_TEMPLATE_KEYS, type StarterTemplateKey } from '@/lib/template-starters';
import { newServiceContract } from '@/lib/packages';
import { storedServiceConfig } from '@/lib/package-services-server';
import { integrityError } from '@/lib/integrity-server';
import { draftCap } from '@/lib/partner-plans';
import { partnerDraftCreationError } from '@/lib/partner-draft-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const unauthenticated = () => NextResponse.json({ error: 'No autorizado' }, { status: 401 });
const LIST_COLUMNS = 'id,slug,status,template,type,names,event_date,cover_image_url,created_at';

/** Invitaciones del socio. Nunca alcanza las de Enkarta ni las de otro socio. */
export async function GET() {
  const context = await getPartnerContext();
  if (!context) return unauthenticated();

  const { data, error } = await supabaseAdmin
    .from('invitations').select(LIST_COLUMNS)
    .eq('partner_id', context.partner.id)
    .order('created_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ invitations: data ?? [], quota: context.quota }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Crea un borrador desde un diseño del catálogo. Diseñar es libre; publicar no. */
export async function POST(request: NextRequest) {
  try {
    const context = await getPartnerContext();
    if (!context) return unauthenticated();
    if (context.partner.status === 'suspended') return NextResponse.json({ error: 'Tu cuenta está suspendida.' }, { status: 403 });

    const body = await request.json().catch(() => null);
    const template = body?.template as StarterTemplateKey;
    if (!STARTER_TEMPLATE_KEYS.includes(template)) {
      return NextResponse.json({ error: 'El diseño seleccionado no está disponible' }, { status: 400 });
    }
    const cap = draftCap(context.subscription.plan);
    if (context.totalInvitations >= cap) {
      return NextResponse.json({ error: `Llegaste al máximo de ${cap} invitaciones. Elimina alguna o sube de plan.` }, { status: 409 });
    }

    const starter = invitationStarter(template);
    const { data, error } = await supabaseAdmin.from('invitations').insert({
      ...starter,
      // El plan del socio define el nivel de servicios de lo que publica.
      builder_config: newServiceContract(storedServiceConfig(starter.builder_config), packageForPlan(context.subscription.plan)),
      slug: `invitacion-${template.replace('_v2', '')}-${crypto.randomUUID().slice(0, 8)}`,
      partner_id: context.partner.id,
      parents_groom: JSON.stringify(starter.parents_groom),
      parents_bride: JSON.stringify(starter.parents_bride),
      sponsors: JSON.stringify(starter.sponsors),
      itinerary: JSON.stringify(starter.itinerary),
    }).select(LIST_COLUMNS).single();

    if (error) return partnerDraftCreationError(error) || NextResponse.json({ error: 'No se pudo confirmar la creación del borrador. Revisa tu panel antes de intentarlo de nuevo.' }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

/** Publicar o despublicar. Es el punto donde se cobra la suscripción. */
export async function PATCH(request: NextRequest) {
  try {
    const context = await getPartnerContext();
    if (!context) return unauthenticated();

    const body = await request.json().catch(() => null);
    const id = String(body?.id ?? '');
    const status = body?.status === 'ready' ? 'ready' : 'draft';
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    const { data: current } = await supabaseAdmin.from('invitations')
      .select('id,status,partner_id').eq('id', id).maybeSingle();
    if (!current || current.partner_id !== context.partner.id) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
    }

    const { error } = await supabaseAdmin.rpc('enkarta_set_publication', {
      p_id: id, p_partner_id: context.partner.id, p_enabled: status === 'ready',
    });
    if (error) return integrityError(error);
    const { data, error: readError } = await supabaseAdmin.from('invitations').select(LIST_COLUMNS).eq('id', id).eq('partner_id', context.partner.id).single();
    if (readError) return integrityError(readError);

    const fresh = await partnerContextFor(context.partner);
    return NextResponse.json({ invitation: data, quota: fresh.quota });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getPartnerContext();
    if (!context) return unauthenticated();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    const { error } = await supabaseAdmin.from('invitations')
      .delete().eq('id', id).eq('partner_id', context.partner.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
