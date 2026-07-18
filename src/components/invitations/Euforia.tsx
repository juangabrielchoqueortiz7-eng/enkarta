'use client';

import { useEffect, useRef, useState, useContext, createContext } from 'react';
import { DolceVitaContent, TemplateTheme } from './types';
import { useCountdown, Odometer, Reveal, EventIcon, MasonryGallery, CalIcon, SECTION, TYPE, ENKARTA_WA_URL } from './shared';
import { WriteOn } from '@/lib/scroll-motion';

// ── Paleta por defecto (mocha cálido + dorado + crema) ────────────────────────────
const DEFAULT_C = {
  paper: '#f7f1e5',
  mocha: '#8a7257',       // banda invitado / botones
  mochaDeep: '#6b563f',
  gold: '#b89a6a',        // script / ornamentos
  ink: '#5d5040',         // texto cálido
  cream: '#f4ecdd',       // texto sobre mocha
  sage: '#9fae8f',        // hojas pastel
  mauve: '#b39aa6',
  line: 'rgba(184,154,106,0.65)',
};
type EFPalette = typeof DEFAULT_C;

const ThemeCtx = createContext<EFPalette>(DEFAULT_C);
const useC = () => useContext(ThemeCtx);

function resolveEuforiaTheme(t?: TemplateTheme): EFPalette {
  return {
    paper:     t?.bg          || DEFAULT_C.paper,
    mocha:     t?.primary     || DEFAULT_C.mocha,
    mochaDeep: t?.primaryDeep || DEFAULT_C.mochaDeep,
    gold:      DEFAULT_C.gold,
    ink:       t?.text        || DEFAULT_C.ink,
    cream:     t?.onPrimary   || DEFAULT_C.cream,
    sage:      DEFAULT_C.sage,
    mauve:     DEFAULT_C.mauve,
    line:      t?.line        || DEFAULT_C.line,
  };
}

const F = {
  script: "'Great Vibes', cursive",
  serif: "'Cormorant Garamond', serif",
  body: "'Cormorant Garamond', serif",
};

