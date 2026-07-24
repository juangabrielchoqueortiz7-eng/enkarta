'use client';

import { useCallback, useEffect, useRef, useState, useContext, createContext } from 'react';
import { useReducedMotion } from 'framer-motion';
import { DolceVitaContent, TemplateTheme } from './types';
import {
  useCountdown, Odometer, Reveal, EventIcon, FadeImg, useLightbox,
  CalIcon, SECTION, TYPE, ENKARTA_WA_URL,
} from './shared';

// ── Paleta por defecto (olivo de campo + crema tostada) ──────────────────────
const DEFAULT_C = {
  paper: '#fbf6ee',     // fondo principal
  cream: '#f7ebdf',     // bandas cálidas
  olive: '#68693f',     // títulos, iconos, acento
  oliveSoft: '#7a7c57', // trazos finos, subtítulos
  ink: '#544e39',       // cuerpo
  soft: '#8a8267',      // secundario
  line: '#c3b391',      // hairlines
  onOlive: '#fbf6ee',   // texto sobre olivo
};
type PVPalette = typeof DEFAULT_C;

const ThemeCtx = createContext<PVPalette>(DEFAULT_C);
const useC = () => useContext(ThemeCtx);

export function resolveProvenzaTheme(t?: TemplateTheme): PVPalette {
  return {
    paper: t?.bg || DEFAULT_C.paper,
    cream: DEFAULT_C.cream,
    olive: t?.primary || DEFAULT_C.olive,
    oliveSoft: t?.primaryDeep || DEFAULT_C.oliveSoft,
    ink: t?.text || DEFAULT_C.ink,
    soft: t?.muted || DEFAULT_C.soft,
    line: t?.line || DEFAULT_C.line,
    onOlive: t?.onPrimary || DEFAULT_C.onOlive,
  };
}

const F = {
  caps: "'Cinzel', serif",
  script: "'Great Vibes', cursive",
  serif: "'Cormorant Garamond', serif",
  display: "'Playfair Display', serif",
};

