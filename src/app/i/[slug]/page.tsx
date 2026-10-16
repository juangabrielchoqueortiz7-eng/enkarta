import { supabaseAdmin } from '@/lib/supabase/server';
import {isCleanDesign} from '@/lib/clean-designs';
import { Guest, Invitation, parseInvitation } from '@/lib/types';
import PublishedTemplate from '@/components/invitations/PublishedTemplate';
import { notFound } from 'next/navigation';
import React from 'react';
// Legacy
import EntryGate from '@/components/invitations/EntryGate';
import BlockRenderer from '@/components/invitations/BlockRenderer';
import FontScope from '@/components/invitations/FontScope';
import SmartRsvp from '@/components/invitations/SmartRsvp';
import { PageMotionProvider } from '@/lib/scroll-motion';
import { gateInvitation, resolveFeatures } from '@/lib/packages';
import { partnerServesInvitation } from '@/lib/partner-session';
import { DEFAULT_MUSIC_URL } from '@/lib/music';
import { resolveLayoutBindings } from '@/lib/block-bindings';
import { findGuestByPublicId } from '@/lib/guests';
import { headers } from 'next/headers';
import InvitationAnalytics from '@/components/invitations/InvitationAnalytics';
import { canReviewInvitation } from '@/lib/host-session';
import { guestForServices } from '@/lib/package-services-server';
import { clientInvitation } from '@/lib/client-invitation';
import { latestPublishedInvitation, publicInvitationData } from '@/lib/published-invitation';
import PreviewCaptureController from '@/components/invitations/PreviewCaptureController';
import { eventDay, hasRsvpForm } from '@/lib/rsvp-contract';
import { activeInvitationLocale, formatInvitationDate, invitationCopy } from '@/lib/invitation-i18n';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ full?: string; g?: string; preview?: string; sample?: string; capture?: 'cover' | 'middle' | 'end' }>;
}

