'use client';

import { useEffect, useRef, useState, useContext, createContext } from 'react';
import { DolceVitaContent, TemplateTheme } from './types';
import { useCountdown, Odometer, Reveal, EventIcon, MasonryGallery, CalIcon, SECTION, TYPE, ENKARTA_WA_URL } from './shared';
import { WriteOn } from '@/lib/scroll-motion';

// ── Paleta por defecto (carmesí / vino + dorado + crema) ──────────────────────────
const DEFAULT_C = {
  paper: '#f6efe3',       // crema cálida
  crimson: '#871a2f',     // vino (bandas / botones)
  crimsonDeep: '#6d1424',
  gold: '#b3924f',        // dorado (script / ornamentos)
  goldSoft: '#d4b87a',
  ink: '#4a3733',         // texto
  cream: '#f6efe3',       // texto sobre vino
  rose: '#a8324c',        // rosas
  pink: '#c98a99',
  line: 'rgba(179,146,79,0.7)',
};
type CRPalette = typeof DEFAULT_C;

const ThemeCtx = createContext<CRPalette>(DEFAULT_C);
const useC = () => useContext(ThemeCtx);

function resolveCarmesiTheme(t?: TemplateTheme): CRPalette {
  return {
    paper:       t?.bg          || DEFAULT_C.paper,
    crimson:     t?.primary     || DEFAULT_C.crimson,
    crimsonDeep: t?.primaryDeep || DEFAULT_C.crimsonDeep,
    gold:        DEFAULT_C.gold,
    goldSoft:    DEFAULT_C.goldSoft,
    ink:         t?.text        || DEFAULT_C.ink,
    cream:       t?.onPrimary   || DEFAULT_C.cream,
    rose:        DEFAULT_C.rose,
    pink:        DEFAULT_C.pink,
    line:        t?.line        || DEFAULT_C.line,
  };
}

const F = {
  script: "'Great Vibes', cursive",
  serif: "'Cormorant Garamond', serif",
  body: "'Cormorant Garamond', serif",
};

// ── Ramita de rosas (acuarela aproximada) ─────────────────────────────────────────
function RoseCluster({ className, style, scale = 1 }: { className?: string; style?: React.CSSProperties; scale?: number }) {
  const C = useC();
  const rose = (x: number, y: number, r: number, fill: string) => (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={fill} />
      <circle r={r * 0.66} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={r * 0.13} />
      <circle r={r * 0.34} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={r * 0.1} />
    </g>
  );
  const leaf = (x: number, y: number, rot: number) => (
    <ellipse cx={x} cy={y} rx="10" ry="4.5" transform={`rotate(${rot} ${x} ${y})`} fill="#5c7a4a" opacity="0.75" />
  );
  return (
    <svg viewBox="0 0 120 90" className={className} style={{ transform: `scale(${scale})`, ...style }} aria-hidden>
      {leaf(20, 50, -30)}{leaf(96, 44, 28)}{leaf(60, 22, 4)}{leaf(38, 30, -50)}{leaf(82, 64, 40)}
      {rose(34, 48, 16, C.rose)}
      {rose(64, 40, 19, C.crimsonDeep)}
      {rose(88, 56, 14, C.pink)}
      {rose(50, 64, 12, C.rose)}
    </svg>
  );
}

