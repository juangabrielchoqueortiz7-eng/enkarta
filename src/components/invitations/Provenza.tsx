'use client';

import { useCallback, useEffect, useRef, useState, useContext, createContext } from 'react';
import { useReducedMotion } from 'framer-motion';
import { DolceVitaContent, TemplateTheme } from './types';
import {
  useCountdown, Reveal, EventIcon, FadeImg, useLightbox, CalIcon, ENKARTA_WA_URL,
} from './shared';

// ── Paleta ────────────────────────────────────────────────────────────────────
// Tomada de la referencia: fondo BLANCO con un tinte cálido apenas perceptible
// en las tarjetas. Nada de cremas saturados — el aire es parte del diseño.
const DEFAULT_C = {
  paper: '#ffffff',   // fondo de la página
  tint: '#fdf3e3',    // tarjetas (se usa translúcido)
  olive: '#68693f',   // títulos de sección
  oliveSoft: '#7a7c57', // bloque de fecha y sus filetes
  ink: '#544e39',     // cuerpo
  soft: '#888164',    // secundario, bordes de botón
  line: '#967f60',    // filetes del itinerario
  gold: '#c2a982',    // botón relleno
  onGold: '#ffffff',
};
type PVPalette = typeof DEFAULT_C;

const ThemeCtx = createContext<PVPalette>(DEFAULT_C);
const useC = () => useContext(ThemeCtx);

export function resolveProvenzaTheme(t?: TemplateTheme): PVPalette {
  return {
    paper: t?.bg || DEFAULT_C.paper,
    tint: DEFAULT_C.tint,
    olive: t?.primary || DEFAULT_C.olive,
    oliveSoft: t?.primaryDeep || DEFAULT_C.oliveSoft,
    ink: t?.text || DEFAULT_C.ink,
    soft: t?.muted || DEFAULT_C.soft,
    line: t?.line || DEFAULT_C.line,
    gold: DEFAULT_C.gold,
    onGold: t?.onPrimary || DEFAULT_C.onGold,
  };
}

// Tipografías de la referencia. `script` sustituye a "Ms Claudy" y "Nathalia",
// que son fuentes propias alojadas por el sitio original: usamos Allura, del
// mismo aire manuscrito, para no depender de archivos ajenos.
const F = {
  caps: "'Cinzel', serif",
  body: "'Poiret One', sans-serif",
  num: "'Cormorant Infant', serif",
  script: "'Allura', cursive",
  amp: "'Rozha One', serif",
};

// La columna es estrecha (500px): el aire lateral es parte del diseño.
const COL = 'mx-auto w-full max-w-[500px] px-6';