// ── Hojas acuarela pastel (fondo / corona) ────────────────────────────────────────
function PastelLeaves({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const C = useC();
  const leaf = (x: number, y: number, rx: number, ry: number, rot: number, fill: string, o: number) => (
    <ellipse cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${rot} ${x} ${y})`} fill={fill} opacity={o} />
  );
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} aria-hidden>
      <path d="M178 18 C 130 50, 95 95, 60 160" stroke={C.sage} strokeWidth="1.2" fill="none" opacity="0.4" />
      {leaf(168, 30, 15, 6.5, -38, C.sage, 0.5)}
      {leaf(150, 50, 17, 7.5, -30, C.mauve, 0.45)}
      {leaf(135, 72, 16, 7, -24, C.sage, 0.5)}
      {leaf(118, 96, 17, 7.5, -18, C.gold, 0.4)}
      {leaf(100, 118, 16, 7, -10, C.sage, 0.5)}
      {leaf(84, 138, 15, 6.5, -4, C.mauve, 0.4)}
      {leaf(70, 156, 13, 6, 4, C.sage, 0.45)}
    </svg>
  );
}

// ── Corona de aro dorado con hojas pastel ─────────────────────────────────────────
function LeafWreath({ children }: { children: React.ReactNode }) {
  const C = useC();
  const leaf = (x: number, y: number, rot: number, fill: string) => (
    <ellipse cx={x} cy={y} rx="11" ry="4.5" transform={`rotate(${rot} ${x} ${y})`} fill={fill} opacity="0.7" />
  );
  return (
    <div className="relative mx-auto flex items-center justify-center" style={{ width: 'min(80vw,330px)', height: 'min(80vw,330px)' }}>
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
        <circle cx="100" cy="100" r="84" stroke={C.gold} strokeWidth="1.4" />
        <circle cx="100" cy="100" r="89" stroke={C.gold} strokeWidth="0.6" opacity="0.5" />
        {/* hojas alrededor del aro (arco superior-derecho e inferior-izquierdo) */}
        {leaf(150, 40, -40, C.sage)}{leaf(166, 60, -20, C.mauve)}{leaf(172, 86, 0, C.sage)}{leaf(168, 112, 22, C.gold)}{leaf(154, 136, 42, C.sage)}
        {leaf(50, 160, 140, C.sage)}{leaf(34, 140, 160, C.mauve)}{leaf(28, 114, 180, C.sage)}{leaf(32, 88, 200, C.gold)}{leaf(46, 64, 222, C.sage)}
      </svg>
      <div className="relative z-10 px-10 text-center">{children}</div>
    </div>
  );
}

function Script({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return <p className={className} style={{ fontFamily: F.script, color: C.gold, lineHeight: 1, ...style }}>{children}</p>;
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
    </svg>
  );
}
function MochaBtn({ children, href }: { children: React.ReactNode; href: string }) {
  const C = useC();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full px-7 py-2.5 text-[11px] tracking-[0.16em] uppercase transition-all duration-300 hover:brightness-110"
      style={{ background: C.mocha, color: C.cream, fontFamily: F.serif }}>
      {children}
    </a>
  );
}
function Wave({ fill, flip = false }: { fill: string; flip?: boolean }) {
  return (
    <div className="relative w-full leading-[0]" style={{ marginTop: flip ? -1 : 0, marginBottom: flip ? 0 : -1 }} aria-hidden>
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="block w-full" style={{ height: 42, transform: flip ? 'rotate(180deg)' : 'none' }}>
        <path d="M0,30 C 280,54 520,10 760,30 C 1000,50 1220,14 1440,32 L1440,60 L0,60 Z" fill={fill} />
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

export default function Euforia({ data }: { data: DolceVitaContent }) {
  const { days, hours, mins, secs } = useCountdown(data.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const C = resolveEuforiaTheme(data.theme);

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
  const cd = [{ v: days, l: 'Días' }, { v: hours, l: 'Hrs' }, { v: mins, l: 'Mins' }, { v: secs, l: 'Segs.' }];

  return (
    <ThemeCtx.Provider value={C}>
    <div className="relative w-full overflow-x-hidden" style={{ background: C.paper, color: C.ink, fontFamily: F.body }}>
      <style>{`@keyframes efSpin{to{transform:rotate(360deg)}} @keyframes efFade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {data.musicUrl && <audio ref={audioRef} src={data.musicUrl} loop />}
      {data.musicUrl && (<button onClick={toggleMusic} className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
        style={{ background: C.paper, color: C.gold, border: `1px solid ${C.gold}` }} aria-label="Música">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ animation: playing ? 'efSpin 4s linear infinite' : 'none' }}>
          <path d="M9 17a3 3 0 11-2-2.83V5l11-2v10.17A3 3 0 1116 14V7L9 8.4V17z" />
        </svg>
      </button>)}

      {/* ════════ PORTADA ════════ */}
      <section className="relative md:grid md:min-h-screen md:grid-cols-2">
        <div className="relative overflow-hidden h-[42vh] md:h-auto">
          {data.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover ek-kenburns" />
          )}
        </div>
        <div className="relative flex flex-col items-center justify-center overflow-hidden px-8 py-16 text-center" style={{ background: C.paper }}>
          <PastelLeaves className="pointer-events-none absolute right-0 bottom-2 w-40 opacity-60" />
          <div className="relative z-10" style={{ animation: 'efFade 1.1s ease' }}>
            <p className="mx-auto max-w-sm italic" style={{ fontFamily: F.serif, fontSize: TYPE.body, lineHeight: 1.6, color: C.ink }}>{data.introMessage}</p>
            <div className="mt-6"><LeafWreath>
              <Script style={{ fontSize: 'clamp(42px,9vw,62px)', color: C.gold }}><WriteOn>{data.groom}</WriteOn></Script>
              <p style={{ fontFamily: F.serif, color: C.gold, fontSize: '24px' }}>&amp;</p>
              <Script style={{ fontSize: 'clamp(42px,9vw,62px)', color: C.gold }}><WriteOn delay={450}>{data.bride}</WriteOn></Script>
            </LeafWreath></div>
          </div>
        </div>
      </section>

      {/* ════════ ¡NOS CASAMOS! + INVITADO (mocha) ════════ */}
      <section className={`px-6 ${SECTION.tight} text-center`} style={{ background: C.paper }}>
        <Caps style={{ fontSize: 'clamp(28px,6vw,42px)', color: C.mochaDeep }}>¡Nos casamos!</Caps>
      </section>
      <Wave fill={C.mocha} />
      <section className={`relative px-6 ${SECTION.tight} text-center`} style={{ background: C.mocha, color: C.cream }}>
        <Reveal className="mx-auto max-w-xl">
          <p style={{ fontFamily: F.serif, fontSize: TYPE.body }}>Su presencia es el regalo más valioso que podemos recibir</p>
          {data.guestName && <Script className="mt-4" style={{ fontSize: '40px', color: C.cream }}>{data.guestName}</Script>}
          <p style={{ fontSize: '15px' }}>Hemos reservado:</p>
          {data.guestPasses && <Script style={{ fontSize: '36px', color: C.cream }}>{data.guestPasses}</Script>}
          <p style={{ fontSize: '13px' }}>en su honor</p>
        </Reveal>
      </section>
      <Wave fill={C.mocha} flip />

      {/* ════════ FECHA (en línea) + COUNTDOWN ════════ */}
      <section className={`relative overflow-hidden px-6 ${SECTION.tight} text-center`} style={{ background: C.paper }}>
        <PastelLeaves className="pointer-events-none absolute right-0 bottom-6 w-40 opacity-40" />
        <Reveal className="relative z-10 mx-auto max-w-2xl">
          <div className="mb-5 flex justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill={C.mocha}><path d="M12 21C6 17 2 13.5 2 8.8 2 5.4 4.7 3 7.7 3 9.5 3 11 3.9 12 5.3 13 3.9 14.5 3 16.3 3 19.3 3 22 5.4 22 8.8 22 13.5 18 17 12 21z" /></svg></div>
          <div className="flex items-center justify-center gap-5">
            <Caps style={{ fontSize: '15px', color: C.ink }}>{data.dateWeekday}</Caps>
            <span style={{ width: 1, height: 56, background: C.mocha }} />
            <span style={{ fontFamily: F.serif, fontSize: 'clamp(48px,11vw,72px)', fontWeight: 600, lineHeight: 1, color: C.mochaDeep }}>{data.dateDay}</span>
            <span style={{ width: 1, height: 56, background: C.mocha }} />
            <Caps style={{ fontSize: '15px', color: C.ink }}>{data.ceremonyReligious.time}</Caps>
          </div>
          <Caps className="mt-3" style={{ fontSize: '13px', color: C.gold }}>{data.dateCity}, {data.dateMonth}, {data.dateYear}</Caps>

          <p className="mt-8 italic" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink }}>Faltan</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <Flourish className="hidden w-24 sm:block" />
            <div className="flex gap-4">
              {cd.map(c => (
                <div key={c.l}>
                  <p style={{ fontFamily: F.serif, fontSize: 'clamp(24px,6vw,34px)', fontWeight: 600, lineHeight: 1, color: C.mochaDeep }}><Odometer value={c.v} /></p>
                  <p className="text-[12px]" style={{ color: C.gold }}>{c.l}</p>
                </div>
              ))}
            </div>
            <Flourish className="hidden w-24 scale-x-[-1] sm:block" />
          </div>
          <div className="mt-6"><MochaBtn href={gcal}><CalIcon />Agendar el evento</MochaBtn></div>
        </Reveal>
      </section>

      {/* ════════ CEREMONIA + DRESS CODE + ITINERARIO ════════ */}
      <section className={`relative overflow-hidden px-6 ${SECTION.tight}`} style={{ background: C.paper }}>
        <PastelLeaves className="pointer-events-none absolute left-0 top-10 w-36 opacity-30" style={{ transform: 'scaleX(-1)' }} />
        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="grid gap-10 sm:grid-cols-2">
            {[
              { icon: 'church', title: 'Ceremonia Religiosa', c: data.ceremonyReligious },
              ...(data.reception ? [{ icon: 'camera', title: 'Recepción Social', c: data.reception }] : []),
            ].map((b, i) => (
              <Reveal key={b.title} className="flex flex-col items-center text-center">
                <EventIcon name={b.icon} className="mb-2 h-12 w-12" stroke={C.gold} custom={data} sec={i === 0 ? 'ceremony' : 'reception'} />
                <Caps style={{ fontSize: '14px', color: C.mochaDeep }}>{b.title}</Caps>
                <div className="mt-2 flex items-center justify-center gap-2" style={{ fontSize: '15px', color: C.ink }}>
                  <span className="font-semibold">{b.c.time}</span>
                  <span style={{ width: 1, height: 30, background: C.line }} />
                  <span className="max-w-[140px] text-left" style={{ color: C.gold }}>{b.c.place}</span>
                </div>
                <div className="mt-4"><MochaBtn href={b.c.maps}>Ver ubicación</MochaBtn></div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 flex flex-col items-center text-center">
            <EventIcon name="dress" className="mb-1 h-12 w-12" stroke={C.gold} custom={data} sec="dress" />
            <Caps style={{ fontSize: '14px', color: C.mochaDeep }}>Código de vestimenta</Caps>
            <p style={{ fontSize: TYPE.body, color: C.ink }}>{data.dressCode}</p>
          </Reveal>

          <Reveal className="mt-12">
            <Script className="text-center" style={{ fontSize: '40px' }}>Itinerario</Script>
            <div className="mt-8 grid grid-cols-2 gap-y-8 sm:grid-cols-4 lg:grid-cols-7">
              {data.itinerary.map((it, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <EventIcon name={it.icon ?? 'rings'} className="h-10 w-10" stroke={C.gold} custom={data} lottieColors={it.iconColors} speed={it.iconSpeed} />
                  <span className="my-2 block h-px w-12" style={{ background: C.line }} />
                  <p className="text-[12px]" style={{ fontFamily: F.serif, color: C.ink }}>{it.label}</p>
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

      {/* ════════ SOLO ADULTOS + GALERÍA (2 tarjetas) ════════ */}
      <section className={`px-6 ${SECTION.tight}`} style={{ background: C.paper }}>
        <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
          <Reveal className="rounded-2xl px-6 py-8 text-center" style={{ border: `1px solid ${C.line}` }}>
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full" style={{ border: `1px solid ${C.gold}` }}>
              <BabyNo color={C.gold} className="h-9 w-9" />
            </div>
            <Script style={{ fontSize: '34px' }}>Solo Adultos</Script>
            <p className="mt-2" style={{ fontFamily: F.serif, fontSize: '14px', color: C.ink, lineHeight: 1.5 }}>{data.noKids}</p>
          </Reveal>
          <Reveal delay={100} className="flex flex-col items-center rounded-2xl px-6 py-8 text-center" style={{ border: `1px solid ${C.line}` }}>
            <EventIcon name="camera" className="mb-3 h-11 w-11" stroke={C.gold} custom={data} sec="gallery" />
            <p style={{ fontFamily: F.serif, fontSize: '14px', color: C.ink, lineHeight: 1.5 }}>{data.galleryMsg}</p>
            <div className="mt-4"><MochaBtn href={data.galleryUrl}>Compartir fotografías</MochaBtn></div>
          </Reveal>
        </div>
      </section>

      {/* ════════ HOSPEDAJE ════════ */}
      {data.lodging.length > 0 && (
        <section className={`px-6 ${SECTION.tight}`} style={{ background: C.paper }}>
          <Reveal className="mx-auto max-w-3xl rounded-3xl p-6" style={{ background: C.mocha, color: C.cream }}>
            <Script className="text-center" style={{ fontSize: '32px', color: C.cream }}>{data.lodgingTitle ?? 'Sugerencia de hospedaje'}</Script>
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
        </section>
      )}

      {/* ════════ REGALO (mocha) ════════ */}
      <Wave fill={C.mocha} />
      <section className={`relative px-6 ${SECTION.base} text-center`} style={{ background: C.mocha, color: C.cream }}>
        <Reveal className="mx-auto max-w-3xl">
          <EventIcon name="gift" className="mx-auto mb-3 h-12 w-12" stroke={C.cream} custom={data} sec="gift" />
          <Script style={{ fontSize: '42px', color: C.cream }}>Sugerencia de Regalo</Script>
          <p className="mx-auto mt-3 max-w-xl" style={{ fontFamily: F.serif, fontSize: TYPE.body, lineHeight: 1.6 }}>{data.giftMessage}</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {data.giftCash && (
              <div className="flex flex-col items-center justify-center rounded-2xl px-5 py-8" style={{ border: `1px solid ${C.cream}` }}>
                <EnvelopeMoney color={C.cream} className="mb-4 h-12 w-14" />
                <Script style={{ fontSize: '24px', color: C.cream }}>{data.giftCash}</Script>
              </div>
            )}
            {data.giftBank && (
              <div className="flex flex-col items-center justify-center rounded-2xl px-5 py-7" style={{ border: `1px solid ${C.cream}` }}>
                <Caps style={{ fontSize: '13px', color: C.cream }}>{data.giftBank.bank}</Caps>
                <p style={{ fontFamily: F.serif, fontSize: TYPE.body }}>{data.giftBank.account}</p>
                <p style={{ fontFamily: F.serif, fontSize: TYPE.body }}>{data.giftBank.holder}</p>
                {data.giftQrUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.giftQrUrl} alt="QR" className="mt-3 h-32 w-32 rounded-lg bg-white p-2" />
                )}
              </div>
            )}
            {data.giftOther && (
              <div className="flex flex-col items-center justify-center rounded-2xl px-5 py-8" style={{ border: `1px solid ${C.cream}` }}>
                <Caps style={{ fontSize: '14px', color: C.cream }}>{data.giftOther}</Caps>
              </div>
            )}
          </div>
        </Reveal>
      </section>
      <Wave fill={C.mocha} flip />

      {/* ════════ CONFIRMACIÓN ════════ */}
      <section className={`px-6 ${SECTION.base} text-center`} style={{ background: C.paper }}>
        <Reveal className="mx-auto max-w-xl">
          <Script style={{ fontSize: '44px' }}>{data.rsvpClosing ?? 'Confirmar asistencia'}</Script>
          <p className="mx-auto mt-3 max-w-md" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink, lineHeight: 1.5 }}>Es muy importante para nosotros confirmar tu asistencia.</p>
          <div className="mt-5"><MochaBtn href={data.whatsapp}>Confirmar asistencia</MochaBtn></div>
        </Reveal>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="py-9 text-center" style={{ background: C.mochaDeep, color: C.cream }}>
        <Script style={{ fontSize: '34px', color: C.cream }}>Enkarta</Script>
        <p className="mt-1" style={{ fontFamily: F.serif, fontSize: '14px', opacity: 0.85 }}>
          ¿Deseas una invitación para tu evento? <a href={ENKARTA_WA_URL} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}>Contáctanos</a>
        </p>
      </footer>
    </div>
    </ThemeCtx.Provider>
  );
}
