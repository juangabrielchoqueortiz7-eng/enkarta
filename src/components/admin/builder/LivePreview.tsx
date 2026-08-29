'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InvitationParsed } from '@/lib/types';
import { PREMIUM_REGISTRY } from '@/lib/template-registry';
import { PageMotionProvider } from '@/lib/scroll-motion';
import { gateInvitation, resolveFeatures } from '@/lib/packages';
import { resolveLayoutBindings } from '@/lib/block-bindings';
import BlockRenderer from '@/components/invitations/BlockRenderer';
import FontScope from '@/components/invitations/FontScope';
import SmartRsvp from '@/components/invitations/SmartRsvp';
import { publicTemplateName } from '@/lib/enkarta-collections';
import { publicAdditionalServices } from '@/lib/additional-services';
import { activeInvitationLocale } from '@/lib/invitation-i18n';

interface Props {
  invitation: InvitationParsed;
  /** Vista del preview: teléfono o escritorio. */
  device?: 'mobile' | 'desktop';
  /** Ancho lógico exacto que se quiere auditar (360, 390, 768, 1024 o 1440). */
  viewportWidth?: number;
  /** En modo bloques el preview es interactivo (clic en un bloque lo selecciona). */
  blockEditor?: boolean;
  selectedBlockId?: string;
  selectedBlockIds?: string[];
  onSelectBlock?: (id: string, additive?: boolean) => void;
  onTransformBlock?: (id: string, patch: import('@/lib/types').BlockLayout) => void;
  onEditBlockProp?: (id: string, key: string, value: string) => void;
  onPatchBlock?: (id: string, patch: Partial<import('@/lib/types').Block>) => void;
  onDuplicateBlock?: (id: string) => void;
  onDeleteBlock?: (id: string) => void;
  onCopyBlockStyle?: (id: string) => void;
  onPasteBlockStyle?: (id: string) => void;
  hasStyleClipboard?: boolean;
}