/** Iniciales para el sello del sobre: "Ana & Carlos" → "A & C" */
function deriveInitials(names: string | null): string {
  if (!names) return '';
  const parts = names.split(/\s*[&y]\s*/i).map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]?.toUpperCase() ?? ''} & ${parts[1][0]?.toUpperCase() ?? ''}`;
  return parts[0]?.[0]?.toUpperCase() ?? '';
}

// ── Pantallas de estado ────────────────────────────────────────────────────────
function StatusScreen({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="min-h-screen bg-enkarta-cream flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-enkarta-gold/10 flex items-center justify-center">
          {icon}
        </div>
        <h1 className="font-playfair text-2xl text-enkarta-dark mb-3">{title}</h1>
        <p className="text-gray-500 font-outfit">{text}</p>
      </div>
    </div>
  );
}

const ClockIcon = (
  <svg className="w-10 h-10 text-enkarta-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default async function InvitationPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { full, g, preview, sample, capture } = await searchParams;

  const { data, error } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    notFound();
  }

  const invitation = data as Invitation;
  const storedCopy = invitationCopy(activeInvitationLocale(parseInvitation(invitation).config));
  const privatePreview = preview === '1' && await canReviewInvitation(invitation.id);
  if (!privatePreview && invitation.validity_mode === 'automatic' && !invitation.expires_at) {
    return <StatusScreen icon={ClockIcon} title={storedCopy.preparationTitle} text={storedCopy.preparationText} />;
  }
  const publishedVersion = privatePreview ? null : await latestPublishedInvitation(invitation);

  // ── Borrador: aún no publicada ──
  if (invitation.status === 'draft' && !privatePreview && !publishedVersion) {
    return (
      <StatusScreen
        icon={ClockIcon}
        title={storedCopy.preparationTitle}
        text={storedCopy.preparationText}
      />
    );
  }

  if (invitation.status === 'disabled' && !privatePreview) {
    return <StatusScreen icon={ClockIcon} title={storedCopy.pausedTitle} text={storedCopy.pausedText} />;
  }

  if (invitation.status === 'expired' && !privatePreview) {
    return <StatusScreen icon={ClockIcon} title={storedCopy.finishedTitle} text={storedCopy.finishedText} />;
  }

  // ── Dada de baja manualmente ──
  if (invitation.is_active === false && !privatePreview) {
    return (
      <StatusScreen
        icon={ClockIcon}
        title={storedCopy.finishedTitle}
        text={storedCopy.finishedText}
      />
    );
  }

  // ── Invitación de un socio con la mensualidad vencida (tras los días de gracia) ──
  if (!privatePreview && !(await partnerServesInvitation((invitation as { partner_id?: string | null }).partner_id))) {
    return <StatusScreen icon={ClockIcon} title={storedCopy.pausedTitle} text={storedCopy.pausedText} />;
  }

  // ── Expiración automática (DATE → comparación por día) ──
  if (invitation.expires_at && !privatePreview) {
    const today = eventDay();
    if (invitation.expires_at.slice(0, 10) < today) {
      return (
        <StatusScreen
          icon={ClockIcon}
          title={storedCopy.finishedTitle}
          text={storedCopy.expiredText}
        />
      );
    }
  }

  if (!privatePreview && (invitation.status !== 'ready' || (invitation.publication_managed && !publishedVersion))) {
    return <StatusScreen icon={ClockIcon} title={storedCopy.preparationTitle} text={storedCopy.preparationText} />;
  }

  // ── Contador de vistas (incremento best-effort, no bloquea el render) ──
  if (!privatePreview) void supabaseAdmin.rpc('increment_invitation_views', { target_id: invitation.id }).then(async ({ error: incrementError }) => {
    // Compatibilidad mientras se aplica la migración 004.
    if (incrementError) await supabaseAdmin.from('invitations').update({ views_count: (invitation.views_count ?? 0) + 1 }).eq('id', invitation.id);
  }, () => {});

  // El paquete contratado (config.package) apaga las funciones no incluidas.
  // El editor guarda el borrador en `invitations`; el público recibe el último
  // snapshot publicado. ?preview=1 (admin/anfitrión autenticado) ve el borrador.
  const parsed = clientInvitation(gateInvitation(privatePreview ? parseInvitation(invitation) : (publishedVersion?.data ?? parseInvitation(invitation))));
  const config = parsed.config;
  const locale = activeInvitationLocale(config);
  const copy = invitationCopy(locale);
  delete config.activeGuest; // Nunca reutilizar un invitado de una vista previa guardada.
  const feats = resolveFeatures(config);

  // Toda invitación con música activa suena al abrirse: si el cliente no
  // eligió canción en el builder, se usa la pista por defecto. (Después del
  // gating: si el paquete apaga la música, no se re-añade.)
  if (feats.music && !config.musicUrl) config.musicUrl = DEFAULT_MUSIC_URL;

  // ── Link único por invitado (?g=): su nombre, pases y reglas viajan a la plantilla ──
  let guest: Guest | null = null;
  if (g && feats.guestNames) {
    guest = await findGuestByPublicId(invitation.id, g);
    if (guest) {
      guest = guestForServices(guest, config)!;
      config.activeGuest = guest;
      parsed.guest_name = guest.name;
      if (feats.passes) parsed.guest_passes = guest.passes;
      // Si este invitado no admite niños, forzamos el párrafo restrictivo aunque
      // la invitación general no lo tenga activado.
      if (!guest.allowKids) parsed.no_kids = true;
    }
  }
  if (privatePreview && sample === '1' && feats.guestNames) {
    guest = {
      id: 'preview-sample', publicId: 'muestra', name: 'Familia de Ejemplo', tableNo: '12', passes: 3,
      allowKids: true, group: 'Familia', eventAccess: 'both', sent: true, status: 'pending', accessCode: 'ENK-DEMO',
    };
    guest = guestForServices(guest, config)!;
    config.activeGuest = guest;
    parsed.guest_name = guest.name;
    if (feats.passes) parsed.guest_passes = guest.passes;
  }

  // Fecha límite de confirmación (columna rsvp_deadline): bloquea el formulario.
  delete config.guestMeta; // El público solo recibe el invitado de su enlace, nunca el padrón completo.
  const deadlinePassed = !!invitation.rsvp_deadline && invitation.rsvp_deadline.slice(0, 10) < eventDay();

  // ── Resolver el elemento de la plantilla ──
  // Si la invitación tiene un documento por bloques, manda sobre la plantilla legacy.
  const hasBlocks = !!config.layout?.blocks?.length;
  const resolvedLayout = hasBlocks ? resolveLayoutBindings(config.layout!, parsed) : null;
  const mobileForm = hasRsvpForm(resolvedLayout?.blocks ?? [], 'mobile');
  const desktopForm = hasRsvpForm(resolvedLayout?.blocks ?? [], 'desktop');
  const nativeLaura = (config.designKey === 'laura-y-andres' || config.designKey === 'annie-y-micky' || config.designKey === 'roly-y-yeliana' || config.designKey === 'nicole-y-francisco' || config.designKey === 'manuel-y-maya' || config.designKey === 'mariana-y-jesus' || config.designKey === 'paula-y-juan-felipe' || config.designKey === 'karla-y-mauricio' || (config.designKey === 'maria-angelica-y-mario' || isCleanDesign(config.designKey))) && !hasBlocks;
  const customCinematic = nativeLaura && config.entry?.style === 'cinematic';
  let templateEl: React.ReactNode;
  if (hasBlocks) {
    templateEl = null; // se reemplaza más abajo por <BlockRenderer> (con sus providers)
  } else {
    templateEl = <PublishedTemplate invitation={parsed} demo={privatePreview} skipEntry={full === '1' || customCinematic} deadlinePassed={deadlinePassed} />;
  }

  // ── Pantalla de entrada / "sobre": enlace principal la muestra; ?full=1 la salta ──
  // El toggle explícito de Entrada manda; si no se tocó, decide el paquete.
  const entryEnabled = (config.entry?.enabled ?? resolveFeatures(config).entry) && full !== '1' && (!nativeLaura || customCinematic);

  // Confirmación inteligente: formulario in-app al final (gateado por paquete).
  const smartRsvp = !nativeLaura && feats.smartRsvp && !privatePreview && !(mobileForm && desktopForm) ? (
    <SmartRsvp
      slug={invitation.slug}
      theme={config.theme}
      publicId={guest?.publicId}
      guestName={guest?.name}
      maxPasses={guest?.passes ?? (feats.passes ? parsed.guest_passes : undefined)}
      tableNo={guest?.tableNo}
      guest={guest ?? undefined}
      deadlinePassed={deadlinePassed}
      viewport={mobileForm ? 'desktop' : desktopForm ? 'mobile' : 'both'}
      locale={locale}
    />
  ) : null;

  // Envolvemos con el motor de transiciones (preset global editable).
  // `gated`: si hay portada, las animaciones esperan a que el invitado entre.
  // Con bloques, <BlockRenderer> ya incluye sus propios providers (tema + motion).
  const content = (
    <>
      {!privatePreview && <InvitationAnalytics slug={invitation.slug} guestPublicId={guest?.publicId} />}
      {privatePreview && !capture && <div className="fixed left-1/2 top-3 z-[200] -translate-x-1/2 rounded-full border border-violet-200 bg-white/95 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-violet-700 shadow-lg backdrop-blur font-outfit">Vista privada del borrador{sample === '1' ? ' · invitado de prueba' : ' · no publicada'}</div>}
      {privatePreview && capture && <PreviewCaptureController position={capture} />}
      {hasBlocks ? (
        <BlockRenderer layout={resolvedLayout!} theme={config.theme} nightTheme={config.nightTheme} nightDefault={config.nightDefault} motion={config.motion} decor={config.decor} tokens={config.tokens} musicUrl={config.musicUrl} slug={invitation.slug} guest={guest ?? undefined} demo={privatePreview} deadlinePassed={deadlinePassed} gated={entryEnabled} navigation={config.additionalServices?.navigation} locale={locale} />
      ) : (
        <PageMotionProvider value={config.motion} gated={entryEnabled}>
          {templateEl}
        </PageMotionProvider>
      )}
      {smartRsvp}
    </>
  );

  if (!entryEnabled) return <FontScope config={config}>{content}</FontScope>;

  // Solo aplicamos overrides de paleta si el usuario personalizó el tema; si no,
  // cada plantilla conserva la paleta de su entrada temática.
  return (
    <FontScope config={config}>
      <EntryGate
        template={parsed.template}
        names={parsed.names ?? 'Nuestra Boda'}
        initials={deriveInitials(parsed.names)}
        dateLine={formatInvitationDate(parsed.event_date, locale)}
        coverImage={parsed.cover_image_url ?? undefined}
        label={config.entry?.label || copy.enter}
        scene={config.entry?.style === 'cinematic' ? 'cinematic' : undefined}
        entryVideoUrl={config.entry?.videoUrl}
        entryPoster={config.entry?.poster}
        entryDuration={config.entry?.duration}
        entryOverlay={config.entry?.overlay}
        showSkip={config.entry?.showSkip ?? true}
        skipLabel={config.entry?.skipLabel || copy.skip}
        bg={config.theme?.bg}
        text={config.theme?.text}
        accent={config.theme?.primary}
      >
        {content}
      </EntryGate>
    </FontScope>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;

  const { data } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('slug', slug)
    .single();
  const metaData = data ? await publicInvitationData(data as Invitation) : null;

  const titles: Record<string, string> = {
    boda: 'Boda',
    xv: 'XV Años',
    cumpleanos: 'Cumpleaños',
    baby_shower: 'Baby Shower',
    bautizo: 'Bautizo',
  };

  const title = metaData?.names
    ? `${titles[metaData.type] || 'Invitación'} - ${metaData.names} | Enkarta`
    : 'Invitación Digital | Enkarta';
  const dateLine = formatInvitationDate(metaData?.event_date ?? null, activeInvitationLocale(metaData?.config));
  const description = metaData?.names
    ? `Estás invitado(a) a la ${titles[metaData.type]?.toLowerCase() || 'celebración'} de ${metaData.names}${dateLine ? ` · ${dateLine}` : ''}`
    : 'Invitación digital personalizada';

  // metadataBase para resolver URLs absolutas en la vista previa al compartir.
  let metadataBase: URL | undefined;
  try {
    const host = (await headers()).get('host');
    if (host) metadataBase = new URL(`${host.includes('localhost') ? 'http' : 'https'}://${host}`);
  } catch { /* sin host */ }

  // La imagen de vista previa al compartir la genera `opengraph-image.tsx`
  // (nombres + fecha sobre la foto, con marca). Next la inyecta en og:image y
  // twitter:image automáticamente, resolviéndola con metadataBase.
  return {
    title: { absolute: title },
    description,
    metadataBase,
    // Las invitaciones son privadas: no indexar en buscadores.
    robots: { index: false, follow: false },
    openGraph: { title, description, type: 'website', siteName: 'Enkarta' },
    twitter: { card: 'summary_large_image', title, description },
  };
}
