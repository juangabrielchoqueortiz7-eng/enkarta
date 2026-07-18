'use client';

import { useEffect, useRef, useState, useContext, createContext } from 'react';
import { DolceVitaContent, TemplateTheme } from './types';
import { useCountdown, Odometer, Reveal, EventIcon, MasonryGallery, CalIcon, SECTION, TYPE, ENKARTA_WA_URL } from './shared';
import { WriteOn } from '@/lib/scroll-motion';

// ── Paleta por defecto ──────────────────────────────────────────────────────────
const DEFAULT_C = {
  paper: '#fbfaf3',      // marfil base
  green: '#33563a',      // verde bosque (bandas)
  greenSoft: '#4f7a52',  // verde de script/títulos sobre claro
  gold: '#c2a368',       // dorado (acentos sobre verde)
  ink: '#3b3b35',        // texto sobre claro
  cream: '#f1eedf',      // texto/script sobre verde
  line: 'rgba(194,163,104,0.7)',
};
type DVPalette = typeof DEFAULT_C;

const ThemeCtx = createContext<DVPalette>(DEFAULT_C);
const useC = () => useContext(ThemeCtx);

function resolveDolceVitaTheme(t?: TemplateTheme): DVPalette {
  return {
    paper:     t?.bg          || DEFAULT_C.paper,
    green:     t?.primaryDeep || DEFAULT_C.green,
    greenSoft: t?.primary     || DEFAULT_C.greenSoft,
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

// ── Ramita botánica (acuarela aproximada) ─────────────────────────────────────────
function LeafSprig({ className, style, mono }: { className?: string; style?: React.CSSProperties; mono?: boolean }) {
  const C = useC();
  const g = C.greenSoft, gold = mono ? C.greenSoft : C.gold;
  const leaf = (x: number, y: number, rx: number, ry: number, rot: number, fill: string, o: number) => (
    <ellipse cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${rot} ${x} ${y})`} fill={fill} opacity={o} />
  );
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} aria-hidden>
      <path d="M178 18 C 130 50, 95 95, 60 160" stroke={g} strokeWidth="1.4" fill="none" opacity="0.55" />
      <path d="M178 18 C 150 40, 138 80, 150 130" stroke={gold} strokeWidth="1.2" fill="none" opacity="0.5" />
      {leaf(168, 30, 16, 7, -38, g, 0.6)}
      {leaf(150, 50, 18, 8, -30, gold, 0.55)}
      {leaf(135, 72, 17, 7.5, -24, g, 0.6)}
      {leaf(118, 96, 18, 8, -18, gold, 0.5)}
      {leaf(100, 118, 17, 7.5, -10, g, 0.6)}
      {leaf(84, 138, 16, 7, -4, gold, 0.5)}
      {leaf(70, 156, 14, 6.5, 4, g, 0.55)}
      {leaf(158, 40, 12, 5.5, 60, g, 0.45)}
      {leaf(140, 64, 13, 6, 66, gold, 0.4)}
      {leaf(122, 88, 13, 6, 70, g, 0.45)}
      {leaf(104, 112, 12, 5.5, 74, gold, 0.4)}
    </svg>
  );
}

// ── Flourish dorado (divisor ornamental) ──────────────────────────────────────────
function Flourish({ className = '', color }: { className?: string; color?: string }) {
  const C = useC();
  const c = color || C.gold;
  return (
    <svg viewBox="0 0 200 24" className={className} fill="none" stroke={c} strokeWidth="1.1" aria-hidden>
      <path d="M40 12 H 90" strokeLinecap="round" />
      <path d="M160 12 H 110" strokeLinecap="round" />
      <path d="M90 12 C 96 12, 96 6, 100 6 C 104 6, 104 12, 100 12 C 96 12, 96 18, 100 18 C 104 18, 104 12, 110 12" strokeLinecap="round" />
      <path d="M40 12 C 34 12, 34 7, 30 8M160 12 C 166 12, 166 7, 170 8" strokeLinecap="round" />
      <circle cx="100" cy="12" r="1.4" fill={c} stroke="none" />
    </svg>
  );
}

// ── Botón hoja (verde, esquinas en punta) ─────────────────────────────────────────
function LeafBtn({ children, href }: { children: React.ReactNode; href: string }) {
  const C = useC();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-7 py-2.5 text-[12px] tracking-[0.12em] uppercase transition-all duration-300 hover:brightness-110"
      style={{ background: C.green, color: C.cream, borderRadius: '2px 16px 2px 16px', fontFamily: F.serif }}>
      {children}
    </a>
  );
}

// ── Tipografías ──────────────────────────────────────────────────────────────────
function Script({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return <p className={className} style={{ fontFamily: F.script, color: C.greenSoft, lineHeight: 1, ...style }}>{children}</p>;
}
function Caps({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <h3 className={className} style={{ fontFamily: F.serif, letterSpacing: '0.16em', textTransform: 'uppercase', lineHeight: 1.5, fontWeight: 500, ...style }}>{children}</h3>;
}

// ── Ola divisoria ──────────────────────────────────────────────────────────────────
function Wave({ fill, flip = false }: { fill: string; flip?: boolean }) {
  return (
    <div className="relative w-full leading-[0]" style={{ marginTop: flip ? -1 : 0, marginBottom: flip ? 0 : -1 }} aria-hidden>
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="block w-full" style={{ height: 44, transform: flip ? 'rotate(180deg)' : 'none' }}>
        <path d="M0,28 C 320,58 560,6 760,28 C 980,52 1220,12 1440,34 L1440,60 L0,60 Z" fill={fill} />
      </svg>
    </div>
  );
}

// ── Iconos de línea propios ─────────────────────────────────────────────────────────
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
      <path d="M32 22v10M29.5 24.5c0-1.4 1.1-2 2.5-2s2.5.8 2.5 2-1.1 1.7-2.5 1.7-2.5.6-2.5 2 1.1 2 2.5 2 2.5-.6 2.5-2" />
    </svg>
  );
}

export default function DolceVita({ data }: { data: DolceVitaContent }) {
  const { days, hours, mins, secs } = useCountdown(data.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const C = resolveDolceVitaTheme(data.theme);

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
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Boda ${data.bride} & ${data.groom}`)}&dates=${s}/${s}`;
  })();
  const cd = [{ v: days, l: 'Días' }, { v: hours, l: 'Hrs' }, { v: mins, l: 'Mins' }, { v: secs, l: 'Segs' }];

  return (
    <ThemeCtx.Provider value={C}>
    <div className="relative w-full overflow-x-hidden" style={{ background: C.paper, color: C.ink, fontFamily: F.body }}>
      <style>{`@keyframes dvSpin{to{transform:rotate(360deg)}} @keyframes dvFade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {data.musicUrl && <audio ref={audioRef} src={data.musicUrl} loop />}
      {data.musicUrl && (<button onClick={toggleMusic} className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
        style={{ background: C.paper, color: C.greenSoft, border: `1px solid ${C.greenSoft}` }} aria-label="Música">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ animation: playing ? 'dvSpin 4s linear infinite' : 'none' }}>
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
        <div className="relative flex flex-col items-center justify-center px-8 py-16 text-center" style={{ background: C.paper }}>
          <LeafSprig className="pointer-events-none absolute -right-2 -top-2 w-40" />
          <LeafSprig className="pointer-events-none absolute -left-6 bottom-2 w-24 opacity-60" style={{ transform: 'scaleX(-1) rotate(20deg)' }} />
          <div className="relative z-10" style={{ animation: 'dvFade 1.1s ease' }}>
            <Caps style={{ fontSize: 'clamp(13px,2vw,16px)', color: C.greenSoft }}>Tenemos el honor<br />de invitarte a nuestra boda</Caps>
            <Script className="mt-7" style={{ fontSize: TYPE.display }}><WriteOn>{data.groom}</WriteOn></Script>
            <p style={{ fontFamily: F.serif, color: C.greenSoft, fontSize: '26px' }}>&amp;</p>
            <Script style={{ fontSize: TYPE.display }}><WriteOn delay={450}>{data.bride}</WriteOn></Script>
            <Caps className="mt-7" style={{ fontSize: '13px', color: C.greenSoft }}>¡Nos casamos!</Caps>
          </div>
        </div>
      </section>

      {/* ════════ FECHA + COUNTDOWN ════════ */}
      <section className={`relative overflow-hidden px-6 ${SECTION.base} text-center`} style={{ background: C.paper }}>
        <LeafSprig className="pointer-events-none absolute left-0 top-10 w-44 opacity-25" mono style={{ transform: 'scaleX(-1)' }} />
        <LeafSprig className="pointer-events-none absolute right-0 bottom-10 w-44 opacity-25" />
        <Reveal className="relative z-10 mx-auto max-w-2xl">
          {/* Marco ovalado de fecha */}
          <div className="flex items-center justify-center gap-2">
            <span className="hidden h-px flex-1 sm:block" style={{ background: C.greenSoft, maxWidth: 90 }} />
            <span className="hidden text-[13px] tracking-[0.16em] sm:block" style={{ fontFamily: F.serif, textTransform: 'uppercase', color: C.ink }}>{data.dateWeekday}</span>
            <div className="relative mx-2 flex flex-col items-center justify-center" style={{ width: 130, height: 168, border: `1.5px solid ${C.greenSoft}`, borderRadius: '50%' }}>
              <span className="text-[12px] tracking-[0.12em]" style={{ fontFamily: F.serif, textTransform: 'uppercase', color: C.greenSoft }}>{data.dateCity}</span>
              <span style={{ fontFamily: F.serif, fontSize: 64, fontWeight: 600, lineHeight: 1, color: C.gold }}>{data.dateDay}</span>
              <span className="text-[13px]" style={{ fontFamily: F.serif, color: C.ink }}>{data.dateYear}</span>
            </div>
            <span className="hidden text-[13px] tracking-[0.16em] sm:block" style={{ fontFamily: F.serif, textTransform: 'uppercase', color: C.ink }}>{data.dateMonth}</span>
            <span className="hidden h-px flex-1 sm:block" style={{ background: C.greenSoft, maxWidth: 90 }} />
          </div>
          <p className="mt-2 text-[13px] tracking-[0.16em] sm:hidden" style={{ fontFamily: F.serif, textTransform: 'uppercase', color: C.ink }}>{data.dateWeekday} · {data.dateMonth}</p>

          {/* Countdown con flourishes */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <Flourish className="hidden w-24 sm:block" />
            <div className="flex gap-4">
              {cd.map(c => (
                <div key={c.l}>
                  <p style={{ fontFamily: F.serif, fontSize: 'clamp(26px,6vw,36px)', fontWeight: 600, lineHeight: 1, color: C.ink }}><Odometer value={c.v} /></p>
                  <p className="text-[12px]" style={{ color: C.greenSoft }}>{c.l}</p>
                </div>
              ))}
            </div>
            <Flourish className="hidden w-24 scale-x-[-1] sm:block" />
          </div>
          <div className="mt-7"><LeafBtn href={gcal}><CalIcon />Agendar el evento</LeafBtn></div>
        </Reveal>
      </section>

      {/* ════════ INTRO + INVITADO (verde) ════════ */}
      <Wave fill={C.green} />
      <section className={`relative px-6 ${SECTION.base} text-center`} style={{ background: C.green, color: C.cream }}>
        <Reveal className="mx-auto max-w-2xl">
          <p className="mx-auto max-w-xl italic" style={{ fontFamily: F.serif, fontSize: TYPE.lead, lineHeight: 1.7 }}>{data.introMessage}</p>
          <div className="mx-auto my-6 flex max-w-xs items-center justify-center gap-3"><span className="h-px flex-1" style={{ background: C.gold }} /><span style={{ color: C.gold }}>♥</span><span className="h-px flex-1" style={{ background: C.gold }} /></div>
          {data.guestName && <Script style={{ fontSize: '40px', color: C.gold }}>{data.guestName}</Script>}
          {data.guestPasses && (
            <div className="mt-1">
              <p style={{ fontSize: '15px' }}>Hemos reservado:</p>
              <Script style={{ fontSize: '36px', color: C.gold }}>{data.guestPasses}</Script>
              <p style={{ fontSize: '14px' }}>en su honor</p>
            </div>
          )}
        </Reveal>
      </section>
      <Wave fill={C.green} flip />

      {/* ════════ PADRES + PADRINOS ════════ */}
      <section className={`relative overflow-hidden px-6 ${SECTION.base} text-center`} style={{ background: C.paper }}>
        <LeafSprig className="pointer-events-none absolute right-0 top-1/3 w-40 opacity-25" />
        <Reveal className="relative z-10">
          <Caps style={{ fontSize: 'clamp(15px,2.4vw,20px)', color: C.greenSoft }}>{data.blessing}</Caps>
          <div className="mx-auto mt-10 grid max-w-4xl gap-8 sm:grid-cols-3">
            {[{ t: 'Padres del Novio', p: data.parentsGroom }, { t: 'Padres de la Novia', p: data.parentsBride }, { t: 'Padrinos', p: data.padrinos }].map(col => (
              col.p.length > 0 && (
                <div key={col.t}>
                  <Script style={{ fontSize: '30px' }}>{col.t}</Script>
                  <div className="mt-2 space-y-1" style={{ fontSize: '17px', color: C.ink }}>{col.p.map((n, i) => <p key={i}>{n}</p>)}</div>
                </div>
              )
            ))}
          </div>
        </Reveal>
      </section>

      {/* ════════ CEREMONIA + DRESS CODE + ITINERARIO ════════ */}
      <section className={`relative overflow-hidden px-6 ${SECTION.base}`} style={{ background: C.paper }}>
        <LeafSprig className="pointer-events-none absolute left-0 top-8 w-40 opacity-25" style={{ transform: 'scaleX(-1)' }} />
        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="grid gap-10 sm:grid-cols-3">
            {[
              { icon: 'church', title: 'Ceremonia Religiosa', c: data.ceremonyReligious },
              ...(data.ceremonyCivil ? [{ icon: 'rings', title: 'Ceremonia Civil', c: data.ceremonyCivil }] : []),
              ...(data.reception ? [{ icon: 'gift', title: 'Recepción Social', c: data.reception }] : []),
            ].map((b, i) => (
              <Reveal key={b.title} className="flex flex-col items-center text-center">
                <EventIcon name={b.icon} className="mb-2 h-12 w-12" stroke={C.greenSoft} custom={data} sec={i === 0 ? 'ceremony' : 'reception'} />
                <Script style={{ fontSize: '28px' }}>{b.title}</Script>
                <div className="mt-2 flex items-center justify-center gap-2" style={{ fontSize: '15px', color: C.ink }}>
                  <span className="font-semibold">{b.c.time}</span>
                  <span style={{ width: 1, height: 28, background: C.line }} />
                  <span className="max-w-[130px] text-left">{b.c.place}</span>
                </div>
                <div className="mt-4"><LeafBtn href={b.c.maps}>Ver ubicación</LeafBtn></div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 flex flex-col items-center text-center">
            <EventIcon name="dress" className="mb-1 h-12 w-12" stroke={C.greenSoft} custom={data} sec="dress" />
            <Script style={{ fontSize: '28px' }}>Dress Code</Script>
            <p style={{ fontSize: TYPE.body, color: C.ink }}>{data.dressCode}</p>
          </Reveal>

          <Flourish className="mx-auto my-10 w-40" />

          <Reveal>
            <Script className="text-center" style={{ fontSize: '40px' }}>Itinerario</Script>
            <div className="mt-8 grid grid-cols-2 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
              {data.itinerary.map((it, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <EventIcon name={it.icon ?? 'rings'} className="h-11 w-11" stroke={C.gold} custom={data} lottieColors={it.iconColors} speed={it.iconSpeed} />
                  <p className="mt-2 text-[13px]" style={{ color: C.ink }}>{it.label}</p>
                  <span className="my-1 block h-px w-12" style={{ background: C.line }} />
                  <p style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.gold }}>{it.time}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════ NOSOTROS (collage polaroid) ════════ */}
      {data.galleryImages.length > 0 && (
        <section className={`relative overflow-hidden px-6 ${SECTION.base}`} style={{ background: C.paper }}>
          <LeafSprig className="pointer-events-none absolute right-0 top-0 w-44 opacity-25" />
          <Reveal className="relative z-10 mx-auto max-w-4xl">
            <Script className="text-center" style={{ fontSize: '44px' }}>Nosotros</Script>
            <MasonryGallery images={data.galleryImages} className="mt-8" />
          </Reveal>
        </section>
      )}

      {/* ════════ HOSPEDAJE + GALERÍA ════════ */}
      <section className={`relative overflow-hidden px-6 ${SECTION.base}`} style={{ background: C.paper }}>
        <div className="relative z-10 mx-auto max-w-3xl">
          {data.lodging.length > 0 && (
            <Reveal className="rounded-3xl p-6" style={{ background: C.green, color: C.cream }}>
              <Script className="text-center" style={{ fontSize: '34px', color: C.gold }}>{data.lodgingTitle ?? 'Sugerencia de hospedaje'}</Script>
              <div className="mt-4 grid items-center gap-5 sm:grid-cols-2">
                <div className="overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={data.lodging[0].image} alt="" className="h-52 w-full object-cover" />
                </div>
                <div className="text-center sm:text-left">
                  <p style={{ fontFamily: F.serif, fontSize: TYPE.body, lineHeight: 1.5 }}>{data.lodging[0].desc}</p>
                  <a href="#" className="mt-4 inline-block rounded-md px-6 py-2.5 text-[12px] tracking-[0.1em] uppercase" style={{ background: C.cream, color: C.green, fontFamily: F.serif }}>Descuento especial</a>
                  {data.lodgingContact && <p className="mt-3" style={{ fontFamily: F.serif, fontSize: TYPE.body }}>{data.lodgingContact}</p>}
                </div>
              </div>
            </Reveal>
          )}

          <Reveal className="mt-12 text-center">
            <Caps className="mx-auto max-w-lg" style={{ fontSize: 'clamp(15px,2.4vw,19px)', color: C.greenSoft }}>La fiesta comenzará puntualmente, y queremos que disfrutes con nosotros de cada detalle. ¡Te agradeceríamos que llegues a tiempo!</Caps>
            <div className="mx-auto mt-8 max-w-md rounded-3xl px-6 py-8 text-center" style={{ border: `1px solid ${C.line}` }}>
              <EventIcon name="camera" className="mx-auto mb-3 h-11 w-11" stroke={C.greenSoft} custom={data} sec="gallery" />
              <p style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink, lineHeight: 1.6 }}>{data.galleryMsg}</p>
              <div className="mt-5"><LeafBtn href={data.galleryUrl}>Compartir fotografías</LeafBtn></div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════ SOLO ADULTOS ════════ */}
      <section className={`relative overflow-hidden px-6 ${SECTION.base} text-center`} style={{ background: C.paper }}>
        <Reveal className="mx-auto max-w-xl">
          <Flourish className="mx-auto mb-6 w-40" />
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full" style={{ border: `1px solid ${C.greenSoft}` }}>
            <BabyNo color={C.greenSoft} className="h-12 w-12" />
          </div>
          <p style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink, lineHeight: 1.6 }}>{data.noKids}</p>
        </Reveal>
      </section>

      {/* ════════ REGALO (verde) ════════ */}
      <Wave fill={C.green} />
      <section className={`relative px-6 ${SECTION.base} text-center`} style={{ background: C.green, color: C.cream }}>
        <Reveal className="mx-auto max-w-3xl">
          <EventIcon name="gift" className="mx-auto mb-3 h-12 w-12" stroke={C.gold} custom={data} sec="gift" />
          <Script style={{ fontSize: '40px', color: C.gold }}>Sugerencia de Regalo</Script>
          <p className="mx-auto mt-3 max-w-xl" style={{ fontFamily: F.serif, fontSize: TYPE.body, lineHeight: 1.6 }}>{data.giftMessage}</p>
          {data.giftThanks && <p className="mt-4 italic" style={{ fontFamily: F.serif, fontSize: TYPE.body }}>{data.giftThanks}</p>}
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {data.giftCash && (
              <div className="flex flex-col items-center justify-center rounded-2xl px-5 py-8" style={{ border: `1px solid ${C.gold}` }}>
                <EnvelopeMoney color={C.cream} className="mb-4 h-12 w-14" />
                <Script style={{ fontSize: '24px', color: C.gold }}>{data.giftCash}</Script>
              </div>
            )}
            {data.giftBank && (
              <div className="flex flex-col items-center justify-center rounded-2xl px-5 py-7" style={{ border: `1px solid ${C.gold}` }}>
                <Script style={{ fontSize: '24px', color: C.gold }}>{data.giftBank.bank}</Script>
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
                <Script style={{ fontSize: '24px', color: C.gold }}>{data.giftOther}</Script>
              </div>
            )}
          </div>
        </Reveal>
      </section>
      <Wave fill={C.green} flip />

      {/* ════════ CONFIRMACIÓN ════════ */}
      <section className={`relative overflow-hidden px-6 ${SECTION.base} text-center`} style={{ background: C.paper }}>
        <LeafSprig className="pointer-events-none absolute -left-4 bottom-0 w-44" style={{ transform: 'scaleX(-1) rotate(10deg)' }} />
        <Reveal className="relative z-10 mx-auto max-w-xl">
          <Caps style={{ fontSize: 'clamp(18px,3vw,26px)', color: C.ink }}>{data.rsvpClosing}</Caps>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.6" className="mx-auto my-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 14l6 6 6-6" />
          </svg>
          <LeafBtn href={data.whatsapp}>Confirmar asistencia</LeafBtn>
        </Reveal>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="relative overflow-hidden py-9 text-center" style={{ background: '#141512', color: C.cream }}>
        <Script style={{ fontSize: '34px', color: C.gold }}>Enkarta</Script>
        <p className="mt-1" style={{ fontFamily: F.serif, fontSize: '14px', opacity: 0.8 }}>
          ¿Deseas una invitación para tu evento? <a href={ENKARTA_WA_URL} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: C.gold, textDecoration: 'underline', textUnderlineOffset: 3 }}>Contáctanos</a>
        </p>
      </footer>
    </div>
    </ThemeCtx.Provider>
  );
}