// ── Primitivas ────────────────────────────────────────────────────────────────
function Title({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return (
    <h3 className={className} style={{
      fontFamily: F.caps, fontWeight: 500, textTransform: 'uppercase',
      fontSize: 'clamp(14px,3.6vw,20px)', lineHeight: 1.2, letterSpacing: '0.04em',
      color: C.olive, textAlign: 'center', ...style,
    }}>{children}</h3>
  );
}

function Body({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return (
    <p className={className} style={{
      fontFamily: F.body, fontSize: 16, lineHeight: 1.5, color: C.ink, textAlign: 'center', ...style,
    }}>{children}</p>
  );
}

// Botón relleno (Ubicación, compartir fotos, confirmar).
function GoldBtn({ children, href }: { children: React.ReactNode; href: string }) {
  const C = useC();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 px-6 py-3 transition-opacity duration-300 hover:opacity-90"
      style={{ background: C.gold, color: C.onGold, fontFamily: F.body, fontSize: 16, lineHeight: 1.1, borderRadius: 4 }}>
      {children}
    </a>
  );
}

// Botón contorneado fino (la hora, agendar).
function LineBtn({ children, href, radius = 4 }: { children: React.ReactNode; href?: string; radius?: number }) {
  const C = useC();
  const cls = 'inline-flex items-center justify-center gap-2 px-6 py-3';
  const style: React.CSSProperties = {
    border: `1px solid ${C.soft}`, color: C.ink, background: 'transparent',
    fontFamily: F.body, fontSize: 16, lineHeight: 1.1, borderRadius: radius,
  };
  if (!href) return <span className={cls} style={style}>{children}</span>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} transition-colors duration-300 hover:bg-black/[0.03]`} style={style}>{children}</a>;
}

// Tarjeta de tinte cálido translúcido (como el #FDF3E366 del original).
function Tint({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return <div className={className} style={{ background: `${C.tint}99`, ...style }}>{children}</div>;
}

// ── Luciérnagas ───────────────────────────────────────────────────────────────
function Fireflies({ color, count = 14 }: { color: string; count?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  const flies = Array.from({ length: count }, (_, i) => ({
    left: `${(i * 61 + (i % 5) * 7) % 98}%`,
    top: `${(i * 37 + (i % 7) * 9) % 96}%`,
    size: 4 + (i % 4) * 3,
    dx: `${(i % 2 ? 1 : -1) * (30 + (i * 13) % 70)}px`,
    dy: `${(i % 3 ? -1 : 1) * (40 + (i * 17) % 80)}px`,
    dur: `${7 + (i % 6) * 1.6}s`,
    delay: `${(i * 0.9) % 7}s`,
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-[6] overflow-hidden" aria-hidden>
      <style>{`@keyframes pvGlow {
        0% { transform: translate(0,0) scale(1); opacity: 0 }
        25% { opacity: .6 } 75% { opacity: .4 }
        100% { transform: translate(var(--dx), var(--dy)) scale(.6); opacity: 0 }
      }`}</style>
      {flies.map((f, i) => (
        <span key={i} style={{
          position: 'absolute', left: f.left, top: f.top, width: f.size, height: f.size, borderRadius: '50%',
          background: `radial-gradient(circle, ${color} 0%, ${color}55 45%, transparent 70%)`,
          ['--dx' as string]: f.dx, ['--dy' as string]: f.dy,
          animation: `pvGlow ${f.dur} ease-in-out ${f.delay} infinite`, opacity: 0,
        }} />
      ))}
    </div>
  );
}

// ── Banda de fotos a sangre, difuminada arriba y abajo ────────────────────────
function PhotoBand({ images, height = '72vh' }: { images: string[]; height?: string }) {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (images.length < 2) return;
    const id = setInterval(() => setI(n => (n + 1) % images.length), 4200);
    return () => clearInterval(id);
  }, [images.length]);
  if (!images.length) return null;
  const mask = 'linear-gradient(to bottom, transparent 0%, #000 20%, #000 80%, transparent 100%)';
  return (
    <div className="relative w-full overflow-hidden" style={{ height, WebkitMaskImage: mask, maskImage: mask }} aria-hidden>
      {images.map((src, n) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`${src}-${n}`} src={src} alt=""
          className={`absolute inset-0 h-full w-full object-cover ${reduce ? '' : 'ek-kenburns'}`}
          style={{ opacity: n === i ? 1 : 0, transition: 'opacity 1.2s ease' }} />
      ))}
    </div>
  );
}

// ── Galería de 3 columnas con parallax ────────────────────────────────────────
function ParallaxGallery({ images }: { images: string[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const cols = useRef<Array<HTMLDivElement | null>>([]);
  const reduce = useReducedMotion();
  const lb = useLightbox(images);

  const update = useCallback(() => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = (window.innerHeight / 2 - (r.top + r.height / 2)) / (window.innerHeight / 2 + r.height / 2);
    const shift = [1, -0.45, 1.55];
    cols.current.forEach((c, i) => {
      if (c) c.style.transform = `translate3d(0, ${(p * 44 * shift[i]).toFixed(1)}px, 0)`;
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
      <div ref={wrap} className="mx-auto grid max-w-[560px] grid-cols-3 gap-2 overflow-hidden px-3 py-10">
        {buckets.map((bucket, c) => (
          <div key={c} ref={el => { cols.current[c] = el; }} className="flex flex-col gap-2" style={{ willChange: 'transform' }}>
            {bucket.map((src, i) => (
              <div key={`${src}-${i}`} onClick={() => lb.openAt(images.indexOf(src))}
                className="group relative overflow-hidden bg-black/5"
                style={{ aspectRatio: (c + i) % 2 === 0 ? '3 / 4' : '1 / 1', borderRadius: 7, cursor: 'zoom-in' }}>
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

function BabyNo({ color, className = '' }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
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
  const passNumber = data.guestPasses?.match(/\d+/)?.[0] ?? data.guestPasses;

  const ceremonies = [
    { icon: 'church', title: 'Ceremonia religiosa', c: data.ceremonyReligious, sec: 'ceremony' },
    ...(data.ceremonyCivil ? [{ icon: 'rings', title: 'Ceremonia civil', c: data.ceremonyCivil, sec: 'reception' }] : []),
    ...(data.reception ? [{ icon: 'cheers', title: 'Recepción', c: data.reception, sec: 'reception' }] : []),
  ];

  const parentCols = [
    { t: 'Madre de la novia', p: data.parentsBride },
    { t: 'Madre del novio', p: data.parentsGroom },
    ...(data.padrinos?.length ? [{ t: 'Padrinos', p: data.padrinos }] : []),
  ].filter(col => col.p?.length);

  return (
    <ThemeCtx.Provider value={C}>
      <div className="relative w-full overflow-x-hidden" style={{ background: C.paper, color: C.ink, fontFamily: F.body }}>
        <style>{`
          @keyframes pvSpin { to { transform: rotate(360deg) } }
          @keyframes pvRise { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
          @keyframes pvNudge { 0%,100% { transform: translateY(0) } 50% { transform: translateY(7px) } }
          @media (prefers-reduced-motion: reduce) { .pv-anim { animation: none !important } }
        `}</style>

        {data.decor?.floating?.on !== false && <Fireflies color={data.decor?.floating?.color || C.gold} />}

        {data.musicUrl && <audio ref={audioRef} src={data.musicUrl} loop />}
        {data.musicUrl && (
          <button onClick={toggleMusic}
            className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-md transition-transform hover:scale-110"
            style={{ background: C.paper, color: C.olive, border: `1px solid ${C.soft}` }}
            aria-label={playing ? 'Pausar música' : 'Reproducir música'}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" className="pv-anim" style={{ animation: playing ? 'pvSpin 4s linear infinite' : 'none' }}>
              <path d="M9 17a3 3 0 11-2-2.83V5l11-2v10.17A3 3 0 1116 14V7L9 8.4V17z" />
            </svg>
          </button>
        )}

        {/* ═══ PORTADA: foto a pantalla completa, nombres abajo ═══ */}
        <section className="relative flex min-h-[100svh] flex-col items-center justify-end overflow-hidden">
          {data.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover ek-kenburns pv-anim" />
          )}
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(255,255,255,0) 34%, ${C.paper} 100%)` }} />
          <div className="relative z-10 px-6 pb-14 text-center pv-anim" style={{ animation: 'pvRise 1.2s ease' }}>
            <p style={{ fontFamily: F.script, fontSize: 'clamp(84px,26vw,120px)', lineHeight: 0.52, color: '#000', textShadow: '0 0 24px rgba(0,0,0,0.30)' }}>{data.bride}</p>
            <p style={{ fontFamily: F.amp, fontSize: 'clamp(22px,6vw,32px)', lineHeight: 2.1, color: '#000', textShadow: '0 0 24px rgba(0,0,0,0.30)' }}>&amp;</p>
            <p style={{ fontFamily: F.script, fontSize: 'clamp(84px,26vw,120px)', lineHeight: 0.72, color: '#000', textShadow: '0 0 24px rgba(0,0,0,0.30)' }}>{data.groom}</p>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.olive} strokeWidth="1.2" className="mx-auto mt-9 pv-anim" style={{ animation: 'pvNudge 1.9s ease-in-out infinite' }} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </section>

        {/* ═══ EL HONOR ═══ */}
        <section className={`${COL} pt-14 pb-8`}>
          <Reveal className="flex flex-col items-center gap-3">
            <EventIcon name="couple" className="h-16 w-16" stroke={C.olive} custom={data} sec="couple" />
            <Title>Tenemos el honor<br />de invitarte a nuestra boda</Title>
          </Reveal>
        </section>

        {/* ═══ INVITADO ═══ */}
        <Reveal>
          <Tint className="px-6 py-12">
            <div className="mx-auto w-full max-w-[500px]">
              <Body>{data.introMessage}</Body>

              {data.guestName && (
                <p className="mt-7" style={{ fontFamily: F.caps, fontSize: 'clamp(18px,4.4vw,24px)', textTransform: 'uppercase', letterSpacing: '0.03em', color: C.ink, textAlign: 'center' }}>
                  {data.guestName}
                </p>
              )}

              {passNumber && (
                <div className="mt-6 flex flex-col items-center gap-1">
                  <EventIcon name="cheers" className="h-11 w-11" stroke={C.olive} custom={data} sec="passes" />
                  <Body>hemos reservado</Body>
                  <div className="my-1 flex h-[50px] w-[50px] items-center justify-center rounded-full" style={{ background: '#fff' }}>
                    <span style={{ fontFamily: F.body, fontSize: 30, lineHeight: 1, color: C.ink }}>{passNumber}</span>
                  </div>
                  <Body>{passNumber === '1' ? 'lugar para ti' : 'lugares para ti'}</Body>
                </div>
              )}
            </div>
          </Tint>
        </Reveal>

        {/* ═══ FECHA ═══ */}
        <section className={`${COL} pt-14`}>
          <Reveal>
            <Title style={{ color: C.soft }}>Queremos que nos acompañes</Title>

            <div className="mt-7 flex items-center justify-center gap-2">
              <div className="flex flex-1 flex-col items-center gap-1.5">
                <span className="h-px w-full" style={{ background: C.oliveSoft }} />
                <span style={{ fontFamily: F.caps, fontSize: 'clamp(11px,3vw,14px)', textTransform: 'uppercase', letterSpacing: '0.05em', color: C.oliveSoft }}>{data.dateWeekday}</span>
                <span className="h-px w-full" style={{ background: C.oliveSoft }} />
              </div>

              {/* Píldora central: 2px de borde y radio enorme, como el original */}
              <div className="flex shrink-0 flex-col items-center justify-center px-4 py-3"
                style={{ border: `2px solid ${C.oliveSoft}`, borderRadius: '30rem', width: 'clamp(110px,32vw,150px)' }}>
                <span style={{ fontFamily: F.caps, fontSize: 'clamp(9px,2.4vw,12px)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.oliveSoft }}>{data.dateCity}</span>
                <span style={{ fontFamily: F.num, fontWeight: 300, fontSize: 'clamp(58px,17vw,84px)', lineHeight: 1, color: C.oliveSoft }}>{data.dateDay}</span>
                <span style={{ fontFamily: F.caps, fontSize: 'clamp(11px,3vw,14px)', color: C.oliveSoft }}>{data.dateYear}</span>
              </div>

              <div className="flex flex-1 flex-col items-center gap-1.5">
                <span className="h-px w-full" style={{ background: C.oliveSoft }} />
                <span style={{ fontFamily: F.caps, fontSize: 'clamp(11px,3vw,14px)', textTransform: 'uppercase', letterSpacing: '0.05em', color: C.oliveSoft }}>{data.dateMonth}</span>
                <span className="h-px w-full" style={{ background: C.oliveSoft }} />
              </div>
            </div>

            {/* Cuenta regresiva: caja de 15px de radio */}
            <Title className="mt-10">Faltan:</Title>
            <div className="mx-auto mt-3 flex max-w-[330px] justify-center gap-1 px-3 py-4"
              style={{ border: `2px solid ${C.ink}`, borderRadius: 15 }}>
              {cd.map(c => (
                <div key={c.l} className="flex-1 text-center">
                  <p style={{ fontFamily: F.body, fontSize: 'clamp(25px,7vw,34px)', lineHeight: 1.4, color: C.olive }}>{String(c.v).padStart(2, '0')}</p>
                  <p style={{ fontFamily: F.body, fontSize: 14, lineHeight: 1, color: C.olive }}>{c.l}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <LineBtn href={gcal} radius={15}><CalIcon />Agendar el evento</LineBtn>
            </div>
          </Reveal>
        </section>

        {/* ═══ BENDICIÓN Y FAMILIA ═══ */}
        {(data.blessing || parentCols.length > 0) && (
          <section className="mt-14">
            <Reveal>
              <Tint className="px-6 py-12">
                <div className="mx-auto w-full max-w-[500px]">
                  {data.blessing && <Title>{data.blessing}</Title>}
                  {parentCols.length > 0 && (
                    <div className="mt-8 flex flex-col gap-6">
                      {parentCols.map(col => (
                        <div key={col.t}>
                          <Title style={{ fontSize: 'clamp(12px,3.2vw,16px)', fontWeight: 400, color: C.olive }}>{col.t}</Title>
                          <div className="mt-1.5 space-y-0.5">{col.p.map((n, i) => <Body key={i}>{n}</Body>)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Tint>
            </Reveal>
          </section>
        )}

        {/* ═══ CEREMONIA Y RECEPCIÓN ═══ */}
        <section className={`${COL} pt-14`}>
          <Reveal><Title>Ceremonia y recepción</Title></Reveal>
          <div className="mt-8 flex flex-col gap-12">
            {ceremonies.map((b, i) => (
              <Reveal key={b.title} delay={i * 80} className="flex flex-col items-center gap-2">
                <EventIcon name={b.icon} className="h-14 w-14" stroke={C.olive} custom={data} sec={b.sec} />
                <Title style={{ fontSize: 'clamp(13px,3.4vw,18px)', fontWeight: 400 }}>{b.title}</Title>
                <Body style={{ fontSize: 17 }}>{b.c.place}</Body>
                <div className="mt-2 flex flex-wrap items-stretch justify-center gap-1.5">
                  {b.c.time && <LineBtn>{b.c.time}</LineBtn>}
                  {b.c.maps && <GoldBtn href={b.c.maps}>Ubicación</GoldBtn>}
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ═══ DRESS CODE ═══ */}
        <section className="mt-14">
          <Reveal>
            <Tint className="px-6 py-12">
              <div className="mx-auto flex w-full max-w-[500px] flex-col items-center gap-3">
                <EventIcon name="dress" className="h-16 w-16" stroke={C.olive} custom={data} sec="dress" />
                <Title>Dress code</Title>
                <Body>{data.dressCode}</Body>
              </div>
            </Tint>
          </Reveal>
        </section>

        {/* ═══ RESPIRO FOTOGRÁFICO ═══ */}
        <div className="mt-6"><PhotoBand images={band} /></div>

        {/* ═══ ITINERARIO ═══ */}
        {data.itinerary.length > 0 && (
          <section className="pt-6">
            <Reveal className={COL}><Title>Itinerario</Title></Reveal>
            <div className="mx-auto mt-8 w-full max-w-[440px] px-6">
              {data.itinerary.map((it, i) => {
                const left = i % 2 === 0;
                return (
                  <Reveal key={i} delay={i * 60} className="grid grid-cols-2 items-stretch">
                    <div className={`flex min-h-[92px] items-center ${left ? 'justify-end pr-4' : 'order-2 justify-start pl-4'}`}>
                      <EventIcon name={it.icon ?? 'rings'} className="h-12 w-12" stroke={C.olive}
                        custom={data} lottieColors={it.iconColors} speed={it.iconSpeed} />
                    </div>
                    <div className={`flex min-h-[92px] flex-col justify-center gap-0.5 ${left ? 'items-start pl-4' : 'order-1 items-end pr-4'}`}
                      style={{
                        borderTop: `1px solid ${C.line}`,
                        [left ? 'borderLeft' : 'borderRight']: `1px solid ${C.line}`,
                        [left ? 'borderTopLeftRadius' : 'borderTopRightRadius']: '30%',
                      }}>
                      <Body style={{ textAlign: left ? 'left' : 'right', color: C.ink }}>{it.label}</Body>
                      <Body style={{ textAlign: left ? 'left' : 'right', color: '#000', opacity: 0.75 }}>{it.time}</Body>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal className="mt-12">
              <Tint className="px-6 py-12">
                <div className="mx-auto flex w-full max-w-[500px] flex-col items-center gap-3">
                  <EventIcon name="calendar" className="h-12 w-12" stroke={C.olive} custom={data} sec="punctual" />
                  <Body>¡La vida está llena de momentos que no se pueden recuperar! Llega puntual y comparte este momento especial con nosotros.</Body>
                </div>
              </Tint>
            </Reveal>
          </section>
        )}

        {/* ═══ REGALO ═══ */}
        <section className={`${COL} pt-14`}>
          <Reveal className="flex flex-col items-center gap-3">
            <EventIcon name="gift" className="h-16 w-16" stroke={C.olive} custom={data} sec="gift" />
            <Title>Sugerencia de regalo</Title>
            <Body>{data.giftMessage}</Body>
          </Reveal>

          <div className="mt-8 flex flex-col gap-3">
            {data.giftBank && (
              <Reveal><Tint className="px-5 py-7" style={{ borderRadius: 15 }}>
                <Title style={{ fontSize: 13, fontWeight: 400 }}>{data.giftBank.bank}</Title>
                <Body className="mt-1.5">{data.giftBank.account}</Body>
                <Body style={{ color: C.soft }}>{data.giftBank.holder}</Body>
              </Tint></Reveal>
            )}
            {data.giftQrUrl && (
              <Reveal delay={70}><Tint className="flex flex-col items-center px-5 py-7" style={{ borderRadius: 15 }}>
                <Title style={{ fontSize: 13, fontWeight: 400 }}>Transferencia QR</Title>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.giftQrUrl} alt="QR para transferencia" className="mt-3 h-32 w-32 bg-white p-2" style={{ borderRadius: 8 }} />
              </Tint></Reveal>
            )}
            {data.giftCash && (
              <Reveal delay={100}><Tint className="px-5 py-7" style={{ borderRadius: 15 }}>
                <Title style={{ fontSize: 13, fontWeight: 400 }}>Efectivo</Title>
                <Body className="mt-1.5">{data.giftCash}</Body>
              </Tint></Reveal>
            )}
            {data.giftOther && (
              <Reveal delay={130}><Tint className="px-5 py-7" style={{ borderRadius: 15 }}>
                <Title style={{ fontSize: 13, fontWeight: 400 }}>Otros obsequios</Title>
                <Body className="mt-1.5">{data.giftOther}</Body>
              </Tint></Reveal>
            )}
          </div>

          {data.giftThanks && <Reveal><Title className="mt-7" style={{ fontSize: 13, fontWeight: 400, color: C.soft }}>{data.giftThanks}</Title></Reveal>}
        </section>

        {/* ═══ GALERÍA ═══ */}
        {gallery.length > 0 && (
          <section className="pt-14">
            <Reveal className={COL}><Title>Nuestra historia</Title></Reveal>
            <ParallaxGallery images={gallery} />
          </section>
        )}

        {/* ═══ SOLO ADULTOS + COMPARTIR ═══ */}
        {data.noKids && (
          <Reveal className="mt-4">
            <Tint className="px-6 py-12">
              <div className="mx-auto flex w-full max-w-[500px] flex-col items-center gap-3">
                <BabyNo color={C.olive} className="h-14 w-14" />
                <Title>Dulces sueños</Title>
                <Body>{data.noKids}</Body>
              </div>
            </Tint>
          </Reveal>
        )}

        <section className={`${COL} pt-14`}>
          <Reveal className="flex flex-col items-center gap-3">
            <EventIcon name="camera" className="h-14 w-14" stroke={C.olive} custom={data} sec="gallery" />
            <Title>Captura y comparte</Title>
            <Body>{data.galleryMsg}</Body>
            {data.galleryUrl && data.galleryUrl !== '#' && (
              <div className="mt-3"><GoldBtn href={data.galleryUrl}>Compartir fotografías</GoldBtn></div>
            )}
          </Reveal>
        </section>

        {/* ═══ CONFIRMACIÓN ═══ */}
        <section className={`${COL} pt-14`}>
          <Reveal className="flex flex-col items-center gap-3">
            <Title>Confirma tu asistencia</Title>
            <Body>{data.rsvpClosing}</Body>
            {data.whatsapp && <div className="mt-3"><GoldBtn href={data.whatsapp}>Confirmar asistencia</GoldBtn></div>}
          </Reveal>
        </section>

        {/* ═══ CIERRE ═══ */}
        <section className={`${COL} pt-14 pb-4`}>
          <Reveal className="flex flex-col items-center gap-4">
            <Title style={{ fontWeight: 400 }}>Esperamos contar con tu compañía</Title>
            <EventIcon name="rings" className="h-14 w-14" stroke={C.olive} custom={data} sec="thanks" />
            {data.thanksMessage && <Body>{data.thanksMessage}</Body>}
            <p style={{ fontFamily: F.script, fontSize: 'clamp(35px,10vw,44px)', lineHeight: 1.2, color: C.olive, textAlign: 'center' }}>
              {data.bride} &amp; {data.groom}
            </p>
          </Reveal>
        </section>

        {band.length > 0 && <PhotoBand images={band} height="44vh" />}

        <footer className="px-6 py-8 text-center" style={{ background: '#141414' }}>
          <p style={{ fontFamily: F.caps, fontSize: 17, letterSpacing: '0.22em', color: '#ffffff' }}>ENKARTA</p>
          <p className="mt-1" style={{ fontFamily: F.body, fontSize: 13, lineHeight: 1.2, color: '#898989' }}>
            ¿Deseas una invitación para tu evento?{' '}
            <a href={ENKARTA_WA_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontWeight: 700 }}>
              Contáctanos
            </a>
          </p>
        </footer>
      </div>
    </ThemeCtx.Provider>
  );
}
