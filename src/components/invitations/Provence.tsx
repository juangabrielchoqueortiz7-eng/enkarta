'use client';

import { useEffect, useRef, useState, useContext, createContext } from 'react';
import { ProvenceContent, TemplateTheme } from './types';
import {
  useCountdown,
  Odometer,
  Reveal,
  EventIcon,
  MasonryGallery,
  CalIcon,
  SECTION,
  Seam,
} from './shared';
import { WriteOn, CascadeText } from '@/lib/scroll-motion';
import BrandByline from '@/components/brand/BrandByline';

// ── Paleta solar mediterránea de la colección Atelier ────────────────────────
const DEFAULT_C = {
  bg: '#F7EFE4',          // Crema cálido principal
  paper: '#FAF6EE',       // Marfil suave para secciones
  cardBg: '#FFFFFF',      // Blanco puro para tarjetas flotantes
  primary: '#68693F',     // Verde oliva elegante (títulos/iconos)
  oliveSoft: '#7A7C57',   // Verde oliva suave para bordes/divisores
  gold: '#A88144',        // Dorado cálido para acentos/scripts
  goldSoft: '#C2A982',    // Dorado claro para botones rellenos
  textDark: '#3E372E',    // Marrón oscuro / tinta para textos
  textMuted: '#544E39',   // Texto secundario
  white: '#FFFFFF',
  line: 'rgba(168, 129, 68, 0.25)', // Líneas y marcos dorados
  borderCard: 'rgba(122, 124, 87, 0.2)',
};
type PRPalette = typeof DEFAULT_C;

const ThemeCtx = createContext<PRPalette>(DEFAULT_C);
const useC = () => useContext(ThemeCtx);

function resolveProvenceTheme(t?: TemplateTheme): PRPalette {
  return {
    bg:         t?.bg          || DEFAULT_C.bg,
    paper:      t?.bg          || DEFAULT_C.paper,
    cardBg:     DEFAULT_C.cardBg,
    primary:    t?.primary     || DEFAULT_C.primary,
    oliveSoft:  DEFAULT_C.oliveSoft,
    gold:       t?.primary     || DEFAULT_C.gold,
    goldSoft:   DEFAULT_C.goldSoft,
    textDark:   t?.text        || DEFAULT_C.textDark,
    textMuted:  t?.muted       || DEFAULT_C.textMuted,
    white:      t?.onPrimary   || DEFAULT_C.white,
    line:       t?.line        || DEFAULT_C.line,
    borderCard: DEFAULT_C.borderCard,
  };
}

const F = {
  script: "'Great Vibes', 'Ms Claudy', cursive",
  heading: "'Cinzel', 'Rozha One', serif",
  sans: "'Poiret One', 'Raleway', sans-serif",
  body: "'Cormorant Garamond', 'Baskervville', serif",
};

