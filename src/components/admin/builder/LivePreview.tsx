'use client';

import { useEffect, useMemo, useRef } from 'react';
import { InvitationParsed } from '@/lib/types';
import { PREMIUM_REGISTRY } from '@/lib/template-registry';
import { PageMotionProvider } from '@/lib/scroll-motion';
import { gateInvitation, resolveFeatures } from '@/lib/packages';
import { resolveLayoutBindings } from '@/lib/block-bindings';
import BlockRenderer from '@/components/invitations/BlockRenderer';
import FontScope from '@/components/invitations/FontScope';
import SmartRsvp from '@/components/invitations/SmartRsvp';

interface Props {
  invitation: InvitationParsed;
  /** Vista del preview: teléfono o escritorio. */
  device?: 'mobile' | 'desktop';
  /** En modo bloques el preview es interactivo (clic en un bloque lo selecciona). */
  blockEditor?: boolean;
  selectedBlockId?: string;
  onSelectBlock?: (id: string) => void;
  onTransformBlock?: (id: string, patch: import('@/lib/types').BlockLayout) => void;
  onEditBlockProp?: (id: string, key: string, value: string) => void;
}

export default function LivePreview({ invitation: rawInvitation, device = 'mobile', blockEditor, selectedBlockId, onSelectBlock, onTransformBlock, onEditBlockProp }: Props) {
  // El preview refleja el paquete contratado (música/galería/pases gateados),
  // igual que la página pública. El editor de bloques usa el layout sin filtrar
  // para poder seguir editando bloques que el paquete oculta.
  const invitation = useMemo(() => gateInvitation(rawInvitation), [rawInvitation]);
  const template = invitation.template;
  const scrollRef = useRef<HTMLDivElement>(null);
  // Dimensiones del marco según el dispositivo.
  const isDesktop = device === 'desktop';
  const dispW = isDesktop ? 760 : 320;
  const logicalW = isDesktop ? 1000 : 390;
  const dispH = isDesktop ? 560 : 600;
  const scale = dispW / logicalW;
  // Cambiar de preset re-monta la plantilla para volver a reproducir la animación.
  const motionPreset = invitation.config?.motion?.preset ?? 'elegant';
  // En modo editor de bloques se usa el layout SIN gatear (para poder editarlo todo).
  const renderInvitation = blockEditor ? rawInvitation : invitation;
  const cfg = renderInvitation.config ?? {};
  const hasBlocks = !!cfg.layout?.blocks?.length;
  // La confirmación inteligente se muestra al final del preview (sin invitado, modo abierto).
  const smartRsvpOn = !blockEditor && resolveFeatures(invitation.config).smartRsvp;

  // Al seleccionar un bloque desde el panel, hace scroll hasta él en el preview.
  useEffect(() => {
    if (!hasBlocks || !blockEditor || !selectedBlockId) return;
    const el = scrollRef.current?.querySelector(`[data-block-id="${selectedBlockId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedBlockId, hasBlocks, blockEditor]);

  // Mapear datos DB → props de la plantilla via registry central.
  const premium = PREMIUM_REGISTRY[template];
  const premiumData = useMemo(() => (premium ? premium.map(invitation) : null), [premium, invitation]);

  return (
    <div className="w-full h-full flex items-start justify-center overflow-auto py-6 px-4 bg-gray-100">
      {/* Marco del dispositivo */}
      <div className="relative flex-shrink-0" style={{ width: dispW }}>
        {/* Barra superior (teléfono o navegador) */}
        {isDesktop ? (
          <div className="bg-gray-800 rounded-t-xl h-7 flex items-center gap-1.5 px-3">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
            <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
            <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
          </div>
        ) : (
          <div className="bg-gray-900 rounded-t-[2rem] h-8 flex items-center justify-center">
            <div className="w-20 h-4 bg-gray-800 rounded-full" />
          </div>
        )}

        {/* Contenedor de la plantilla — escalado al ancho del marco */}
        <div
          ref={scrollRef}
          className="overflow-hidden bg-white"
          style={{
            width: dispW,
            height: dispH,
            overflowY: 'auto',
            overflowX: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: logicalW,
              transformOrigin: 'top left',
              transform: `scale(${scale})`,
              // En modo bloques el preview es clicable; en el resto, no interactivo.
              pointerEvents: hasBlocks && blockEditor ? 'auto' : 'none',
            }}
          >
            <FontScope config={cfg}>
            {hasBlocks ? (
              <BlockRenderer
                key={motionPreset}
                layout={resolveLayoutBindings(cfg.layout!, renderInvitation)}
                theme={cfg.theme}
                nightTheme={cfg.nightTheme}
                nightDefault={cfg.nightDefault}
                motion={cfg.motion}
                decor={cfg.decor}
                tokens={cfg.tokens}
                editor={blockEditor}
                selectedId={selectedBlockId}
                onSelectBlock={onSelectBlock}
                onTransform={onTransformBlock}
                onEditProp={onEditBlockProp}
                previewScale={scale}
                scrollRoot={scrollRef}
                viewportMode={device}
              />
            ) : (
            <PageMotionProvider key={motionPreset} value={invitation.config?.motion} scrollRoot={scrollRef}>
            {premium && premiumData ? (
              <premium.Comp data={premiumData} />
            ) : (
              <div className="flex flex-col items-center justify-center h-[600px] text-gray-400 gap-3">
                <span className="text-5xl">🎨</span>
                <p className="text-sm font-outfit text-center px-6">
                  Esta plantilla aún no tiene builder visual.<br/>
                  Usa el editor de formulario.
                </p>
              </div>
            )}
            </PageMotionProvider>
            )}
            {smartRsvpOn && <SmartRsvp slug={invitation.slug} theme={cfg.theme} maxPasses={invitation.guest_passes} />}
            </FontScope>
          </div>
        </div>

        {/* Borde inferior */}
        {isDesktop ? (
          <div className="bg-gray-800 rounded-b-xl h-2.5" />
        ) : (
          <div className="bg-gray-900 rounded-b-[2rem] h-10 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-gray-700" />
          </div>
        )}

        {/* Etiqueta de plantilla */}
        <div className="text-center mt-3">
          <span className="text-xs text-gray-400 font-outfit bg-white px-3 py-1 rounded-full border border-gray-200 capitalize">
            {invitation.template} · {isDesktop ? 'escritorio' : 'móvil'}
          </span>
        </div>
      </div>
    </div>
  );
}
