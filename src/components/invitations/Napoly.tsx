'use client';

import { useEffect, useRef, useState, useContext, createContext } from 'react';
import { DolceVitaContent, TemplateTheme } from './types';
import { useCountdown, Odometer, Reveal, EventIcon, MasonryGallery, CalIcon, SECTION, TYPE, ENKARTA_WA_URL } from './shared';
import { WriteOn } from '@/lib/scroll-motion';

// ── Paleta por defecto (taupe/mocha + rosa empolvado/malva + dorado) ──────────────
const DEFAULT_C = {
  paper: '#fbf8f3',
  taupe: '#6f6052',       // banda mocha (invitado)
  taupeDeep: '#574a3f',
  rose: '#b98a86',        // rosa empolvado (script / acentos)
  mauve: '#9c7c8a',
  gold: '#b59a6a',
  ink: '#5a4d44',         // texto cálido
  cream: '#f3ece1',       // texto sobre taupe
  line: 'rgba(181,154,106,0.65)',
};
type NPPalette = typeof DEFAULT_C;

const ThemeCtx = createContext<NPPalette>(DEFAULT_C);
const useC = () => useContext(ThemeCtx);

function resolveNapolyTheme(t?: TemplateTheme): NPPalette {
  return {
    paper:     t?.bg          || DEFAULT_C.paper,
    taupe:     t?.primaryDeep || DEFAULT_C.taupe,
    taupeDeep: t?.primaryDeep || DEFAULT_C.taupeDeep,
    rose:      t?.primary     || DEFAULT_C.rose,
    mauve:     DEFAULT_C.mauve,
    gold:      DEFAULT_C.gold,
    ink:       t?.text        || DEFAULT_C.ink,
    cream:     t?.onPrimary   || DEFAULT_C.cream,
    line:      t?.line        || DEFAULT_C.line,
  };
}

const F = {
  script: "'Great Vibes', cursive",
  serif: "'Cormorant Garamond', serif",
  body: "'Cormorant Garamond', serif",
};

