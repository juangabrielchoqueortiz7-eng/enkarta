import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { builderActor, invitationActor, publishDenial } from '@/lib/builder-access';
import { packageForPlan } from '@/lib/partner-session';
import { draftCap } from '@/lib/partner-plans';
import { partnerDraftCreationError } from '@/lib/partner-draft-server';
import { contractErrors, isCurrentContract, isPackage, newServiceContract, retainServiceContract } from '@/lib/packages';
import { storedServiceConfig } from '@/lib/package-services-server';
import { changesUncontractedColors } from '@/lib/package-colors';
import { validityError } from '@/lib/validity-server';

export const runtime = 'nodejs';

const unauthenticated = () => NextResponse.json({ error: 'No autorizado' }, { status: 401 });
function safeInvitation<T extends Record<string, unknown>>(row: T) {
  const safe = { ...row };
  for (const key of ['host_password_hash', 'review_password_hash', 'door_password_hash', 'phone_raw']) delete safe[key];
  return safe;
}

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

    return NextResponse.json((data || []).map(safeInvitation));
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
      if (body.status && body.status !== 'draft') return NextResponse.json({ error: 'Crea el borrador y publícalo desde el constructor.' }, { status: 400 });
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
      return partnerDraftCreationError(error) || NextResponse.json({ error: 'No se pudo confirmar la creación del borrador. Revisa tu panel antes de intentarlo de nuevo.' }, { status: 500 });
    }

    return NextResponse.json(safeInvitation(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}

// PUT — Update invitation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, expectedDraftRevision, draft_revision: legacyRevision, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 });
    }
    const actor = await invitationActor(id);
    if (!actor) return unauthenticated();
    const { data: stored, error: readError } = await supabaseAdmin.from('invitations').select('*').eq('id', id).maybeSingle();
    if (readError) return NextResponse.json({ error: 'No se pudo consultar el borrador.' }, { status: 503 });
    if (!stored) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
    const revision = expectedDraftRevision ?? legacyRevision;
    if ((stored.publication_managed || revision !== undefined) && (!Number.isSafeInteger(revision) || revision < 0)) {
      return NextResponse.json({ error: 'Actualiza el editor antes de guardar.', code: 'DRAFT_REVISION_REQUIRED' }, { status: 400 });
    }
    // Saving content never controls publication. Strip even if the row is still
    // a draft: a publication may commit between this read and the UPDATE.
    if (updateData.status === 'draft') delete updateData.status;

    // Las credenciales se cambian únicamente desde su endpoint dedicado, y el
    // dueño de la invitación no se reasigna desde el constructor.
    for (const key of ['host_email', 'host_password_hash', 'review_email', 'review_password_hash', 'door_email', 'door_password_hash',
      'expires_at', 'validity_mode', 'validity_extra_days', 'validity_revision', 'partner_id',
      'publication_managed', 'published_version_id', 'scheduled_version_id', 'created_at', 'views_count']) delete updateData[key];

    // Publicar es lo que cobra la suscripción del socio: se verifica aquí, no en la UI.
    if (updateData.status === 'ready') {
      const current = stored;
      if (current?.status !== 'ready' && (actor.kind === 'partner' || current?.publication_managed)) return NextResponse.json({ error: 'Publica una versión desde el constructor.' }, { status: 409 });
      const denial = await publishDenial(actor, current?.status === 'ready');
      if (denial) return NextResponse.json({ error: denial, needsSubscription: true }, { status: 402 });
      // A stale autosave must not resume an invitation paused in another tab.
      if (current.status === 'ready') delete updateData.status;
    }
    if ('builder_config' in updateData || ['color_primary', 'color_secondary', 'color_accent'].some(key => key in updateData)) {
      const current = stored;
      const previous = storedServiceConfig(current.builder_config);
      let config = 'builder_config' in updateData ? retainServiceContract(storedServiceConfig(updateData.builder_config), previous) : previous;
      if (actor.kind === 'partner') {
        config = { ...config, package: previous.package, features: previous.features, serviceContract: previous.serviceContract,
          additionalServices: previous.additionalServices, qualityControl: previous.qualityControl };
      }
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

    let update = supabaseAdmin
      .from('invitations')
      .update(updateData)
      .eq('id', id);
    if (actor.kind === 'partner') update = update.eq('partner_id', actor.partnerId);
    if (revision !== undefined) update = update.eq('draft_revision', revision);
    if (updateData.status === 'ready') update = update.eq('status', stored.status);
    const { data, error } = await update.select().maybeSingle();

    if (error) {
      if (error.message?.startsWith('VALIDITY_')) return validityError(error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data) return NextResponse.json({ error: 'El borrador cambió en otra sesión. Conserva tus cambios y actualiza antes de guardar.', code: 'STALE_DRAFT' }, { status: 409 });
    return NextResponse.json(safeInvitation(data));
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
    const actor = await invitationActor(id);
    if (!actor) return unauthenticated();

    let query = supabaseAdmin
      .from('invitations')
      .delete()
      .eq('id', id);
    if (actor.kind === 'partner') query = query.eq('partner_id', actor.partnerId);
    const { error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
