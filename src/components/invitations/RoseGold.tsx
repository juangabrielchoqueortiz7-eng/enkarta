'use client';

import { useEffect, useRef, useState, useContext, createContext } from 'react';
import { DolceVitaContent, TemplateTheme } from './types';
import { useCountdown, Odometer, Reveal, EventIcon, MasonryGallery, CalIcon, SECTION, TYPE, ENKARTA_WA_URL } from './shared';
import { WriteOn } from '@/lib/scroll-motion';

// ── Paleta por defecto (blush/durazno + rosa-dorado + crema) ──────────────────────
const DEFAULT_C = {
  paper: '#fdf6f1',
  peach: '#f8ddcf',       // banda durazno suave
  peachDeep: '#f0c4b2',
  rose: '#b97f86',        // rosa-dorado (script / títulos)
  gold: '#c2a06a',        // pampas dorada
  ink: '#7a6157',         // texto cálido
  bandText: '#9a6e72',    // texto sobre durazno
  line: 'rgba(185,127,134,0.5)',
};
type RGPalette = typeof DEFAULT_C;

const ThemeCtx = createContext<RGPalette>(DEFAULT_C);
const useC = () => useContext(ThemeCtx);

function resolveRoseGoldTheme(t?: TemplateTheme): RGPalette {
  return {
    paper:     t?.bg          || DEFAULT_C.paper,
    peach:     t?.primaryDeep || DEFAULT_C.peach,
    peachDeep: DEFAULT_C.peachDeep,
    rose:      t?.primary     || DEFAULT_C.rose,
    gold:      DEFAULT_C.gold,
    ink:       t?.text        || DEFAULT_C.ink,
    bandText:  t?.onPrimary   || DEFAULT_C.bandText,
    line:      t?.line        || DEFAULT_C.line,
  };
}

const F = {
  script: "'Great Vibes', cursive",
  serif: "'Cormorant Garamond', serif",
  body: "'Cormorant Garamond', serif",
};

