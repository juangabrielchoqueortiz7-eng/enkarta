import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { builderActor, invitationActor, publishDenial } from '@/lib/builder-access';
import { packageForPlan } from '@/lib/partner-session';
import { draftCap } from '@/lib/partner-plans';
import { contractErrors, isCurrentContract, isPackage, newServiceContract, retainServiceContract } from '@/lib/packages';
import { storedServiceConfig } from '@/lib/package-services-server';
import { changesUncontractedColors } from '@/lib/package-colors';
import { validityError } from '@/lib/validity-server';

export const runtime = 'nodejs';

const unauthenticated = () => NextResponse.json({ error: 'No autorizado' }, { status: 401 });

// GET — List all invitations
export async function GET() {
  const actor = await builderActor();
  if (!actor) return unauthenticated();
  try {
    const query = supabaseAdmin
      .from('invitations')
      .select('*')
      .order('created_at', { ascending: false });
    // El socio solo ve su propia cartera; el equipo Enkarta ve todo.
    const { data, error } = await (actor.kind === 'partner' ? query.eq('partner_id', actor.partnerId) : query);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// POST — Create invitation
export async function POST(request: NextRequest) {
  const actor = await builderActor();
  if (!actor) return unauthenticated();
  try {
    const body = await request.json();

    let config = storedServiceConfig(body.builder_config);
    if (actor.kind === 'partner') {
      // El plan del socio manda: no puede asignarse un paquete que no paga.
      const { subscription, totalInvitations } = actor.context;
      if (totalInvitations >= draftCap(subscription.plan)) {
        return NextResponse.json({ error: `Llegaste al máximo de ${draftCap(subscription.plan)} invitaciones. Elimina alguna o sube de plan.` }, { status: 409 });
      }
      config = newServiceContract(config, packageForPlan(subscription.plan));
    } else {
      if (!isPackage(config.package)) return NextResponse.json({ error: 'Selecciona el paquete contratado.' }, { status: 400 });
      if (!config.serviceContract) config = newServiceContract(config, config.package);
    }
    const errors = contractErrors(config);
    if (errors.length) return NextResponse.json({ error: errors.join(' ') }, { status: 400 });

    const insertData = {
      // Solo las invitaciones de un socio llevan dueño; las del equipo Enkarta
      // no tocan la columna, así nada cambia donde aún no existe la migración 013.
      ...(actor.kind === 'partner' ? { partner_id: actor.partnerId } : {}),
      slug: body.slug,
      status: body.status || 'draft',
      template: body.template || 'perla',
      type: body.type || 'boda',
      names: body.names || null,
      event_date: body.event_date || null,
      rsvp_deadline: body.rsvp_deadline || null,
      ceremony_time: body.ceremony_time || null,
      ceremony_place: body.ceremony_place || null,
      ceremony_address: body.ceremony_address || null,
      reception_time: body.reception_time || null,
      reception_place: body.reception_place || null,
      reception_address: body.reception_address || null,
      guest_name: body.guest_name || null,
      guest_passes: body.guest_passes || 1,
      message: body.message || null,
      dress_code: body.dress_code || null,
      no_kids: body.no_kids || false,
      parents_groom: body.parents_groom ? JSON.stringify(body.parents_groom) : null,
      parents_bride: body.parents_bride ? JSON.stringify(body.parents_bride) : null,
      sponsors: body.sponsors ? JSON.stringify(body.sponsors) : null,
      itinerary: body.itinerary ? JSON.stringify(body.itinerary) : null,
      gift_message: body.gift_message || null,
      bank_account: body.bank_account || null,
      cover_image_url: body.cover_image_url || null,
      gallery_url: body.gallery_url || null,
      color_primary: body.color_primary || '#B8975A',
      color_secondary: body.color_secondary || '#FAF7F2',
      color_accent: body.color_accent || '#2C2519',
      phone_whatsapp: body.phone_whatsapp || null,
      builder_config: config,
    };

    const { data, error } = await supabaseAdmin
      .from('invitations')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// PUT — Update invitation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }
    const actor = await invitationActor(id);
    if (!actor) return unauthenticated();

    // Las credenciales se cambian únicamente desde su endpoint dedicado, y el
    // dueño de la invitación no se reasigna desde el constructor.
    for (const key of ['host_email', 'host_password_hash', 'review_email', 'review_password_hash', 'door_email', 'door_password_hash',
      'expires_at', 'validity_mode', 'validity_extra_days', 'validity_revision', 'partner_id']) delete updateData[key];

    // Publicar es lo que cobra la suscripción del socio: se verifica aquí, no en la UI.
    if (updateData.status === 'ready') {
      const { data: current } = await supabaseAdmin.from('invitations').select('status').eq('id', id).maybeSingle();
      const denial = await publishDenial(actor, current?.status === 'ready');
      if (denial) return NextResponse.json({ error: denial, needsSubscription: true }, { status: 402 });
    }
    if ('builder_config' in updateData || ['color_primary', 'color_secondary', 'color_accent'].some(key => key in updateData)) {
      const { data: current, error } = await supabaseAdmin.from('invitations').select('builder_config,color_primary,color_secondary,color_accent,template').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!current) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
      const previous = storedServiceConfig(current.builder_config);
      const config = 'builder_config' in updateData ? retainServiceContract(storedServiceConfig(updateData.builder_config), previous) : previous;
      const errors = contractErrors(config);
      if (isCurrentContract(previous) && !isCurrentContract(config)) errors.push('No se puede eliminar el contrato de servicios.');
      if (errors.length) return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
      if (changesUncontractedColors({ ...current, config: previous }, { ...current, ...updateData, config })) return NextResponse.json({ error: 'La personalización de color no está incluida. Registra el adicional en Configuración antes de cambiar la paleta o los colores de los bloques.' }, { status: 400 });
      updateData.builder_config = config;
    }

    // Stringify JSON fields if they're arrays/objects
    if (Array.isArray(updateData.parents_groom)) {
      updateData.parents_groom = JSON.stringify(updateData.parents_groom);
    }
    if (Array.isArray(updateData.parents_bride)) {
      updateData.parents_bride = JSON.stringify(updateData.parents_bride);
    }
    if (Array.isArray(updateData.sponsors)) {
      updateData.sponsors = JSON.stringify(updateData.sponsors);
    }
    if (Array.isArray(updateData.itinerary)) {
      updateData.itinerary = JSON.stringify(updateData.itinerary);
    }

    const { data, error } = await supabaseAdmin
      .from('invitations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.message?.startsWith('VALIDITY_')) return validityError(error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// DELETE — Delete invitation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }
    if (!(await invitationActor(id))) return unauthenticated();

    const { error } = await supabaseAdmin
      .from('invitations')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
