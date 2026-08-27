import { supabaseAdmin } from '@/lib/supabase/server';
import { Guest, Invitation, parseInvitation } from '@/lib/types';
import { PREMIUM_REGISTRY } from '@/lib/template-registry';
import { notFound } from 'next/navigation';
import React from 'react';
// Legacy
import Perla from '@/components/templates/Perla';
import Marmol from '@/components/templates/Marmol';
import Terra from '@/components/templates/Terra';
import Sobre from '@/components/templates/Sobre';
import Carmesi from '@/components/templates/Carmesi';
import Gerbera from '@/components/templates/Gerbera';
import EntryGate from '@/components/invitations/EntryGate';
import BlockRenderer from '@/components/invitations/BlockRenderer';
import FontScope from '@/components/invitations/FontScope';
import SmartRsvp from '@/components/invitations/SmartRsvp';
import { PageMotionProvider } from '@/lib/scroll-motion';
import { gateInvitation, resolveFeatures } from '@/lib/packages';
import { DEFAULT_MUSIC_URL } from '@/lib/music';
import { resolveLayoutBindings } from '@/lib/block-bindings';
import { findGuestByPublicId } from '@/lib/guests';
import { headers } from 'next/headers';
import InvitationAnalytics from '@/components/invitations/InvitationAnalytics';
import { canManageInvitation } from '@/lib/host-session';
import { latestPublishedInvitation, publicInvitationData } from '@/lib/published-invitation';
import PreviewCaptureController from '@/components/invitations/PreviewCaptureController';

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

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** "2026-09-20" → "Septiembre 20 · 2026" (parse por componentes para evitar desfases de zona horaria) */
function deriveDateLine(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const [y, mo, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !mo || !d) return undefined;
  return `${MESES[mo - 1]} ${String(d).padStart(2, '0')} · ${y}`;
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
  const privatePreview = preview === '1' && await canManageInvitation(invitation.id);
  const publishedVersion = privatePreview ? null : await latestPublishedInvitation(invitation);

  // ── Borrador: aún no publicada ──
  if (invitation.status === 'draft' && !privatePreview && !publishedVersion) {
    return (
      <StatusScreen
        icon={ClockIcon}
        title="Invitación en preparación"
        text="Esta invitación aún no está disponible. Pronto estará lista para ti."
      />
    );
  }

  if (invitation.status === 'disabled' && !privatePreview) {
    return <StatusScreen icon={ClockIcon} title="Invitación temporalmente fuera de línea" text="El anfitrión ha pausado esta invitación. Vuelve a intentarlo más adelante." />;
  }

  if (invitation.status === 'expired' && !privatePreview) {
    return <StatusScreen icon={ClockIcon} title="Evento finalizado" text="Gracias por acompañarnos. Esta invitación ya no está disponible." />;
  }

  // ── Dada de baja manualmente ──
  if (invitation.is_active === false && !privatePreview) {
    return (
      <StatusScreen
        icon={ClockIcon}
        title="Evento finalizado"
        text="Gracias por acompañarnos. Esta invitación ya no está disponible."
      />
    );
  }

  // ── Expiración automática (DATE → comparación por día) ──
  if (invitation.expires_at && !privatePreview) {
    const today = new Date().toISOString().slice(0, 10);
    if (invitation.expires_at.slice(0, 10) < today) {
      return (
        <StatusScreen
          icon={ClockIcon}
          title="Evento finalizado"
          text="Gracias por acompañarnos. El acceso a esta invitación ya expiró."
        />
      );
    }
  }

  // ── Contador de vistas (incremento best-effort, no bloquea el render) ──
  if (!privatePreview) void supabaseAdmin.rpc('increment_invitation_views', { target_id: invitation.id }).then(async ({ error: incrementError }) => {
    // Compatibilidad mientras se aplica la migración 004.
    if (incrementError) await supabaseAdmin.from('invitations').update({ views_count: (invitation.views_count ?? 0) + 1 }).eq('id', invitation.id);
  }, () => {});

  // El paquete contratado (config.package) apaga las funciones no incluidas.
  // El editor guarda el borrador en `invitations`; el público recibe el último
  // snapshot publicado. ?preview=1 (admin/anfitrión autenticado) ve el borrador.
  const parsed = gateInvitation(privatePreview ? parseInvitation(invitation) : (publishedVersion?.data ?? parseInvitation(invitation)));
  const config = parsed.config;
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
      const meta = config.guestMeta?.[guest.publicId];
      guest = { ...guest, ...meta };
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
    config.activeGuest = guest;
    parsed.guest_name = guest.name;
    if (feats.passes) parsed.guest_passes = guest.passes;
  }

  // Fecha límite de confirmación (columna rsvp_deadline): bloquea el formulario.
  const deadlinePassed = !!invitation.rsvp_deadline && invitation.rsvp_deadline.slice(0, 10) < new Date().toISOString().slice(0, 10);

  // ── Resolver el elemento de la plantilla ──
  // Si la invitación tiene un documento por bloques, manda sobre la plantilla legacy.
  const hasBlocks = !!config.layout?.blocks?.length;
  const premium = PREMIUM_REGISTRY[parsed.template];
  let templateEl: React.ReactNode;
  if (hasBlocks) {
    templateEl = null; // se reemplaza más abajo por <BlockRenderer> (con sus providers)
  } else if (premium) {
    templateEl = <div className="ek-invite"><premium.Comp data={premium.map(parsed)} /></div>;
  } else {
    const templates: Partial<Record<string, React.ComponentType<{ invitation: ReturnType<typeof parseInvitation> }>>> = {
      perla: Perla, marmol: Marmol, terra: Terra, sobre: Sobre, carmesi: Carmesi, gerbera: Gerbera,
    };
    const Template = templates[parsed.template] || Perla;
    templateEl = <div className="ek-invite"><Template invitation={parsed} /></div>;
  }

  // ── Pantalla de entrada / "sobre": enlace principal la muestra; ?full=1 la salta ──
  // El toggle explícito de Entrada manda; si no se tocó, decide el paquete.
  const entryEnabled = (config.entry?.enabled ?? resolveFeatures(config).entry) && full !== '1';

  // Confirmación inteligente: formulario in-app al final (gateado por paquete).
  const smartRsvp = feats.smartRsvp && !privatePreview ? (
    <SmartRsvp
      slug={invitation.slug}
      theme={config.theme}
      publicId={guest?.publicId}
      guestName={guest?.name}
      maxPasses={guest?.passes ?? (feats.passes ? parsed.guest_passes : undefined)}
      tableNo={guest?.tableNo}
      guest={guest ?? undefined}
      deadlinePassed={deadlinePassed}
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
        <BlockRenderer layout={resolveLayoutBindings(config.layout!, parsed)} theme={config.theme} nightTheme={config.nightTheme} nightDefault={config.nightDefault} motion={config.motion} decor={config.decor} tokens={config.tokens} musicUrl={config.musicUrl} slug={invitation.slug} guest={guest ?? undefined} demo={privatePreview} gated={entryEnabled} />
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
        dateLine={deriveDateLine(parsed.event_date)}
        coverImage={parsed.cover_image_url ?? undefined}
        label={config.entry?.label || 'Ingresar a mi invitación'}
        scene={config.entry?.style === 'cinematic' ? 'cinematic' : undefined}
        entryVideoUrl={config.entry?.videoUrl}
        entryPoster={config.entry?.poster}
        entryDuration={config.entry?.duration}
        entryOverlay={config.entry?.overlay}
        showSkip={config.entry?.showSkip ?? true}
        skipLabel={config.entry?.skipLabel || 'Omitir animación'}
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
  const dateLine = deriveDateLine(metaData?.event_date ?? null);
  const description = metaData?.names
    ? `Estás invitado(a) a la ${titles[metaData.type]?.toLowerCase() || 'celebración'} de ${metaData.names}${dateLine ? ` · ${dateLine}` : ''}`
    : 'Invitación digital personalizada';

  // metadataBase para resolver URLs absolutas en la vista previa al compartir.
  let metadataBase: URL | undefined;
  try {
    const host = headers().get('host');
    if (host) metadataBase = new URL(`${host.includes('localhost') ? 'http' : 'https'}://${host}`);
  } catch { /* sin host */ }

  // La imagen de vista previa al compartir la genera `opengraph-image.tsx`
  // (nombres + fecha sobre la foto, con marca). Next la inyecta en og:image y
  // twitter:image automáticamente, resolviéndola con metadataBase.
  return {
    title,
    description,
    metadataBase,
    // Las invitaciones son privadas: no indexar en buscadores.
    robots: { index: false, follow: false },
    openGraph: { title, description, type: 'website', siteName: 'Enkarta' },
    twitter: { card: 'summary_large_image', title, description },
  };
}