// ── Componentes Tipográficos Auxiliares ──────────────────────────────────────
function ScriptText({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return (
    <p className={className} style={{ fontFamily: F.script, color: C.gold, lineHeight: 1.1, ...style }}>
      {children}
    </p>
  );
}

function HeadingText({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return (
    <h3 className={className} style={{ fontFamily: F.heading, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.primary, ...style }}>
      {children}
    </h3>
  );
}

function SansText({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return (
    <p className={className} style={{ fontFamily: F.sans, color: C.textMuted, letterSpacing: '0.05em', ...style }}>
      {children}
    </p>
  );
}

function OutlineBtn({ children, href, onClick }: { children: React.ReactNode; href?: string; onClick?: () => void }) {
  const C = useC();
  const cls = "inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3 text-[14px] font-medium tracking-[0.1em] uppercase transition-all duration-300 hover:scale-105 shadow-sm";
  const st: React.CSSProperties = {
    background: '#FFFFFF',
    color: C.gold,
    border: `1px solid ${C.gold}`,
    fontFamily: F.sans,
  };

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={st}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={cls} style={st}>
      {children}
    </button>
  );
}

function FilledBtn({ children, href, onClick }: { children: React.ReactNode; href?: string; onClick?: () => void }) {
  const C = useC();
  const cls = "inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-[14px] font-bold tracking-[0.1em] uppercase transition-all duration-300 hover:scale-105 shadow-md";
  const st: React.CSSProperties = {
    background: C.goldSoft,
    color: C.white,
    border: 'none',
    fontFamily: F.sans,
  };

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={st}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={cls} style={st}>
      {children}
    </button>
  );
}

// ── Componente Principal Provence ───────────────────────────────────────────
export default function Provence({ data }: { data: ProvenceContent }) {
  const { days, hours, mins, secs } = useCountdown(data.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const C = resolveProvenceTheme(data.theme);

  useEffect(() => {
    document.body.style.background = C.bg;
    return () => { document.body.style.background = ''; };
  }, [C.bg]);

  const toggleMusic = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  const gcalUrl = (() => {
    const s = data.isoDate.replace(/[-:]/g, '').slice(0, 15) + 'Z';
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Boda ${data.groom} & ${data.bride}`)}&dates=${s}/${s}`;
  })();

  const cd = [
    { v: days, l: 'Días' },
    { v: hours, l: 'Hrs' },
    { v: mins, l: 'Mins' },
    { v: secs, l: 'Segs' },
  ];

  return (
    <ThemeCtx.Provider value={C}>
      <div className="relative w-full overflow-x-hidden" style={{ background: C.bg, color: C.textDark, fontFamily: F.body }}>
        <style>{`
          @keyframes pvSpin { to { transform: rotate(360deg); } }
          @keyframes pvSparkle { 0%, 100% { opacity: 0.3; transform: scale(0.9); } 50% { opacity: 0.9; transform: scale(1.1); } }
        `}</style>

        {/* Reproductor de Música Opcional */}
        {data.musicUrl && <audio ref={audioRef} src={data.musicUrl} loop />}
        {data.musicUrl && (
          <button
            onClick={toggleMusic}
            className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-all duration-300 hover:scale-110"
            style={{ background: C.white, color: C.gold, border: `1px solid ${C.gold}` }}
            aria-label="Música"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ animation: playing ? 'pvSpin 4s linear infinite' : 'none' }}>
              <path d="M9 17a3 3 0 11-2-2.83V5l11-2v10.17A3 3 0 1116 14V7L9 8.4V17z" />
            </svg>
          </button>
        )}

        {/* ════════ 1. PORTADA HERO SPLIT ════════ */}
        <section className="relative min-h-screen grid grid-cols-1 lg:grid-cols-2 items-center overflow-hidden">
          {/* Lado Izquierdo: Fotografía principal con degradado suave al pie */}
          <div className="relative h-[65vh] lg:h-full w-full overflow-hidden">
            {data.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.coverImage} alt="Novios" className="h-full w-full object-cover ek-kenburns" />
            ) : (
              <div className="h-full w-full bg-stone-300 flex items-center justify-center text-stone-500 font-serif">
                Foto Principal
              </div>
            )}
            <Seam edge="bottom" shape="arch" from={C.bg} hairline={C.gold} height="clamp(56px,12vw,110px)" />
          </div>

          {/* Lado Derecho: Nombres y tipografía script */}
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center z-10">
            <Reveal>
              <div className="relative inline-block py-8 px-4">
                <ScriptText style={{ fontSize: 'clamp(70px, 12vw, 120px)' }}>
                  <WriteOn>{data.groom}</WriteOn>
                </ScriptText>
                <p className="my-2" style={{ fontFamily: F.heading, fontSize: 'clamp(24px, 4vw, 36px)', color: C.textDark }}>
                  &amp;
                </p>
                <ScriptText style={{ fontSize: 'clamp(70px, 12vw, 120px)' }}>
                  <CascadeText text={data.bride} delay={400} />
                </ScriptText>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ════════ 2. SECCIÓN CUENTA REGRESIVA Y MARCO OVALADO ════════ */}
        <section className={`px-6 ${SECTION.base} text-center relative z-10`}>
          <Reveal className="mx-auto max-w-2xl flex flex-col items-center">
            {/* Icono Novios */}
            <div className="mb-4 text-3xl text-amber-700">💍</div>

            <HeadingText className="text-xl sm:text-2xl mb-2">{data.headerSub}</HeadingText>
            <SansText className="max-w-md mx-auto text-sm sm:text-base mb-8 leading-relaxed">
              {data.headerMessage}
            </SansText>

            {/* Adorno Corazón */}
            <div className="my-2 text-stone-400">🤍</div>

            <SansText className="text-xs sm:text-sm font-semibold tracking-widest uppercase mb-8">
              {data.dateIntro}
            </SansText>

            {/* MARCO OVALADO VERTICAL ESTILIZADO (Insignia Fecha) */}
            <div
              className="my-6 px-10 py-8 rounded-[120px] flex flex-col items-center justify-center transition-transform hover:scale-105"
              style={{ border: `2px solid ${C.oliveSoft}`, minWidth: '220px' }}
            >
              <SansText className="text-xs uppercase tracking-widest text-stone-600 mb-1">
                {data.locationBadge}
              </SansText>
              <div className="w-12 h-px bg-stone-300 my-2" />
              <SansText className="text-xs uppercase tracking-widest font-semibold">{data.dateWeekday}</SansText>
              <p
                className="my-1 font-serif text-6xl sm:text-7xl font-light tracking-tight"
                style={{ fontFamily: F.heading, color: C.oliveSoft }}
              >
                {data.dateDay}
              </p>
              <SansText className="text-xs uppercase tracking-widest font-semibold">{data.dateMonth}</SansText>
              <div className="w-12 h-px bg-stone-300 my-2" />
              <SansText className="text-xs tracking-wider">{data.dateYear}</SansText>
            </div>

            {/* Contadores FALTAN */}
            <SansText className="mt-8 mb-4 text-xs font-semibold tracking-widest uppercase" style={{ color: C.primary }}>
              FALTAN:
            </SansText>

            <div
              className="grid grid-cols-4 gap-2 sm:gap-4 px-6 py-4 rounded-2xl max-w-md w-full shadow-sm"
              style={{ border: `1px solid ${C.textDark}`, background: C.cardBg }}
            >
              {cd.map((c) => (
                <div key={c.l} className="flex flex-col items-center">
                  <p className="font-sans text-2xl sm:text-3xl font-bold" style={{ fontFamily: F.sans, color: C.primary }}>
                    <Odometer value={c.v} />
                  </p>
                  <SansText className="text-[11px] sm:text-xs">{c.l}</SansText>
                </div>
              ))}
            </div>

            {/* Botón Agendar */}
            <div className="mt-8">
              <OutlineBtn href={gcalUrl}>
                <CalIcon /> Agendar el evento
              </OutlineBtn>
            </div>
          </Reveal>
        </section>

        {/* ════════ 3. PADRES Y BENDICIÓN (TARJETA BLANCA FLOTANTE) ════════ */}
        <section className="px-6 py-12">
          <Reveal className="mx-auto max-w-4xl">
            <div
              className="p-8 sm:p-12 rounded-2xl text-center shadow-lg border"
              style={{ background: C.cardBg, borderColor: C.borderCard }}
            >
              <HeadingText className="text-lg sm:text-xl mb-8 leading-snug">
                {data.blessingTitle}
              </HeadingText>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                {/* Madre de la Novia */}
                <div className="flex flex-col items-center">
                  <SansText className="text-xs uppercase font-bold tracking-widest mb-2" style={{ color: C.primary }}>
                    MADRE DE LA NOVIA
                  </SansText>
                  {data.parentsBride.map((p, i) => (
                    <SansText key={i} className="text-sm font-medium" style={{ color: C.textDark }}>
                      {p}
                    </SansText>
                  ))}
                </div>

                {/* Madre del Novio */}
                <div className="flex flex-col items-center">
                  <SansText className="text-xs uppercase font-bold tracking-widest mb-2" style={{ color: C.primary }}>
                    MADRE DEL NOVIO
                  </SansText>
                  {data.parentsGroom.map((p, i) => (
                    <SansText key={i} className="text-sm font-medium" style={{ color: C.textDark }}>
                      {p}
                    </SansText>
                  ))}
                </div>

                {/* Padrinos */}
                {data.padrinos && data.padrinos.length > 0 && (
                  <div className="flex flex-col items-center">
                    <SansText className="text-xs uppercase font-bold tracking-widest mb-2" style={{ color: C.primary }}>
                      PADRINOS
                    </SansText>
                    {data.padrinos.map((p, i) => (
                      <SansText key={i} className="text-sm font-medium" style={{ color: C.textDark }}>
                        {p}
                      </SansText>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        </section>

        {/* ════════ 4. CEREMONIA Y RECEPCIÓN ════════ */}
        <section className={`px-6 ${SECTION.base} text-center`}>
          <Reveal className="mx-auto max-w-xl flex flex-col items-center">
            {/* Icono Anillos */}
            <div className="mb-3">
              <EventIcon name="rings" stroke={C.primary} className="w-9 h-9" />
            </div>

            <HeadingText className="text-xl sm:text-2xl mb-4">CEREMONIA Y RECEPCIÓN</HeadingText>

            <p className="font-serif text-2xl sm:text-3xl italic mb-1" style={{ color: C.textDark }}>
              {data.ceremony.place}
            </p>
            <SansText className="text-sm font-semibold uppercase tracking-wider mb-6">
              {data.ceremony.city}
            </SansText>

            <div className="flex items-center justify-center gap-4">
              <div className="px-6 py-2.5 rounded-xl border border-stone-300 font-sans text-sm tracking-wider" style={{ background: C.cardBg }}>
                {data.ceremony.time}
              </div>
              <FilledBtn href={data.ceremony.maps}>Ubicación</FilledBtn>
            </div>
          </Reveal>
        </section>

        {/* ════════ 5. TARJETA DRESS CODE ════════ */}
        <section className="px-6 py-12">
          <Reveal className="mx-auto max-w-xl">
            <div
              className="p-8 sm:p-10 rounded-2xl text-center shadow-lg border flex flex-col items-center"
              style={{ background: C.cardBg, borderColor: C.borderCard }}
            >
              <HeadingText className="text-xl mb-4">{data.dressCode.title ?? 'DRESS CODE'}</HeadingText>

              {/* Icono Traje / Vestido */}
              <div className="mb-4">
                <EventIcon name="dress" stroke={C.primary} className="w-12 h-12" />
              </div>

              <SansText className="text-base font-bold tracking-wider uppercase mb-6" style={{ color: C.primary }}>
                {data.dressCode.style}
              </SansText>

              <div className="space-y-4 max-w-md text-sm leading-relaxed text-stone-700">
                <p>{data.dressCode.women}</p>
                <p>{data.dressCode.men}</p>
                <p className="italic text-xs text-stone-500 pt-2 border-t border-stone-200">{data.dressCode.note}</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ════════ 6. FOTOGRAFÍA MIDDLE A PANTALLA COMPLETA ════════ */}
        <section className="relative w-full h-[70vh] sm:h-[85vh] my-12 overflow-hidden">
          {data.middleImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.middleImage} alt="Pareja en la playa" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-stone-300 flex items-center justify-center text-stone-500 font-serif">
              Foto Pareja Central
            </div>
          )}
          <Seam shape="arch" from={C.bg} hairline={C.gold} height="clamp(48px,10vw,96px)" />
          <Seam edge="bottom" shape="arch" from={C.bg} hairline={C.gold} height="clamp(48px,10vw,96px)" />
        </section>

        {/* ════════ 7. ITINERARIO PASO A PASO HORIZONTAL ════════ */}
        <section className={`px-6 ${SECTION.base} text-center`}>
          <Reveal className="mx-auto max-w-4xl">
            <HeadingText className="text-2xl mb-12">{data.itineraryTitle ?? 'ITINERARIO'}</HeadingText>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-6 items-start">
              {data.itinerary.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center text-center group">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-md transition-transform group-hover:scale-110"
                    style={{ background: C.cardBg, border: `1px solid ${C.borderCard}` }}
                  >
                    <EventIcon name={step.icon} stroke={C.primary} className="w-7 h-7" />
                  </div>
                  <SansText className="text-xs font-semibold leading-tight mb-1" style={{ color: C.textDark }}>
                    {step.label}
                  </SansText>
                  <SansText className="text-[11px] text-stone-500">{step.time}</SansText>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ════════ 8. TARJETA FRASE / RELOJ DE ARENA ════════ */}
        {data.quoteMessage && (
          <section className="px-6 py-8">
            <Reveal className="mx-auto max-w-lg">
              <div
                className="p-8 rounded-2xl text-center shadow-md border flex flex-col items-center"
                style={{ background: C.cardBg, borderColor: C.borderCard }}
              >
                <div className="mb-3 text-2xl">⏳</div>
                <SansText className="text-sm sm:text-base italic leading-relaxed" style={{ color: C.textDark }}>
                  &ldquo;{data.quoteMessage}&rdquo;
                </SansText>
              </div>
            </Reveal>
          </section>
        )}

        {/* ════════ 9. MESA DE REGALOS & DATOS BANCARIOS ════════ */}
        <section className={`px-6 ${SECTION.base} text-center`}>
          <Reveal className="mx-auto max-w-xl">
            <div className="mb-3">
              <EventIcon name="gift" stroke={C.primary} className="w-9 h-9" />
            </div>
            <HeadingText className="text-2xl mb-4">MESA DE REGALOS</HeadingText>

            <SansText className="text-sm leading-relaxed mb-6 max-w-md mx-auto">{data.giftMessage}</SansText>

            {data.giftCash && (
              <div
                className="p-6 rounded-2xl mb-6 shadow-sm border text-center"
                style={{ background: C.cardBg, borderColor: C.borderCard }}
              >
                <SansText className="text-sm font-semibold" style={{ color: C.primary }}>
                  💌 {data.giftCash}
                </SansText>
              </div>
            )}

            {data.giftBank && (
              <div
                className="p-6 rounded-2xl shadow-sm border text-center space-y-2"
                style={{ background: C.cardBg, borderColor: C.borderCard }}
              >
                <SansText className="text-xs uppercase font-bold tracking-wider" style={{ color: C.primary }}>
                  {data.giftBank.bank}
                </SansText>
                <p className="font-mono text-base font-semibold tracking-wider">{data.giftBank.account}</p>
                {data.giftBank.holder && <SansText className="text-xs">Titular: {data.giftBank.holder}</SansText>}
              </div>
            )}

            {data.giftQrUrl && (
              <div className="mt-6 flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.giftQrUrl} alt="QR Regalo" className="w-40 h-40 rounded-xl shadow-md border" />
              </div>
            )}
          </Reveal>
        </section>

        {/* ════════ 10. GALERÍA DE FOTOS ════════ */}
        {data.galleryImages && data.galleryImages.length > 0 && (
          <section className={`px-6 ${SECTION.base}`}>
            <Reveal className="mx-auto max-w-4xl text-center">
              <HeadingText className="text-2xl mb-6">GALERÍA DE RECUERDOS</HeadingText>
              {data.galleryMsg && <SansText className="text-sm max-w-md mx-auto mb-8">{data.galleryMsg}</SansText>}
              <MasonryGallery images={data.galleryImages} captions={data.galleryCaptions} />
            </Reveal>
          </section>
        )}

        {/* ════════ 11. CONFIRMACIÓN RSVP Y PIE DE PÁGINA ════════ */}
        <section className={`px-6 py-20 text-center relative z-10`}>
          <Reveal className="mx-auto max-w-md">
            <HeadingText className="text-2xl mb-4">CONFIRMAR ASISTENCIA</HeadingText>
            <SansText className="text-sm leading-relaxed mb-6 max-w-sm mx-auto">{data.rsvpMessage}</SansText>
            <FilledBtn href={data.whatsapp}>Confirmar Asistencia</FilledBtn>
          </Reveal>

          <footer className="mt-16 text-center border-t pt-8 text-xs text-stone-400 font-sans">
            <p>Con amor, {data.groom} &amp; {data.bride}</p>
            <p className="mt-2 text-[10px] tracking-widest uppercase">
              Diseño exclusivo <a href="/" className="underline hover:text-stone-600">Enkarta</a>
            </p>
            <BrandByline tone="inherit" className="mt-1 justify-center" />
          </footer>
        </section>
      </div>
    </ThemeCtx.Provider>
  );
}