// ── Floral blush (rosas rosa-dorado + pampas dorada) ──────────────────────────────
function BlushFloral({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const C = useC();
  const rose = (x: number, y: number, r: number, fill: string) => (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={fill} opacity="0.85" />
      <circle r={r * 0.62} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={r * 0.12} />
    </g>
  );
  return (
    <svg viewBox="0 0 160 220" className={className} style={style} aria-hidden>
      <path d="M120 8 C 112 64, 98 120, 70 180" stroke={C.gold} strokeWidth="1.2" fill="none" opacity="0.6" />
      <path d="M140 18 C 134 74, 120 130, 96 186" stroke={C.gold} strokeWidth="1" fill="none" opacity="0.5" />
      {Array.from({ length: 10 }).map((_, i) => {
        const t = i / 9; const x = 120 - t * 50; const y = 12 + t * 168;
        return <path key={i} d={`M${x} ${y} l 11 -5M${x} ${y} l 11 5`} stroke={C.gold} strokeWidth="0.9" opacity={0.5} />;
      })}
      <ellipse cx="60" cy="130" rx="14" ry="5" transform="rotate(-30 60 130)" fill="#c9a98e" opacity="0.55" />
      <ellipse cx="96" cy="160" rx="14" ry="5" transform="rotate(20 96 160)" fill="#c9a98e" opacity="0.5" />
      {rose(64, 100, 22, C.rose)}
      {rose(98, 126, 18, C.peachDeep)}
      {rose(50, 140, 14, '#e3b8ad')}
      {rose(110, 100, 13, '#e3b8ad')}
    </svg>
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
    </svg>
  );
}
function PeachBtn({ children, href }: { children: React.ReactNode; href: string }) {
  const C = useC();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-7 py-2.5 text-[12px] tracking-[0.08em] transition-all duration-300 hover:brightness-105"
      style={{ background: C.peach, color: C.rose, borderRadius: '3px 18px 3px 18px', fontFamily: F.serif }}>
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
function Heart({ color }: { color: string }) {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill={color} aria-hidden><path d="M12 21C6 17 2 13.5 2 8.8 2 5.4 4.7 3 7.7 3 9.5 3 11 3.9 12 5.3 13 3.9 14.5 3 16.3 3 19.3 3 22 5.4 22 8.8 22 13.5 18 17 12 21z" /></svg>;
}
function BabyNo({ color, className = '' }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="26" /><path d="M14 14 50 50" />
      <circle cx="28" cy="26" r="3" /><path d="M22 34c0 5 4 9 9 9 3 0 5-1 7-3M24 40l-5 6M36 42l4 5" />
    </svg>
  );
}

export default function RoseGold({ data }: { data: DolceVitaContent }) {
  const { days, hours, mins, secs } = useCountdown(data.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const C = resolveRoseGoldTheme(data.theme);

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

  return (
    <ThemeCtx.Provider value={C}>
    <div className="relative w-full overflow-x-hidden" style={{ background: C.paper, color: C.ink, fontFamily: F.body }}>
      <style>{`@keyframes rgSpin{to{transform:rotate(360deg)}} @keyframes rgFade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {data.musicUrl && <audio ref={audioRef} src={data.musicUrl} loop />}
      {data.musicUrl && (<button onClick={toggleMusic} className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
        style={{ background: C.peach, color: C.rose, border: `1px solid ${C.rose}` }} aria-label="Música">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ animation: playing ? 'rgSpin 4s linear infinite' : 'none' }}>
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
          <BlushFloral className="pointer-events-none absolute -right-2 top-6 w-36" />
          <div className="relative z-10" style={{ animation: 'rgFade 1.1s ease' }}>
            <Script style={{ fontSize: TYPE.display }}><WriteOn>{data.bride}</WriteOn></Script>
            <p style={{ fontFamily: F.serif, color: C.gold, fontSize: '24px' }}>&amp;</p>
            <Script style={{ fontSize: TYPE.display }}><WriteOn delay={450}>{data.groom}</WriteOn></Script>
            <Caps className="mt-7" style={{ fontSize: '14px', color: C.rose }}>¡Nos casamos!</Caps>
            <p className="mx-auto mt-3 max-w-sm" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink, lineHeight: 1.6 }}>{data.introMessage}</p>
          </div>
        </div>
      </section>

      {/* ════════ INVITADO (durazno) ════════ */}
      <Wave fill={C.peach} />
      <section className={`relative px-6 ${SECTION.tight} text-center`} style={{ background: C.peach, color: C.bandText }}>
        <Reveal className="mx-auto max-w-xl">
          <p style={{ fontFamily: F.serif, fontSize: TYPE.body }}>Su presencia es el regalo más valioso que podemos recibir</p>
          <div className="mx-auto my-3 flex max-w-xs items-center justify-center gap-3"><span className="h-px flex-1" style={{ background: C.rose, opacity: 0.5 }} /><Heart color={C.rose} /><span className="h-px flex-1" style={{ background: C.rose, opacity: 0.5 }} /></div>
          {data.guestPasses && <Script style={{ fontSize: '40px' }}>{data.guestPasses}</Script>}
          <p style={{ fontSize: '14px' }}>Hemos reservado:</p>
          {data.guestName && <Script style={{ fontSize: '38px' }}>{data.guestName}</Script>}
          <p style={{ fontSize: '13px' }}>en su honor</p>
        </Reveal>
      </section>
      <Wave fill={C.peach} flip />

      {/* ════════ PADRES ════════ */}
      <section className="relative overflow-hidden px-6 pt-10 pb-4 text-center" style={{ background: C.paper }}>
        <BlushFloral className="pointer-events-none absolute -left-6 top-1/3 w-32 opacity-50" style={{ transform: 'scaleX(-1)' }} />
        <Reveal className="relative z-10">
          <Script style={{ fontSize: '32px' }}>Con la bendición de Dios y de nuestros padres</Script>
          <div className="mx-auto mt-8 grid max-w-3xl gap-8 sm:grid-cols-2">
            {[{ t: 'Padres de la Novia', p: data.parentsBride }, { t: 'Padres del Novio', p: data.parentsGroom }].map(col => (
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

      {/* ════════ FECHA OVAL + COUNTDOWN ════════ */}
      <section className={`relative overflow-hidden px-6 ${SECTION.tight} text-center`} style={{ background: C.paper }}>
        <BlushFloral className="pointer-events-none absolute right-0 top-6 w-32 opacity-50" />
        <Reveal className="relative z-10 mx-auto max-w-2xl">
          <div className="flex items-center justify-center gap-2">
            <span className="hidden h-px flex-1 sm:block" style={{ background: C.rose, opacity: 0.5, maxWidth: 90 }} />
            <span className="hidden text-[13px] tracking-[0.16em] sm:block" style={{ fontFamily: F.serif, textTransform: 'uppercase', color: C.ink }}>{data.dateWeekday}</span>
            <div className="relative mx-2 flex flex-col items-center justify-center" style={{ width: 124, height: 158, border: `1.5px solid ${C.rose}`, borderRadius: '50%' }}>
              <span className="text-[12px] tracking-[0.12em]" style={{ fontFamily: F.serif, textTransform: 'uppercase', color: C.rose }}>{data.dateCity}</span>
              <span style={{ fontFamily: F.serif, fontSize: 58, fontWeight: 600, lineHeight: 1, color: C.rose }}>{data.dateDay}</span>
              <span className="text-[13px]" style={{ fontFamily: F.serif, color: C.rose }}>{data.dateYear}</span>
            </div>
            <span className="hidden text-[13px] tracking-[0.16em] sm:block" style={{ fontFamily: F.serif, textTransform: 'uppercase', color: C.ink }}>{data.dateMonth}</span>
            <span className="hidden h-px flex-1 sm:block" style={{ background: C.rose, opacity: 0.5, maxWidth: 90 }} />
          </div>
          <p className="mt-6 italic" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink }}>Faltan</p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <Flourish className="hidden w-24 sm:block" />
            <div className="flex gap-4">
              {cd.map(c => (
                <div key={c.l}>
                  <p style={{ fontFamily: F.serif, fontSize: 'clamp(24px,6vw,34px)', fontWeight: 600, lineHeight: 1, color: C.rose }}><Odometer value={c.v} /></p>
                  <p className="text-[12px]" style={{ color: C.ink }}>{c.l}</p>
                </div>
              ))}
            </div>
            <Flourish className="hidden w-24 scale-x-[-1] sm:block" />
          </div>
          <div className="mt-6"><PeachBtn href={gcal}><CalIcon />Agendar el Evento</PeachBtn></div>
        </Reveal>
      </section>

      {/* ════════ CEREMONIA + DRESS CODE + ITINERARIO ════════ */}
      <section className={`px-6 ${SECTION.tight}`} style={{ background: C.paper }}>
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-10 sm:grid-cols-2">
            {[
              { icon: 'church', title: 'Ceremonia Religiosa', c: data.ceremonyReligious },
              ...(data.reception ? [{ icon: 'camera', title: 'Recepción Social', c: data.reception }] : []),
            ].map((b, i) => (
              <Reveal key={b.title} className="flex flex-col items-center text-center">
                <EventIcon name={b.icon} className="mb-2 h-12 w-12" stroke={C.rose} custom={data} sec={i === 0 ? 'ceremony' : 'reception'} />
                <Caps style={{ fontSize: '14px', color: C.ink }}>{b.title}</Caps>
                <div className="mt-2 flex items-center justify-center gap-2" style={{ fontSize: '15px', color: C.ink }}>
                  <span className="font-semibold">{b.c.time}</span>
                  <span style={{ width: 1, height: 30, background: C.line }} />
                  <span className="max-w-[150px] text-left" style={{ color: C.rose }}>{b.c.place}</span>
                </div>
                <div className="mt-4"><PeachBtn href={b.c.maps}>Ver Ubicación</PeachBtn></div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 flex flex-col items-center text-center">
            <EventIcon name="dress" className="mb-1 h-12 w-12" stroke={C.rose} custom={data} sec="dress" />
            <Caps style={{ fontSize: '14px', color: C.ink }}>Código de vestimenta</Caps>
            <p style={{ fontSize: TYPE.body, color: C.ink }}>{data.dressCode}</p>
          </Reveal>

          <Flourish className="mx-auto my-9 w-40" />

          <Reveal>
            <Script className="text-center" style={{ fontSize: '40px' }}>Itinerario</Script>
            <div className="mt-8 grid grid-cols-2 gap-y-8 sm:grid-cols-4 lg:grid-cols-7">
              {data.itinerary.map((it, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <EventIcon name={it.icon ?? 'rings'} className="h-10 w-10" stroke={C.rose} custom={data} lottieColors={it.iconColors} speed={it.iconSpeed} />
                  <span className="my-2 block h-px w-12" style={{ background: C.line }} />
                  <p style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.rose }}>{it.time}</p>
                  <p className="text-[12px]" style={{ fontFamily: F.serif, color: C.ink }}>{it.label}</p>
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

      {/* ════════ AGRADECIMIENTO ════════ */}
      <section className={`px-6 ${SECTION.tight}`} style={{ background: C.paper }}>
        <Reveal className="mx-auto max-w-xl rounded-3xl px-7 py-8 text-center" style={{ border: `1px solid ${C.rose}` }}>
          <EventIcon name="dance" className="mx-auto mb-2 h-10 w-10" stroke={C.rose} custom={data} sec="thanks" />
          <Script style={{ fontSize: '40px' }}>Agradecimiento</Script>
          <p className="mx-auto mt-3 max-w-md" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink, lineHeight: 1.6 }}>
            {data.thanksMessage ?? 'A Dios, a nuestros padres y a nuestros padrinos por su apoyo incondicional.'}
          </p>
        </Reveal>
      </section>

      {/* ════════ REGALO (durazno) ════════ */}
      <Wave fill={C.peach} />
      <section className={`relative px-6 ${SECTION.base} text-center`} style={{ background: C.peach, color: C.bandText }}>
        <Reveal className="mx-auto max-w-2xl">
          <EventIcon name="gift" className="mx-auto mb-3 h-12 w-12" stroke={C.rose} custom={data} sec="gift" />
          <Script style={{ fontSize: '42px' }}>Sugerencia de Regalo</Script>
          <p className="mx-auto mt-3 max-w-xl" style={{ fontFamily: F.serif, fontSize: TYPE.body, lineHeight: 1.6 }}>{data.giftMessage}</p>
          {data.giftQrUrl && (
            <div className="mx-auto mt-6 max-w-md rounded-2xl px-6 py-7" style={{ border: `1px solid ${C.rose}` }}>
              <Caps style={{ fontSize: '14px', color: C.rose }}>Transferencia QR</Caps>
              <span className="my-3 block h-px w-3/4 mx-auto" style={{ background: C.line }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.giftQrUrl} alt="QR" className="mx-auto h-40 w-40 rounded-lg bg-white p-2" />
            </div>
          )}
        </Reveal>
      </section>
      <Wave fill={C.peach} flip />

      {/* ════════ SOLO ADULTOS + GALERÍA ════════ */}
      <section className={`px-6 ${SECTION.tight}`} style={{ background: C.paper }}>
        <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
          <Reveal className="rounded-2xl px-6 py-8 text-center" style={{ border: `1px solid ${C.line}` }}>
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full" style={{ border: `1px solid ${C.rose}` }}>
              <BabyNo color={C.rose} className="h-9 w-9" />
            </div>
            <Script style={{ fontSize: '32px' }}>Solo Adultos</Script>
            <p className="mt-2" style={{ fontFamily: F.serif, fontSize: '14px', color: C.ink, lineHeight: 1.5 }}>{data.noKids}</p>
          </Reveal>
          <Reveal delay={100} className="flex flex-col items-center rounded-2xl px-6 py-8 text-center" style={{ border: `1px solid ${C.line}` }}>
            <EventIcon name="camera" className="mb-3 h-11 w-11" stroke={C.rose} custom={data} sec="gallery" />
            <p style={{ fontFamily: F.serif, fontSize: '14px', color: C.ink, lineHeight: 1.5 }}>{data.galleryMsg}</p>
            <div className="mt-4"><PeachBtn href={data.galleryUrl}>Compartir fotografías</PeachBtn></div>
          </Reveal>
        </div>
      </section>

      {/* ════════ CONFIRMACIÓN ════════ */}
      <section className={`px-6 ${SECTION.base} text-center`} style={{ background: C.paper }}>
        <Reveal className="mx-auto max-w-xl">
          <Script style={{ fontSize: '44px' }}>{data.rsvpClosing ?? 'Confirmar asistencia'}</Script>
          <p className="mx-auto mt-3 max-w-md" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink, lineHeight: 1.5 }}>Es muy importante para nosotros confirmar tu asistencia.</p>
          <div className="mt-5"><PeachBtn href={data.whatsapp}>Confirmar asistencia</PeachBtn></div>
        </Reveal>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="py-9 text-center" style={{ background: C.peachDeep, color: C.bandText }}>
        <Script style={{ fontSize: '34px', color: C.rose }}>Enkarta</Script>
        <p className="mt-1" style={{ fontFamily: F.serif, fontSize: '14px' }}>
          ¿Deseas una invitación para tu evento? <a href={ENKARTA_WA_URL} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: C.rose, textDecoration: 'underline', textUnderlineOffset: 3 }}>Contáctanos</a>
        </p>
      </footer>
    </div>
    </ThemeCtx.Provider>
  );
}