// ── Corona dorada con rosas (portada) ─────────────────────────────────────────────
function Wreath({ children }: { children: React.ReactNode }) {
  const C = useC();
  return (
    <div className="relative mx-auto flex items-center justify-center" style={{ width: 'min(78vw,340px)', height: 'min(78vw,340px)' }}>
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" fill="none" aria-hidden>
        <circle cx="100" cy="100" r="86" stroke={C.gold} strokeWidth="1.6" />
        <circle cx="100" cy="100" r="80" stroke={C.gold} strokeWidth="0.7" opacity="0.5" />
      </svg>
      <RoseCluster className="absolute" style={{ left: '-6%', bottom: '4%', width: 130 }} />
      <RoseCluster className="absolute" style={{ right: '-6%', bottom: '-2%', width: 150, transform: 'scaleX(-1)' }} />
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
      <circle cx="100" cy="12" r="1.4" fill={c} stroke="none" />
    </svg>
  );
}
function CrimsonBtn({ children, href }: { children: React.ReactNode; href: string }) {
  const C = useC();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-7 py-2.5 text-[12px] tracking-[0.12em] uppercase transition-all duration-300 hover:brightness-110"
      style={{ background: C.crimson, color: C.cream, borderRadius: '2px 18px 2px 18px', fontFamily: F.serif }}>
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

export default function Carmesi({ data }: { data: DolceVitaContent }) {
  const { days, hours, mins, secs } = useCountdown(data.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const C = resolveCarmesiTheme(data.theme);

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
  const cd = [{ v: days, l: 'Días' }, { v: hours, l: 'Horas' }, { v: mins, l: 'Min.' }, { v: secs, l: 'Seg.' }];

  return (
    <ThemeCtx.Provider value={C}>
    <div className="relative w-full overflow-x-hidden" style={{ background: C.paper, color: C.ink, fontFamily: F.body }}>
      <style>{`@keyframes crSpin{to{transform:rotate(360deg)}} @keyframes crFade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {data.musicUrl && <audio ref={audioRef} src={data.musicUrl} loop />}
      {data.musicUrl && (<button onClick={toggleMusic} className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
        style={{ background: C.crimson, color: C.gold, border: `1px solid ${C.gold}` }} aria-label="Música">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ animation: playing ? 'crSpin 4s linear infinite' : 'none' }}>
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
          <div className="relative z-10" style={{ animation: 'crFade 1.1s ease' }}>
            <p className="mx-auto max-w-sm italic" style={{ fontFamily: F.serif, fontSize: TYPE.body, lineHeight: 1.6, color: C.ink }}>{data.introMessage}</p>
            <Flourish className="mx-auto my-6 w-40" />
            <Wreath>
              <Script style={{ fontSize: 'clamp(40px,9vw,60px)', color: C.crimson }}><WriteOn>{data.groom}</WriteOn></Script>
              <p style={{ fontFamily: F.serif, color: C.crimson, fontSize: '24px' }}>&amp;</p>
              <Script style={{ fontSize: 'clamp(40px,9vw,60px)', color: C.crimson }}><WriteOn delay={450}>{data.bride}</WriteOn></Script>
            </Wreath>
          </div>
        </div>
      </section>

      {/* ════════ INVITADO (vino) ════════ */}
      <Wave fill={C.crimson} />
      <section className={`relative px-6 ${SECTION.tight} text-center`} style={{ background: C.crimson, color: C.cream }}>
        <Reveal className="mx-auto max-w-xl">
          <Caps style={{ fontSize: 'clamp(14px,2.4vw,18px)', color: C.cream }}>Bienvenidos a la invitación<br />de nuestra boda</Caps>
          {data.guestName && <Script className="mt-6" style={{ fontSize: '42px', color: C.gold }}>{data.guestName}</Script>}
          <p style={{ fontSize: '15px' }}>Hemos reservado:</p>
          {data.guestPasses && <Script style={{ fontSize: '36px', color: C.gold }}>{data.guestPasses}</Script>}
          <p style={{ fontSize: '14px' }}>en su honor</p>
        </Reveal>
      </section>
      <Wave fill={C.crimson} flip />

      {/* ════════ FECHA + COUNTDOWN ════════ */}
      <section className={`px-6 ${SECTION.base} text-center`} style={{ background: C.paper }}>
        <Reveal className="mx-auto max-w-2xl">
          <div className="flex items-center justify-center gap-2">
            <span className="hidden h-px flex-1 sm:block" style={{ background: C.crimson, maxWidth: 90 }} />
            <span className="hidden text-[13px] tracking-[0.16em] sm:block" style={{ fontFamily: F.serif, textTransform: 'uppercase', color: C.ink }}>{data.dateWeekday}</span>
            <div className="relative mx-2 flex flex-col items-center justify-center" style={{ width: 130, height: 168, border: `1.5px solid ${C.crimson}`, borderRadius: '50%' }}>
              <span className="text-[12px] tracking-[0.12em]" style={{ fontFamily: F.serif, textTransform: 'uppercase', color: C.crimson }}>{data.dateCity}</span>
              <span style={{ fontFamily: F.serif, fontSize: 64, fontWeight: 600, lineHeight: 1, color: C.crimson }}>{data.dateDay}</span>
              <span className="text-[13px]" style={{ fontFamily: F.serif, color: C.crimson }}>{data.dateYear}</span>
            </div>
            <span className="hidden text-[13px] tracking-[0.16em] sm:block" style={{ fontFamily: F.serif, textTransform: 'uppercase', color: C.ink }}>{data.dateMonth}</span>
            <span className="hidden h-px flex-1 sm:block" style={{ background: C.crimson, maxWidth: 90 }} />
          </div>
          <p className="mt-2 text-[13px] tracking-[0.16em] sm:hidden" style={{ fontFamily: F.serif, textTransform: 'uppercase', color: C.ink }}>{data.dateWeekday} · {data.dateMonth}</p>

          <p className="mt-8 italic" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.gold }}>Solo faltan</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <Flourish className="hidden w-24 sm:block" />
            <div className="flex gap-4">
              {cd.map(c => (
                <div key={c.l}>
                  <p style={{ fontFamily: F.serif, fontSize: 'clamp(26px,6vw,36px)', fontWeight: 600, lineHeight: 1, color: C.crimson }}><Odometer value={c.v} /></p>
                  <p className="text-[12px]" style={{ color: C.ink }}>{c.l}</p>
                </div>
              ))}
            </div>
            <Flourish className="hidden w-24 scale-x-[-1] sm:block" />
          </div>
          <div className="mt-7"><CrimsonBtn href={gcal}><CalIcon />Agendar el evento</CrimsonBtn></div>
          <RoseCluster className="mx-auto mt-8 w-28" />
        </Reveal>
      </section>

      {/* ════════ PADRES ════════ */}
      <section className="px-6 pb-10 text-center" style={{ background: C.paper }}>
        <Reveal>
          <Caps style={{ fontSize: 'clamp(14px,2.4vw,19px)', color: C.gold }}>Con la bendición de Dios y de nuestros padres</Caps>
          <div className="mx-auto mt-8 grid max-w-3xl gap-8 sm:grid-cols-2">
            {[{ t: 'Padres del Novio', p: data.parentsGroom }, { t: 'Padres de la Novia', p: data.parentsBride }].map(col => (
              <div key={col.t}>
                <Caps style={{ fontSize: '14px', color: C.gold }}>{col.t}</Caps>
                <div className="mt-2 space-y-1" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink }}>{col.p.map((n, i) => <p key={i}>{n}</p>)}</div>
              </div>
            ))}
          </div>
          <RoseCluster className="mx-auto mt-8 w-28" />
        </Reveal>
      </section>

      {/* ════════ CEREMONIA + DRESS CODE + ITINERARIO ════════ */}
      <section className={`px-6 ${SECTION.tight}`} style={{ background: C.paper }}>
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-10 sm:grid-cols-3">
            {[
              { icon: 'church', title: 'Ceremonia Religiosa', c: data.ceremonyReligious },
              ...(data.ceremonyCivil ? [{ icon: 'rings', title: 'Ceremonia Civil', c: data.ceremonyCivil }] : []),
              ...(data.reception ? [{ icon: 'camera', title: 'Recepción Social', c: data.reception }] : []),
            ].map((b, i) => (
              <Reveal key={b.title} className="flex flex-col items-center text-center">
                <EventIcon name={b.icon} className="mb-2 h-12 w-12" stroke={C.crimson} custom={data} sec={i === 0 ? 'ceremony' : 'reception'} />
                <Caps style={{ fontSize: '15px', color: C.gold }}>{b.title}</Caps>
                <div className="mt-2 flex items-center justify-center gap-2" style={{ fontSize: '15px', color: C.ink }}>
                  <span className="font-semibold">{b.c.time}</span>
                  <span style={{ width: 1, height: 30, background: C.crimson }} />
                  <span className="max-w-[120px] text-left">{b.c.place}</span>
                </div>
                <div className="mt-4"><CrimsonBtn href={b.c.maps}>Ver ubicación</CrimsonBtn></div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 flex flex-col items-center text-center">
            <EventIcon name="dress" className="mb-1 h-12 w-12" stroke={C.crimson} custom={data} sec="dress" />
            <Caps style={{ fontSize: '15px', color: C.gold }}>Código de vestimenta</Caps>
            <p style={{ fontSize: TYPE.body, color: C.ink }}>{data.dressCode}</p>
          </Reveal>

          <RoseCluster className="mx-auto my-8 w-28" />

          <Reveal>
            <Script className="text-center" style={{ fontSize: '40px', color: C.crimson }}>Itinerario</Script>
            <div className="mt-8 grid grid-cols-2 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
              {data.itinerary.map((it, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <EventIcon name={it.icon ?? 'rings'} className="h-11 w-11" stroke={C.gold} custom={data} lottieColors={it.iconColors} speed={it.iconSpeed} />
                  <span className="my-1 block h-px w-12" style={{ background: C.line }} />
                  <p className="text-[12px]" style={{ color: C.ink }}>{it.label}</p>
                  <p style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.crimson }}>{it.time}</p>
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
            <Script style={{ fontSize: '44px', color: C.crimson }}>Nosotros</Script>
            <MasonryGallery images={data.galleryImages} className="mt-8" />
          </Reveal>
        </section>
      )}

      {/* ════════ HOSPEDAJE + GALERÍA ════════ */}
      <section className={`px-6 ${SECTION.tight}`} style={{ background: C.paper }}>
        <div className="mx-auto max-w-3xl">
          {data.lodging.length > 0 && (
            <Reveal className="rounded-sm px-6 py-8 text-center" style={{ border: `1px solid ${C.line}` }}>
              <Caps style={{ fontSize: '15px', color: C.gold }}>{data.lodgingTitle ?? 'Sugerencia de hospedaje'}</Caps>
              <p className="mx-auto mt-4 max-w-md" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink, lineHeight: 1.5 }}>{data.lodging[0].desc}</p>
              <div className="mt-5"><CrimsonBtn href="#">Descuento especial</CrimsonBtn></div>
              {data.lodgingContact && <p className="mt-3" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink }}>{data.lodgingContact}</p>}
            </Reveal>
          )}
          <Reveal className="mt-10 text-center">
            <div className="mx-auto max-w-md rounded-sm px-6 py-8" style={{ border: `1px solid ${C.line}` }}>
              <EventIcon name="camera" className="mx-auto mb-3 h-11 w-11" stroke={C.crimson} custom={data} sec="gallery" />
              <p style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink, lineHeight: 1.6 }}>{data.galleryMsg}</p>
              <div className="mt-5"><CrimsonBtn href={data.galleryUrl}>Compartir fotografías</CrimsonBtn></div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════ SOLO ADULTOS ════════ */}
      <section className={`px-6 ${SECTION.tight} text-center`} style={{ background: C.paper }}>
        <Reveal className="mx-auto max-w-xl">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full" style={{ border: `1px solid ${C.crimson}` }}>
            <BabyNo color={C.crimson} className="h-12 w-12" />
          </div>
          <Script style={{ fontSize: '40px', color: C.crimson }}>Solo Adultos</Script>
          <p className="mt-2" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink, lineHeight: 1.6 }}>{data.noKids}</p>
        </Reveal>
      </section>

      {/* ════════ REGALO (vino) ════════ */}
      <Wave fill={C.crimson} />
      <section className={`relative px-6 ${SECTION.base} text-center`} style={{ background: C.crimson, color: C.cream }}>
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
      <Wave fill={C.crimson} flip />

      {/* ════════ CONFIRMACIÓN ════════ */}
      <section className={`px-6 ${SECTION.base} text-center`} style={{ background: C.paper }}>
        <Reveal className="mx-auto max-w-xl">
          <Script style={{ fontSize: '44px', color: C.crimson }}>{data.rsvpClosing ?? 'Confirmar asistencia'}</Script>
          <p className="mx-auto mt-3 max-w-md" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink, lineHeight: 1.5 }}>Es muy importante para nosotros confirmar tu asistencia.</p>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.6" className="mx-auto my-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 14l6 6 6-6" />
          </svg>
          <CrimsonBtn href={data.whatsapp}>Confirmar asistencia</CrimsonBtn>
        </Reveal>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="py-9 text-center" style={{ background: C.crimsonDeep, color: C.cream }}>
        <Script style={{ fontSize: '34px', color: C.gold }}>Enkarta</Script>
        <p className="mt-1" style={{ fontFamily: F.serif, fontSize: '14px', opacity: 0.85 }}>
          ¿Deseas una invitación para tu evento? <a href={ENKARTA_WA_URL} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: C.gold, textDecoration: 'underline', textUnderlineOffset: 3 }}>Contáctanos</a>
        </p>
      </footer>
    </div>
    </ThemeCtx.Provider>
  );
}