export default function LivePreview({ invitation: rawInvitation, device = 'mobile', viewportWidth, blockEditor, selectedBlockId, selectedBlockIds, onSelectBlock, onTransformBlock, onEditBlockProp, onPatchBlock, onDuplicateBlock, onDeleteBlock, onCopyBlockStyle, onPasteBlockStyle, hasStyleClipboard }: Props) {
  // El preview refleja el paquete contratado (música/galería/pases gateados),
  // igual que la página pública. El editor de bloques usa el layout sin filtrar
  // para poder seguir editando bloques que el paquete oculta.
  const invitation = useMemo(() => gateInvitation(rawInvitation), [rawInvitation]);
  const template = invitation.template;
  const scrollRef = useRef<HTMLDivElement>(null);
  const scaledContentRef = useRef<HTMLDivElement>(null);
  const [scaledContentHeight, setScaledContentHeight] = useState(0);
  // Dimensiones del marco según el dispositivo.
  const isDesktop = device === 'desktop';
  const logicalW = viewportWidth ?? (isDesktop ? 1024 : 390);
  const dispW = logicalW <= 390 ? 320 : logicalW <= 768 ? 600 : 760;
  const dispH = isDesktop ? 560 : 600;
  const scale = dispW / logicalW;
  // Cambiar de preset re-monta la plantilla para volver a reproducir la animación.
  // `playNonce` fuerza el re-montaje al pulsar ▶ para que los reveals se repitan.
  const motionPreset = invitation.config?.motion?.preset ?? 'elegant';
  const [playNonce, setPlayNonce] = useState(0);
  const remountKey = `${motionPreset}-${playNonce}`;

  // El contenido lógico se dibuja a 390/1000 px y luego se escala para entrar
  // en el marco. Un transform no reduce la altura de layout: sin compensarla,
  // el navegador dejaba al final un tramo blanco equivalente a la diferencia
  // entre la altura original y la altura visible escalada.
  useEffect(() => {
    const el = scaledContentRef.current;
    if (!el) return;
    const measure = () => setScaledContentHeight(Math.ceil(el.scrollHeight * scale));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    const id = requestAnimationFrame(measure);
    return () => { observer.disconnect(); cancelAnimationFrame(id); };
  }, [scale, remountKey, invitation, blockEditor]);

  // ▶ Reproducir: recorre el preview de arriba a abajo con scroll suave para ver
  // todas las animaciones de scroll sin salir del editor.
  const [playing, setPlaying] = useState(false);
  const playRaf = useRef(0);
  const stopPlay = useCallback(() => { cancelAnimationFrame(playRaf.current); setPlaying(false); }, []);
  useEffect(() => () => cancelAnimationFrame(playRaf.current), []);
  const togglePlay = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (playing) { stopPlay(); return; }
    setPlaying(true);
    setPlayNonce(n => n + 1); // re-monta para repetir los reveals desde cero
    el.scrollTop = 0;
    const SPEED = 140; // px/s (a escala del preview)
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      el.scrollTop += SPEED * dt;
      if (el.scrollTop >= el.scrollHeight - el.clientHeight - 1) { stopPlay(); return; }
      playRaf.current = requestAnimationFrame(step);
    };
    playRaf.current = requestAnimationFrame(step);
  };
  // En modo editor de bloques se usa el layout SIN gatear (para poder editarlo todo).
  const renderInvitation = blockEditor ? rawInvitation : invitation;
  const cfg = renderInvitation.config ?? {};
  const activeGuest = cfg.activeGuest;
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
    <div
      className="relative flex h-full w-full items-start justify-center overflow-auto px-4 pb-8 pt-16"
      style={{
        backgroundColor: '#e9e6df',
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(76,65,47,0.10) 1px, transparent 0)',
        backgroundSize: '22px 22px',
      }}
    >
      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span className="text-[10px] font-outfit font-semibold uppercase tracking-[0.14em] text-gray-500">Vista en vivo</span>
        <span className="text-[10px] font-outfit text-gray-400">· {logicalW}px · {hasBlocks ? `${cfg.layout?.blocks.length ?? 0} bloques` : 'plantilla original'}</span>
      </div>
      {/* Marco del dispositivo */}
      <div className="relative flex-shrink-0 drop-shadow-[0_24px_45px_rgba(42,35,25,0.20)]" style={{ width: dispW }}>
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

        {/* ▶ Reproducir demo de animaciones */}
        <button
          type="button"
          onClick={togglePlay}
          title={playing ? 'Detener' : 'Reproducir las animaciones de scroll'}
          className="absolute right-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-md ring-1 ring-gray-200 transition-transform hover:scale-105"
          style={{ top: isDesktop ? 36 : 42 }}
        >
          {playing ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="5" height="16" rx="1.2" /><rect x="14" y="4" width="5" height="16" rx="1.2" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v13.72c0 .93 1.02 1.5 1.82.98l10.02-6.86c.73-.5.73-1.58 0-2.08L9.82 4.16C9.02 3.64 8 4.21 8 5.14Z" /></svg>
          )}
        </button>

        {/* Contenedor de la plantilla — escalado al ancho del marco */}
        <div
          ref={scrollRef}
          className="overflow-hidden"
          onWheel={() => { if (playing) stopPlay(); }}
          onPointerDown={() => { if (playing) stopPlay(); }}
          style={{
            width: dispW,
            height: dispH,
            overflowY: 'auto',
            overflowX: 'hidden',
            position: 'relative',
            background: cfg.theme?.primaryDeep || '#1f2937',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: dispW,
              height: Math.max(scaledContentHeight, dispH),
            }}
          >
          <div
            ref={scaledContentRef}
            style={{
              position: 'absolute',
              inset: '0 auto auto 0',
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
                key={remountKey}
                layout={resolveLayoutBindings(cfg.layout!, renderInvitation)}
                theme={cfg.theme}
                nightTheme={cfg.nightTheme}
                nightDefault={cfg.nightDefault}
                motion={cfg.motion}
                decor={cfg.decor}
                tokens={cfg.tokens}
                editor={blockEditor}
                selectedId={selectedBlockId}
                selectedIds={selectedBlockIds}
                onSelectBlock={onSelectBlock}
                onTransform={onTransformBlock}
                onEditProp={onEditBlockProp}
                onPatchBlock={onPatchBlock}
                onDuplicateBlock={onDuplicateBlock}
                onDeleteBlock={onDeleteBlock}
                onCopyBlockStyle={onCopyBlockStyle}
                onPasteBlockStyle={onPasteBlockStyle}
                hasStyleClipboard={hasStyleClipboard}
                previewScale={scale}
                scrollRoot={scrollRef}
                viewportMode={device}
                guest={activeGuest}
                navigation={publicAdditionalServices(cfg.additionalServices)?.navigation}
                locale={activeInvitationLocale(cfg)}
              />
            ) : (
            <PageMotionProvider key={remountKey} value={invitation.config?.motion} scrollRoot={scrollRef}>
            {premium && premiumData ? (
              <div className="ek-invite"><premium.Comp data={premiumData} /></div>
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
            {smartRsvpOn && <SmartRsvp demo slug={invitation.slug} theme={cfg.theme} guest={activeGuest} publicId={activeGuest?.publicId} guestName={activeGuest?.name} maxPasses={activeGuest?.passes ?? invitation.guest_passes} tableNo={activeGuest?.tableNo} locale={activeInvitationLocale(cfg)} />}
            </FontScope>
          </div>
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
            {publicTemplateName(invitation.template, invitation.config?.layout?.presetKey)} · {isDesktop ? 'escritorio' : 'móvil'}
          </span>
        </div>
      </div>
    </div>
  );
}