// ── Primitivas de texto ───────────────────────────────────────────────────────
function Caps({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return (
    <h3 className={className} style={{ fontFamily: F.caps, letterSpacing: '0.18em', textTransform: 'uppercase', lineHeight: 1.5, fontWeight: 500, color: C.olive, fontSize: TYPE.caption, ...style }}>
      {children}
    </h3>
  );
}

function Body({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return (
    <p className={className} style={{ fontFamily: F.serif, fontSize: TYPE.body, lineHeight: 1.65, color: C.ink, ...style }}>
      {children}
    </p>
  );
}

function Script({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return <p className={className} style={{ fontFamily: F.script, color: C.olive, lineHeight: 1.1, ...style }}>{children}</p>;
}

// Botón relleno (acciones principales: ubicación, confirmar, regalos).
function SolidBtn({ children, href }: { children: React.ReactNode; href: string }) {
  const C = useC();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-2xl px-7 py-3 text-[11px] uppercase tracking-[0.16em] transition-all duration-300 hover:brightness-110"
      style={{ background: C.olive, color: C.onOlive, fontFamily: F.caps }}>
      {children}
    </a>
  );
}

// Botón contorneado (acciones secundarias: agendar, hora).
function GhostBtn({ children, href }: { children: React.ReactNode; href?: string }) {
  const C = useC();
  const cls = 'inline-flex items-center gap-2 rounded-2xl px-7 py-3 text-[11px] uppercase tracking-[0.16em] transition-colors duration-300';
  const style = { border: `1px solid ${C.line}`, color: C.olive, background: 'transparent', fontFamily: F.caps } as const;
  if (!href) return <span className={cls} style={style}>{children}</span>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} hover:bg-black/[0.03]`} style={style}>{children}</a>;
}

// Título de sección con filete a los lados.
function SectionTitle({ children }: { children: React.ReactNode }) {
  const C = useC();
  return (
    <div className="mx-auto flex max-w-md items-center justify-center gap-4">
      <span className="h-px flex-1" style={{ background: C.line }} />
      <Caps style={{ fontSize: 'clamp(13px,2.2vw,16px)', whiteSpace: 'nowrap' }}>{children}</Caps>
      <span className="h-px flex-1" style={{ background: C.line }} />
    </div>
  );
}

// ── Luciérnagas: destellos suaves que flotan sobre toda la invitación ─────────
function Fireflies({ color, count = 16 }: { color: string; count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const flies = Array.from({ length: count }, (_, i) => ({
    left: `${(i * 61 + (i % 5) * 7) % 98}%`,
    top: `${(i * 37 + (i % 7) * 9) % 96}%`,
    size: 5 + (i % 4) * 4,
    dx: `${(i % 2 ? 1 : -1) * (30 + (i * 13) % 70)}px`,
    dy: `${(i % 3 ? -1 : 1) * (40 + (i * 17) % 80)}px`,
    dur: `${7 + (i % 6) * 1.6}s`,
    delay: `${(i * 0.9) % 7}s`,
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-[6] overflow-hidden" aria-hidden>
      <style>{`@keyframes pvGlow {
        0%   { transform: translate(0,0) scale(1);    opacity: 0; }
        25%  { opacity: .75; }
        75%  { opacity: .5; }
        100% { transform: translate(var(--dx), var(--dy)) scale(.6); opacity: 0; }
      }`}</style>
      {flies.map((f, i) => (
        <span key={i} style={{
          position: 'absolute', left: f.left, top: f.top, width: f.size, height: f.size, borderRadius: '50%',
          background: `radial-gradient(circle, ${color} 0%, ${color}66 45%, transparent 70%)`,
          ['--dx' as string]: f.dx, ['--dy' as string]: f.dy,
          animation: `pvGlow ${f.dur} ease-in-out ${f.delay} infinite`, opacity: 0,
        }} />
      ))}
    </div>
  );
}

// ── Banda de fotos a sangre completa, difuminada arriba y abajo ───────────────
// Reproduce el "respiro" fotográfico entre secciones: las imágenes se turnan
// con ken burns y los bordes se funden con el papel mediante una máscara.
function PhotoBand({ images, height = '75vh' }: { images: string[]; height?: string }) {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (images.length < 2) return;
    const id = setInterval(() => setI(n => (n + 1) % images.length), 4200);
    return () => clearInterval(id);
  }, [images.length]);
  if (!images.length) return null;
  const mask = 'linear-gradient(to bottom, transparent 0%, #000 18%, #000 82%, transparent 100%)';
  return (
    <div className="relative w-full overflow-hidden" style={{ height, WebkitMaskImage: mask, maskImage: mask }} aria-hidden>
      {images.map((src, n) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${src}-${n}`}
          src={src}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${reduce ? '' : 'ek-kenburns'}`}
          style={{ opacity: n === i ? 1 : 0, transition: 'opacity 1.2s ease' }}
        />
      ))}
    </div>
  );
}

// ── Galería en 3 columnas con parallax ────────────────────────────────────────
// Las columnas laterales se desplazan a distinta velocidad al hacer scroll; la
// central queda fija. Cada foto abre el visor compartido.
function ParallaxGallery({ images }: { images: string[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const cols = useRef<Array<HTMLDivElement | null>>([]);
  const reduce = useReducedMotion();
  const lb = useLightbox(images);

  const update = useCallback(() => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // -1 (sección entrando por abajo) → 1 (saliendo por arriba)
    const p = (window.innerHeight / 2 - (r.top + r.height / 2)) / (window.innerHeight / 2 + r.height / 2);
    const shift = [1, -0.45, 1.55];
    cols.current.forEach((c, i) => {
      if (c) c.style.transform = `translate3d(0, ${(p * 46 * shift[i]).toFixed(1)}px, 0)`;
    });
  }, []);

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, [update, reduce]);

  if (!images.length) return null;
  const buckets: string[][] = [[], [], []];
  images.forEach((src, i) => buckets[i % 3].push(src));

  return (
    <>
      {/* `overflow-hidden` + respiro vertical: el desplazamiento del parallax se
          queda dentro de la sección y no invade el título ni la banda siguiente. */}
      <div ref={wrap} className="mx-auto grid max-w-3xl grid-cols-3 gap-2 overflow-hidden py-10 sm:gap-3">
        {buckets.map((bucket, c) => (
          <div
            key={c}
            ref={el => { cols.current[c] = el; }}
            className="flex flex-col gap-2 sm:gap-3"
            style={{ willChange: 'transform' }}
          >
            {bucket.map((src, i) => (
              <div
                key={`${src}-${i}`}
                onClick={() => lb.openAt(images.indexOf(src))}
                className="group relative overflow-hidden rounded-xl bg-black/5"
                style={{ aspectRatio: (c + i) % 2 === 0 ? '3 / 4' : '1 / 1', cursor: 'zoom-in' }}
              >
                <FadeImg src={src} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
            ))}
          </div>
        ))}
      </div>
      {lb.node}
    </>
  );
}

// Icono "sin niños" (misma familia de trazo que el resto de las plantillas).
function BabyNo({ color, className = '' }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="26" /><path d="M14 14 50 50" />
      <circle cx="28" cy="26" r="3" /><path d="M22 34c0 5 4 9 9 9 3 0 5-1 7-3M24 40l-5 6M36 42l4 5" />
    </svg>
  );
}

export default function Provenza({ data }: { data: DolceVitaContent }) {
  const { days, hours, mins, secs } = useCountdown(data.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const C = resolveProvenzaTheme(data.theme);

  useEffect(() => {
    document.body.style.background = C.paper;
    return () => { document.body.style.background = ''; };
  }, [C.paper]);

  const toggleMusic = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); } else a.play().then(() => setPlaying(true)).catch(() => {});
  };

  const gcal = (() => {
    const s = data.isoDate.replace(/[-:]/g, '').slice(0, 15) + 'Z';
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Boda ${data.groom} & ${data.bride}`)}&dates=${s}/${s}`;
  })();

  const cd = [{ v: days, l: 'Días' }, { v: hours, l: 'Hrs' }, { v: mins, l: 'Mins' }, { v: secs, l: 'Segs' }];
  const gallery = data.galleryImages ?? [];
  const band = gallery.length ? gallery : data.coverImage ? [data.coverImage] : [];
  // "2 pases" → "2" para el círculo; si no hay número, se muestra el texto tal cual.
  const passNumber = data.guestPasses?.match(/\d+/)?.[0] ?? data.guestPasses;

  const ceremonies = [
    { icon: 'church', title: 'Ceremonia religiosa', c: data.ceremonyReligious, sec: 'ceremony' },
    ...(data.ceremonyCivil ? [{ icon: 'rings', title: 'Ceremonia civil', c: data.ceremonyCivil, sec: 'reception' }] : []),
    ...(data.reception ? [{ icon: 'cheers', title: 'Recepción', c: data.reception, sec: 'reception' }] : []),
  ];

  const parentCols = [
    { t: 'Padres de la novia', p: data.parentsBride },
    { t: 'Padres del novio', p: data.parentsGroom },
    ...(data.padrinos?.length ? [{ t: 'Padrinos', p: data.padrinos }] : []),
  ].filter(col => col.p?.length);

  return (
    <ThemeCtx.Provider value={C}>
      <div className="relative w-full overflow-x-hidden" style={{ background: C.paper, color: C.ink, fontFamily: F.serif }}>
        <style>{`
          @keyframes pvSpin { to { transform: rotate(360deg) } }
          @keyframes pvRise { from { opacity: 0; transform: translateY(22px) } to { opacity: 1; transform: translateY(0) } }
          @keyframes pvNudge { 0%,100% { transform: translateY(0) } 50% { transform: translateY(7px) } }
          @media (prefers-reduced-motion: reduce) { .pv-anim { animation: none !important } }
        `}</style>

        {data.decor?.floating?.on !== false && <Fireflies color={data.decor?.floating?.color || C.line} />}

        {data.musicUrl && <audio ref={audioRef} src={data.musicUrl} loop />}
        {data.musicUrl && (
          <button
            onClick={toggleMusic}
            className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
            style={{ background: C.paper, color: C.olive, border: `1px solid ${C.line}` }}
            aria-label={playing ? 'Pausar música' : 'Reproducir música'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="pv-anim" style={{ animation: playing ? 'pvSpin 4s linear infinite' : 'none' }}>
              <path d="M9 17a3 3 0 11-2-2.83V5l11-2v10.17A3 3 0 1116 14V7L9 8.4V17z" />
            </svg>
          </button>
        )}

        {/* ═══════════ PORTADA: foto a pantalla completa + nombres ═══════════ */}
        <section className="relative flex min-h-[100svh] flex-col items-center justify-end overflow-hidden">
          {data.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover ek-kenburns pv-anim" />
          )}
          {/* Degradado que funde la foto con el papel */}
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, transparent 32%, ${C.paper} 100%)` }} />
          <div className="relative z-10 px-6 pb-16 text-center pv-anim" style={{ animation: 'pvRise 1.2s ease' }}>
            <p style={{ fontFamily: F.script, fontSize: TYPE.display, color: C.ink, lineHeight: 0.9, textShadow: '0 2px 18px rgba(0,0,0,0.18)' }}>{data.bride}</p>
            <p className="my-1" style={{ fontFamily: F.display, fontSize: 'clamp(22px,5vw,34px)', color: C.ink, opacity: 0.85 }}>&amp;</p>
            <p style={{ fontFamily: F.script, fontSize: TYPE.display, color: C.ink, lineHeight: 0.9, textShadow: '0 2px 18px rgba(0,0,0,0.18)' }}>{data.groom}</p>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.olive} strokeWidth="1.3" className="mx-auto mt-8 pv-anim" style={{ animation: 'pvNudge 1.9s ease-in-out infinite' }} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </section>

        {/* ═══════════ EL HONOR + INVITADO ═══════════ */}
        <section className={`px-6 ${SECTION.base} text-center`}>
          <Reveal className="mx-auto max-w-xl">
            <EventIcon name="couple" className="mx-auto mb-4 h-16 w-16" stroke={C.olive} custom={data} sec="couple" />
            <Caps style={{ fontSize: 'clamp(13px,2.2vw,16px)' }}>Tenemos el honor<br />de invitarte a nuestra boda</Caps>
          </Reveal>

          <Reveal delay={90} className="mx-auto mt-9 max-w-xl rounded-3xl px-7 py-9" style={{ background: C.cream }}>
            <Body style={{ color: C.ink }}>{data.introMessage}</Body>

            {data.guestName && (
              <p className="mt-7" style={{ fontFamily: F.caps, fontSize: 'clamp(17px,3.4vw,23px)', letterSpacing: '0.06em', color: C.olive }}>
                {data.guestName}
              </p>
            )}

            {passNumber && (
              <div className="mt-6 flex flex-col items-center">
                <Body style={{ color: C.soft }}>Hemos reservado</Body>
                <div className="my-2 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: C.paper, border: `1px solid ${C.line}` }}>
                  <span style={{ fontFamily: F.display, fontSize: 30, fontWeight: 700, lineHeight: 1, color: C.olive }}>{passNumber}</span>
                </div>
                <Body style={{ color: C.soft }}>{passNumber === '1' ? 'lugar para ti' : 'lugares para ti'}</Body>
              </div>
            )}
          </Reveal>
        </section>

        {/* ═══════════ FECHA + CUENTA REGRESIVA ═══════════ */}
        <section className={`px-6 ${SECTION.tight} text-center`}>
          <Reveal className="mx-auto max-w-2xl">
            <Caps style={{ color: C.soft }}>Queremos que nos acompañes</Caps>

            <div className="mt-6 flex items-center justify-center gap-3 sm:gap-5">
              <div className="flex flex-1 flex-col items-center gap-2" style={{ maxWidth: 130 }}>
                <span className="h-px w-full" style={{ background: C.line }} />
                <Caps style={{ fontSize: 'clamp(11px,2vw,13px)', color: C.oliveSoft }}>{data.dateWeekday}</Caps>
                <span className="h-px w-full" style={{ background: C.line }} />
              </div>

              <div className="flex flex-col items-center justify-center rounded-full px-5 py-4" style={{ border: `1.5px solid ${C.oliveSoft}`, minWidth: 118 }}>
                <span style={{ fontFamily: F.caps, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.oliveSoft }}>{data.dateCity}</span>
                <span style={{ fontFamily: F.display, fontSize: 'clamp(46px,11vw,68px)', fontWeight: 400, lineHeight: 1.05, color: C.oliveSoft }}>{data.dateDay}</span>
                <span style={{ fontFamily: F.caps, fontSize: 12, letterSpacing: '0.12em', color: C.oliveSoft }}>{data.dateYear}</span>
              </div>

              <div className="flex flex-1 flex-col items-center gap-2" style={{ maxWidth: 130 }}>
                <span className="h-px w-full" style={{ background: C.line }} />
                <Caps style={{ fontSize: 'clamp(11px,2vw,13px)', color: C.oliveSoft }}>{data.dateMonth}</Caps>
                <span className="h-px w-full" style={{ background: C.line }} />
              </div>
            </div>

            <Caps className="mt-10" style={{ color: C.soft }}>Faltan</Caps>
            <div className="mx-auto mt-3 flex max-w-sm justify-center gap-2 rounded-2xl px-4 py-5" style={{ border: `1.5px solid ${C.line}` }}>
              {cd.map(c => (
                <div key={c.l} className="flex-1">
                  <p style={{ fontFamily: F.display, fontSize: TYPE.number, lineHeight: 1.1, color: C.olive }}><Odometer value={c.v} /></p>
                  <p style={{ fontFamily: F.serif, fontSize: 12, color: C.soft }}>{c.l}</p>
                </div>
              ))}
            </div>

            <div className="mt-6"><GhostBtn href={gcal}><CalIcon />Agendar el evento</GhostBtn></div>
          </Reveal>
        </section>

        {/* ═══════════ BENDICIÓN + PADRES / PADRINOS ═══════════ */}
        {(data.blessing || parentCols.length > 0) && (
          <section className={`px-6 ${SECTION.tight} text-center`}>
            <Reveal className="mx-auto max-w-3xl rounded-3xl px-6 py-10" style={{ background: C.cream }}>
              {data.blessing && <Caps style={{ fontSize: 'clamp(12px,2vw,15px)' }}>{data.blessing}</Caps>}
              {parentCols.length > 0 && (
                <div className={`mt-8 grid gap-8 ${parentCols.length > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                  {parentCols.map(col => (
                    <div key={col.t}>
                      <Caps style={{ fontSize: 12, color: C.oliveSoft }}>{col.t}</Caps>
                      <div className="mt-2 space-y-1">
                        {col.p.map((n, i) => <Body key={i}>{n}</Body>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Reveal>
          </section>
        )}

        {/* ═══════════ CEREMONIA Y RECEPCIÓN ═══════════ */}
        <section className={`px-6 ${SECTION.tight}`}>
          <Reveal className="mx-auto max-w-3xl">
            <SectionTitle>Ceremonia y recepción</SectionTitle>
            <div className={`mt-10 grid gap-10 ${ceremonies.length > 1 ? 'sm:grid-cols-2' : ''}`}>
              {ceremonies.map((b, i) => (
                <Reveal key={b.title} delay={i * 90} className="flex flex-col items-center text-center">
                  <EventIcon name={b.icon} className="mb-3 h-14 w-14" stroke={C.olive} custom={data} sec={b.sec} />
                  <Caps style={{ fontSize: 13 }}>{b.title}</Caps>
                  <Body className="mt-2" style={{ fontWeight: 600 }}>{b.c.place}</Body>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    {b.c.time && <GhostBtn>{b.c.time}</GhostBtn>}
                    {b.c.maps && <SolidBtn href={b.c.maps}>Ubicación</SolidBtn>}
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ═══════════ DRESS CODE ═══════════ */}
        <section className={`px-6 ${SECTION.tight} text-center`}>
          <Reveal className="mx-auto max-w-xl rounded-3xl px-7 py-10" style={{ background: C.cream }}>
            <EventIcon name="dress" className="mx-auto mb-3 h-16 w-16" stroke={C.olive} custom={data} sec="dress" />
            <Caps style={{ fontSize: 13 }}>Dress code</Caps>
            <Body className="mt-3">{data.dressCode}</Body>
          </Reveal>
        </section>

        {/* ═══════════ RESPIRO FOTOGRÁFICO ═══════════ */}
        <PhotoBand images={band} />

        {/* ═══════════ ITINERARIO (serpentina) ═══════════ */}
        {data.itinerary.length > 0 && (
          <section className={`px-6 ${SECTION.tight}`}>
            <Reveal className="mx-auto max-w-lg">
              <SectionTitle>Itinerario</SectionTitle>
            </Reveal>

            <div className="mx-auto mt-8 max-w-lg">
              {data.itinerary.map((it, i) => {
                const left = i % 2 === 0; // alterna el lado del icono
                return (
                  <Reveal key={i} delay={i * 70} className="grid grid-cols-2 items-stretch">
                    {/* Icono */}
                    <div className={`flex min-h-[104px] items-center ${left ? 'justify-end pr-5' : 'order-2 justify-start pl-5'}`}>
                      <EventIcon
                        name={it.icon ?? 'rings'}
                        className="h-14 w-14"
                        stroke={C.olive}
                        custom={data}
                        lottieColors={it.iconColors}
                        speed={it.iconSpeed}
                      />
                    </div>
                    {/* Texto con el borde curvo que hilvana los pasos */}
                    <div
                      className={`flex min-h-[104px] flex-col justify-center ${left ? 'items-start pl-5 text-left' : 'order-1 items-end pr-5 text-right'}`}
                      style={{
                        borderTop: `1px solid ${C.line}`,
                        [left ? 'borderLeft' : 'borderRight']: `1px solid ${C.line}`,
                        [left ? 'borderTopLeftRadius' : 'borderTopRightRadius']: '40px',
                      }}
                    >
                      <Body style={{ fontWeight: 600, color: C.ink }}>{it.label}</Body>
                      <Body style={{ color: C.oliveSoft }}>{it.time}</Body>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal className="mx-auto mt-12 max-w-xl rounded-3xl px-7 py-9 text-center" style={{ background: C.cream }}>
              <EventIcon name="calendar" className="mx-auto mb-3 h-12 w-12" stroke={C.olive} custom={data} sec="punctual" />
              <Body>¡La vida está llena de momentos que no se pueden recuperar! Llega puntual y comparte este momento especial con nosotros.</Body>
            </Reveal>
          </section>
        )}

        {/* ═══════════ SUGERENCIA DE REGALO ═══════════ */}
        <section className={`px-6 ${SECTION.tight} text-center`}>
          <Reveal className="mx-auto max-w-2xl">
            <EventIcon name="gift" className="mx-auto mb-3 h-16 w-16" stroke={C.olive} custom={data} sec="gift" />
            <SectionTitle>Sugerencia de regalo</SectionTitle>
            <Body className="mx-auto mt-4 max-w-xl">{data.giftMessage}</Body>

            <div className="mx-auto mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
              {data.giftBank && (
                <div className="rounded-3xl px-5 py-7" style={{ background: C.cream }}>
                  <Caps style={{ fontSize: 12 }}>{data.giftBank.bank}</Caps>
                  <Body className="mt-2">{data.giftBank.account}</Body>
                  <Body style={{ color: C.soft }}>{data.giftBank.holder}</Body>
                </div>
              )}
              {data.giftQrUrl && (
                <div className="flex flex-col items-center rounded-3xl px-5 py-7" style={{ background: C.cream }}>
                  <Caps style={{ fontSize: 12 }}>Transferencia QR</Caps>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={data.giftQrUrl} alt="QR para transferencia" className="mt-3 h-32 w-32 rounded-xl bg-white p-2" />
                </div>
              )}
              {data.giftCash && (
                <div className="rounded-3xl px-5 py-7" style={{ background: C.cream }}>
                  <Caps style={{ fontSize: 12 }}>Efectivo</Caps>
                  <Body className="mt-2">{data.giftCash}</Body>
                </div>
              )}
              {data.giftOther && (
                <div className="rounded-3xl px-5 py-7" style={{ background: C.cream }}>
                  <Caps style={{ fontSize: 12 }}>Otros obsequios</Caps>
                  <Body className="mt-2">{data.giftOther}</Body>
                </div>
              )}
            </div>

            {data.giftThanks && <Caps className="mt-7" style={{ fontSize: 12, color: C.soft }}>{data.giftThanks}</Caps>}
          </Reveal>
        </section>

        {/* ═══════════ GALERÍA CON PARALLAX ═══════════ */}
        {gallery.length > 0 && (
          <section className={`px-6 ${SECTION.tight}`}>
            <Reveal className="mx-auto mb-8 max-w-lg">
              <SectionTitle>Nuestra historia</SectionTitle>
            </Reveal>
            <ParallaxGallery images={gallery} />
          </section>
        )}

        {/* ═══════════ SOLO ADULTOS + COMPARTIR FOTOS ═══════════ */}
        <section className={`px-6 ${SECTION.tight}`}>
          <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
            {data.noKids && (
              <Reveal className="flex flex-col items-center rounded-3xl px-6 py-9 text-center" style={{ background: C.cream }}>
                <BabyNo color={C.olive} className="mb-3 h-14 w-14" />
                <Caps style={{ fontSize: 13 }}>Dulces sueños</Caps>
                <Body className="mt-3">{data.noKids}</Body>
              </Reveal>
            )}
            <Reveal delay={90} className="flex flex-col items-center rounded-3xl px-6 py-9 text-center" style={{ background: C.cream }}>
              <EventIcon name="camera" className="mb-3 h-14 w-14" stroke={C.olive} custom={data} sec="gallery" />
              <Caps style={{ fontSize: 13 }}>Captura y comparte</Caps>
              <Body className="mt-3">{data.galleryMsg}</Body>
              {data.galleryUrl && data.galleryUrl !== '#' && (
                <div className="mt-5"><SolidBtn href={data.galleryUrl}>Compartir fotografías</SolidBtn></div>
              )}
            </Reveal>
          </div>
        </section>

        {/* ═══════════ CONFIRMACIÓN ═══════════ */}
        <section className={`px-6 ${SECTION.base} text-center`}>
          <Reveal className="mx-auto max-w-xl">
            <SectionTitle>Confirma tu asistencia</SectionTitle>
            <Body className="mx-auto mt-4 max-w-md">{data.rsvpClosing}</Body>
            {data.whatsapp && <div className="mt-6"><SolidBtn href={data.whatsapp}>Confirmar asistencia</SolidBtn></div>}
          </Reveal>
        </section>

        {/* ═══════════ CIERRE ═══════════ */}
        <section className={`px-6 ${SECTION.tight} text-center`}>
          <Reveal className="mx-auto max-w-xl">
            <EventIcon name="rings" className="mx-auto mb-3 h-14 w-14" stroke={C.olive} custom={data} sec="thanks" />
            <Caps style={{ fontSize: 13, color: C.soft }}>Esperamos contar con tu compañía</Caps>
            {data.thanksMessage && <Body className="mt-4">{data.thanksMessage}</Body>}
            <Script className="mt-6" style={{ fontSize: 'clamp(34px,8vw,50px)' }}>{data.bride} &amp; {data.groom}</Script>
          </Reveal>
        </section>

        {band.length > 0 && <PhotoBand images={band} height="46vh" />}

        <footer className="py-9 text-center" style={{ background: C.olive, color: C.onOlive }}>
          <p style={{ fontFamily: F.caps, fontSize: 20, letterSpacing: '0.22em' }}>ENKARTA</p>
          <p className="mt-1" style={{ fontFamily: F.serif, fontSize: 14, opacity: 0.85 }}>
            ¿Deseas una invitación para tu evento?{' '}
            <a href={ENKARTA_WA_URL} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Contáctanos
            </a>
          </p>
        </footer>
      </div>
    </ThemeCtx.Provider>
  );
}