// ── Floral blush (rosas malva/rosa + pampas dorada) ───────────────────────────────
function BlushFloral({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const C = useC();
  const rose = (x: number, y: number, r: number, fill: string) => (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={fill} opacity="0.85" />
      <circle r={r * 0.62} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={r * 0.12} />
    </g>
  );
  return (
    <svg viewBox="0 0 160 200" className={className} style={style} aria-hidden>
      {/* pampas / plumas doradas */}
      <path d="M120 10 C 110 60, 96 110, 70 160" stroke={C.gold} strokeWidth="1.2" fill="none" opacity="0.6" />
      <path d="M140 20 C 134 70, 120 120, 96 170" stroke={C.gold} strokeWidth="1" fill="none" opacity="0.5" />
      {Array.from({ length: 9 }).map((_, i) => {
        const t = i / 8; const x = 120 - t * 50; const y = 14 + t * 146;
        return <path key={i} d={`M${x} ${y} l 10 -5M${x} ${y} l 10 5`} stroke={C.gold} strokeWidth="0.9" opacity={0.5} />;
      })}
      {/* hojas */}
      <ellipse cx="60" cy="120" rx="14" ry="5" transform="rotate(-30 60 120)" fill="#8a9a72" opacity="0.6" />
      <ellipse cx="96" cy="150" rx="14" ry="5" transform="rotate(20 96 150)" fill="#8a9a72" opacity="0.55" />
      {/* rosas */}
      {rose(64, 96, 22, C.rose)}
      {rose(98, 120, 18, C.mauve)}
      {rose(50, 132, 14, '#d8b3ac')}
      {rose(110, 96, 13, '#d8b3ac')}
    </svg>
  );
}

// ── Foto en arco ──────────────────────────────────────────────────────────────────
function ArchPhoto({ src, className = '' }: { src?: string; className?: string }) {
  const C = useC();
  return (
    <div className={`overflow-hidden ${className}`} style={{ borderRadius: '999px 999px 10px 10px', background: C.taupe, aspectRatio: '3 / 4' }}>
      {src
        ? // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        : <div className="h-full w-full" />}
    </div>
  );
}

function Script({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return <p className={className} style={{ fontFamily: F.script, color: C.rose, lineHeight: 1, ...style }}>{children}</p>;
}
function Caps({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <h3 className={className} style={{ fontFamily: F.serif, letterSpacing: '0.16em', textTransform: 'uppercase', lineHeight: 1.5, fontWeight: 500, ...style }}>{children}</h3>;
}
function Flourish({ className = '', color }: { className?: string; color?: string }) {
  const C = useC();
  const c = color || C.gold;
  return (
    <svg viewBox="0 0 200 24" className={className} fill="none" stroke={c} strokeWidth="1.1" aria-hidden>
      <path d="M40 12 H 90M160 12 H 110" strokeLinecap="round" />
      <path d="M90 12 C 96 12, 96 6, 100 6 C 104 6, 104 12, 100 12 C 96 12, 96 18, 100 18 C 104 18, 104 12, 110 12" strokeLinecap="round" />
      <path d="M40 12 C 34 12, 34 7, 30 8M160 12 C 166 12, 166 7, 170 8" strokeLinecap="round" />
      <path d="M100 4 l1.6 3.6 3.6.4-2.6 2.6.6 3.6-3.2-1.8-3.2 1.8.6-3.6-2.6-2.6 3.6-.4z" fill={c} stroke="none" opacity="0" />
    </svg>
  );
}
function Heart({ color }: { color: string }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill={color} aria-hidden><path d="M12 21C6 17 2 13.5 2 8.8 2 5.4 4.7 3 7.7 3 9.5 3 11 3.9 12 5.3 13 3.9 14.5 3 16.3 3 19.3 3 22 5.4 22 8.8 22 13.5 18 17 12 21z" /></svg>;
}
function OutBtn({ children, href }: { children: React.ReactNode; href: string }) {
  const C = useC();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full px-7 py-2.5 text-[11px] tracking-[0.16em] uppercase transition-all duration-300 hover:bg-[rgba(181,154,106,0.1)]"
      style={{ border: `1px solid ${C.rose}`, color: C.taupeDeep, fontFamily: F.serif }}>
      {children}
    </a>
  );
}
function Wave({ fill, flip = false }: { fill: string; flip?: boolean }) {
  return (
    <div className="relative w-full leading-[0]" style={{ marginTop: flip ? -1 : 0, marginBottom: flip ? 0 : -1 }} aria-hidden>
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="block w-full" style={{ height: 44, transform: flip ? 'rotate(180deg)' : 'none' }}>
        <path d="M0,28 C 320,58 560,6 760,28 C 980,52 1220,12 1440,34 L1440,60 L0,60 Z" fill={fill} />
      </svg>
    </div>
  );
}
function BabyNo({ color, className = '' }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="26" /><path d="M14 14 50 50" />
      <circle cx="28" cy="26" r="3" /><path d="M22 34c0 5 4 9 9 9 3 0 5-1 7-3M24 40l-5 6M36 42l4 5" />
    </svg>
  );
}
function EnvelopeMoney({ color, className = '' }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 52" className={className} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 16 32 34 56 16" /><path d="M8 16h48v28H8z" /><path d="M8 44 26 28M56 44 38 28" />
    </svg>
  );
}

export default function Napoly({ data }: { data: DolceVitaContent }) {
  const { days, hours, mins, secs } = useCountdown(data.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const C = resolveNapolyTheme(data.theme);

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
  const cd = [{ v: days, l: 'Días' }, { v: hours, l: 'Horas' }, { v: mins, l: 'Mins.' }, { v: secs, l: 'Segs.' }];
  const ceremonies = [
    { icon: 'church', title: 'Ceremonia Religiosa', c: data.ceremonyReligious, img: data.galleryImages[0] },
    ...(data.ceremonyCivil ? [{ icon: 'rings', title: 'Ceremonia Civil', c: data.ceremonyCivil, img: data.galleryImages[2] }] : []),
    ...(data.reception ? [{ icon: 'camera', title: 'Recepción Social', c: data.reception, img: data.galleryImages[1] }] : []),
  ];

  return (
    <ThemeCtx.Provider value={C}>
    <div className="relative w-full overflow-x-hidden" style={{ background: C.paper, color: C.ink, fontFamily: F.body }}>
      <style>{`@keyframes npSpin{to{transform:rotate(360deg)}} @keyframes npFade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {data.musicUrl && <audio ref={audioRef} src={data.musicUrl} loop />}
      {data.musicUrl && (<button onClick={toggleMusic} className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
        style={{ background: C.paper, color: C.rose, border: `1px solid ${C.rose}` }} aria-label="Música">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ animation: playing ? 'npSpin 4s linear infinite' : 'none' }}>
          <path d="M9 17a3 3 0 11-2-2.83V5l11-2v10.17A3 3 0 1116 14V7L9 8.4V17z" />
        </svg>
      </button>)}

      {/* ════════ PORTADA ════════ */}
      <section className="relative md:grid md:min-h-screen md:grid-cols-2">
        <div className="relative overflow-hidden h-[44vh] md:h-auto">
          {data.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover ek-kenburns" />
          )}
        </div>
        <div className="relative flex flex-col items-center justify-center overflow-hidden px-8 py-16 text-center" style={{ background: C.paper }}>
          <BlushFloral className="pointer-events-none absolute -right-2 top-2 w-36" />
          <div className="relative z-10" style={{ animation: 'npFade 1.1s ease' }}>
            <Script style={{ fontSize: TYPE.display, color: C.taupeDeep }}><WriteOn>{data.groom}</WriteOn></Script>
            <p style={{ fontFamily: F.serif, color: C.taupe, fontSize: '24px' }}>&amp;</p>
            <Script style={{ fontSize: TYPE.display, color: C.taupeDeep }}><WriteOn delay={450}>{data.bride}</WriteOn></Script>
            <Caps className="mt-7" style={{ fontSize: '14px', color: C.taupeDeep }}>¡Nos casamos!</Caps>
            <p className="mx-auto mt-3 max-w-sm" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink, lineHeight: 1.6 }}>{data.introMessage}</p>
          </div>
        </div>
      </section>

      {/* ════════ INVITADO (taupe) ════════ */}
      <Wave fill={C.taupe} />
      <section className={`relative px-6 ${SECTION.tight} text-center`} style={{ background: C.taupe, color: C.cream }}>
        <Reveal className="mx-auto max-w-xl">
          <p style={{ fontFamily: F.serif, fontSize: TYPE.body }}>Su presencia es el regalo más valioso que podemos recibir:</p>
          <div className="mx-auto my-3 flex max-w-xs items-center justify-center gap-3"><span className="h-px flex-1" style={{ background: C.gold }} /><Heart color={C.gold} /><span className="h-px flex-1" style={{ background: C.gold }} /></div>
          {data.guestPasses && <Script style={{ fontSize: '40px', color: C.cream }}>{data.guestPasses}</Script>}
          <p style={{ fontSize: '14px' }}>Hemos reservado:</p>
          {data.guestName && <Script style={{ fontSize: '38px', color: C.cream }}>{data.guestName}</Script>}
          <p style={{ fontSize: '13px' }}>en su honor</p>
        </Reveal>
      </section>
      <Wave fill={C.taupe} flip />

      {/* ════════ PADRES ════════ */}
      <section className="px-6 pt-10 pb-4 text-center" style={{ background: C.paper }}>
        <Reveal>
          <Script style={{ fontSize: '32px' }}>Con la bendición de Dios y de nuestros padres</Script>
          <div className="mx-auto mt-8 grid max-w-3xl gap-8 sm:grid-cols-2">
            {[{ t: 'Padres del Novio', p: data.parentsGroom }, { t: 'Padres de la Novia', p: data.parentsBride }].map(col => (
              <div key={col.t}>
                <Caps style={{ fontSize: '14px', color: C.rose }}>{col.t}</Caps>
                <div className="mt-2 space-y-1" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink }}>{col.p.map((n, i) => <p key={i}>{n}</p>)}</div>
              </div>
            ))}
          </div>
          <Script className="mt-10" style={{ fontSize: '28px' }}>Nos gustaría que seas parte de este día especial</Script>
          <div className="mt-3 flex justify-center"><Heart color={C.rose} /></div>
        </Reveal>
      </section>

      {/* ════════ FECHA + COUNTDOWN ════════ */}
      <section className={`px-6 ${SECTION.tight} text-center`} style={{ background: C.paper }}>
        <Reveal className="mx-auto max-w-2xl">
          <div className="flex items-center justify-center gap-2">
            <span className="hidden h-px flex-1 sm:block" style={{ background: C.rose, maxWidth: 90 }} />
            <span className="hidden text-[13px] tracking-[0.16em] sm:block" style={{ fontFamily: F.serif, textTransform: 'uppercase', color: C.ink }}>{data.dateWeekday}</span>
            <div className="relative mx-2 flex flex-col items-center justify-center" style={{ width: 124, height: 158, border: `1.5px solid ${C.rose}`, borderRadius: '50%' }}>
              <span className="text-[12px] tracking-[0.12em]" style={{ fontFamily: F.serif, textTransform: 'uppercase', color: C.taupeDeep }}>{data.dateCity}</span>
              <span style={{ fontFamily: F.serif, fontSize: 60, fontWeight: 600, lineHeight: 1, color: C.taupeDeep }}>{data.dateDay}</span>
              <span className="text-[13px]" style={{ fontFamily: F.serif, color: C.taupeDeep }}>{data.dateYear}</span>
            </div>
            <span className="hidden text-[13px] tracking-[0.16em] sm:block" style={{ fontFamily: F.serif, textTransform: 'uppercase', color: C.ink }}>{data.dateMonth}</span>
            <span className="hidden h-px flex-1 sm:block" style={{ background: C.rose, maxWidth: 90 }} />
          </div>
          <p className="mt-4 italic" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.rose }}>Faltan</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <Flourish className="hidden w-24 sm:block" />
            <div className="flex gap-4">
              {cd.map(c => (
                <div key={c.l}>
                  <p style={{ fontFamily: F.serif, fontSize: 'clamp(24px,6vw,34px)', fontWeight: 600, lineHeight: 1, color: C.taupeDeep }}><Odometer value={c.v} /></p>
                  <p className="text-[12px]" style={{ color: C.rose }}>{c.l}</p>
                </div>
              ))}
            </div>
            <Flourish className="hidden w-24 scale-x-[-1] sm:block" />
          </div>
          <div className="mt-6"><OutBtn href={gcal}><CalIcon />Agendar el evento</OutBtn></div>
        </Reveal>
      </section>

      {/* ════════ CEREMONIA (fotos en arco) + DRESS CODE + ITINERARIO ════════ */}
      <section className={`px-6 ${SECTION.tight}`} style={{ background: C.paper }}>
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-10 sm:grid-cols-2">
            {ceremonies.map((b, i) => (
              <Reveal key={b.title} className="flex flex-col items-center text-center">
                {b.img
                  ? <ArchPhoto src={b.img} className="mb-4 w-[min(60vw,220px)]" />
                  : <EventIcon name={b.icon} className="mb-3 h-12 w-12" stroke={C.rose} custom={data} sec={i === 0 ? 'ceremony' : 'reception'} />}
                <Caps style={{ fontSize: '15px', color: C.taupeDeep }}>{b.title}</Caps>
                <div className="mt-2 flex items-center justify-center gap-2" style={{ fontSize: '15px', color: C.ink }}>
                  <span className="font-semibold">{b.c.time}</span>
                  <span style={{ width: 1, height: 28, background: C.line }} />
                  <span className="max-w-[130px] text-left" style={{ color: C.gold }}>{b.c.place}</span>
                </div>
                <div className="mt-4"><OutBtn href={b.c.maps}>Ver ubicación</OutBtn></div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 flex flex-col items-center text-center">
            <EventIcon name="dress" className="mb-1 h-12 w-12" stroke={C.rose} custom={data} sec="dress" />
            <Caps style={{ fontSize: '15px', color: C.taupeDeep }}>Código de vestimenta</Caps>
            <p style={{ fontSize: TYPE.body, color: C.ink }}>{data.dressCode}</p>
          </Reveal>

          <Flourish className="mx-auto my-9 w-40" />

          <Reveal>
            <Script className="text-center" style={{ fontSize: '40px' }}>Itinerario</Script>
            <div className="mt-8 grid grid-cols-2 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
              {data.itinerary.map((it, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <EventIcon name={it.icon ?? 'rings'} className="h-11 w-11" stroke={C.rose} custom={data} lottieColors={it.iconColors} speed={it.iconSpeed} />
                  <span className="my-2 block h-px w-12" style={{ background: C.line }} />
                  <p className="text-[12px]" style={{ fontFamily: F.serif, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.taupeDeep }}>{it.label}</p>
                  <p style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.gold }}>{it.time}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════ NOSOTROS (collage) ════════ */}
      {data.galleryImages.length > 0 && (
        <section className={`px-6 ${SECTION.tight}`} style={{ background: C.paper }}>
          <Reveal className="mx-auto max-w-4xl text-center">
            <Script style={{ fontSize: '44px' }}>Nosotros</Script>
            <MasonryGallery images={data.galleryImages} className="mt-8" />
          </Reveal>
        </section>
      )}

      {/* ════════ HOSPEDAJE + GALERÍA ════════ */}
      <section className={`px-6 ${SECTION.tight}`} style={{ background: C.paper }}>
        <div className="mx-auto max-w-3xl">
          {data.lodging.length > 0 && (
            <Reveal className="rounded-3xl p-6 text-center" style={{ background: C.taupe, color: C.cream }}>
              <Script className="text-center" style={{ fontSize: '32px', color: C.gold }}>{data.lodgingTitle ?? 'Sugerencia de hospedaje'}</Script>
              <div className="mt-4 grid items-center gap-5 sm:grid-cols-2">
                <div className="overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={data.lodging[0].image} alt="" className="h-48 w-full object-cover" />
                </div>
                <div className="text-center sm:text-left">
                  <p style={{ fontFamily: F.serif, fontSize: TYPE.body, lineHeight: 1.5 }}>{data.lodging[0].desc}</p>
                  {data.lodgingContact && <p className="mt-3" style={{ fontFamily: F.serif, fontSize: TYPE.body }}>{data.lodgingContact}</p>}
                </div>
              </div>
            </Reveal>
          )}
          <Reveal className="mt-10 text-center">
            <div className="mx-auto max-w-md rounded-3xl px-6 py-8" style={{ border: `1px solid ${C.line}` }}>
              <EventIcon name="camera" className="mx-auto mb-3 h-11 w-11" stroke={C.rose} custom={data} sec="gallery" />
              <p style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink, lineHeight: 1.6 }}>{data.galleryMsg}</p>
              <div className="mt-5"><OutBtn href={data.galleryUrl}>Compartir fotografías</OutBtn></div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════ SOLO ADULTOS ════════ */}
      <section className={`px-6 ${SECTION.tight} text-center`} style={{ background: C.paper }}>
        <Reveal className="mx-auto max-w-xl">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full" style={{ border: `1px solid ${C.rose}` }}>
            <BabyNo color={C.rose} className="h-12 w-12" />
          </div>
          <Script style={{ fontSize: '40px' }}>Solo Adultos</Script>
          <p className="mt-2" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink, lineHeight: 1.6 }}>{data.noKids}</p>
        </Reveal>
      </section>

      {/* ════════ REGALO (taupe) ════════ */}
      <Wave fill={C.taupe} />
      <section className={`relative px-6 ${SECTION.base} text-center`} style={{ background: C.taupe, color: C.cream }}>
        <Reveal className="mx-auto max-w-3xl">
          <EventIcon name="gift" className="mx-auto mb-3 h-12 w-12" stroke={C.gold} custom={data} sec="gift" />
          <Script style={{ fontSize: '42px', color: C.gold }}>Sugerencia de Regalo</Script>
          <p className="mx-auto mt-3 max-w-xl" style={{ fontFamily: F.serif, fontSize: TYPE.body, lineHeight: 1.6 }}>{data.giftMessage}</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {data.giftCash && (
              <div className="flex flex-col items-center justify-center rounded-2xl px-5 py-8" style={{ border: `1px solid ${C.gold}` }}>
                <EnvelopeMoney color={C.cream} className="mb-4 h-12 w-14" />
                <Script style={{ fontSize: '24px', color: C.gold }}>{data.giftCash}</Script>
              </div>
            )}
            {data.giftBank && (
              <div className="flex flex-col items-center justify-center rounded-2xl px-5 py-7" style={{ border: `1px solid ${C.gold}` }}>
                <Caps style={{ fontSize: '13px', color: C.gold }}>{data.giftBank.bank}</Caps>
                <p style={{ fontFamily: F.serif, fontSize: TYPE.body }}>{data.giftBank.account}</p>
                <p style={{ fontFamily: F.serif, fontSize: TYPE.body }}>{data.giftBank.holder}</p>
                {data.giftQrUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.giftQrUrl} alt="QR" className="mt-3 h-32 w-32 rounded-lg bg-white p-2" />
                )}
              </div>
            )}
            {data.giftOther && (
              <div className="flex flex-col items-center justify-center rounded-2xl px-5 py-8" style={{ border: `1px solid ${C.gold}` }}>
                <Caps style={{ fontSize: '14px', color: C.cream }}>{data.giftOther}</Caps>
              </div>
            )}
          </div>
        </Reveal>
      </section>
      <Wave fill={C.taupe} flip />

      {/* ════════ CONFIRMACIÓN ════════ */}
      <section className={`px-6 ${SECTION.base} text-center`} style={{ background: C.paper }}>
        <Reveal className="mx-auto max-w-xl">
          <Script style={{ fontSize: '44px' }}>{data.rsvpClosing ?? 'Confirmar asistencia'}</Script>
          <p className="mx-auto mt-3 max-w-md" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink, lineHeight: 1.5 }}>Es muy importante para nosotros confirmar tu asistencia.</p>
          <div className="mt-5"><OutBtn href={data.whatsapp}>Confirmar asistencia</OutBtn></div>
        </Reveal>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="py-9 text-center" style={{ background: C.taupeDeep, color: C.cream }}>
        <Script style={{ fontSize: '34px', color: C.gold }}>Enkarta</Script>
        <p className="mt-1" style={{ fontFamily: F.serif, fontSize: '14px', opacity: 0.85 }}>
          ¿Deseas una invitación para tu evento? <a href={ENKARTA_WA_URL} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: C.gold, textDecoration: 'underline', textUnderlineOffset: 3 }}>Contáctanos</a>
        </p>
      </footer>
    </div>
    </ThemeCtx.Provider>
  );
}
