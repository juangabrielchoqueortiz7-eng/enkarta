'use client';

import { useEffect, useRef, useState, useContext, createContext } from 'react';
import { DolceVitaContent, TemplateTheme } from './types';
import { useCountdown, Odometer, Reveal, EventIcon, MasonryGallery, SECTION, TYPE } from './shared';
import { CascadeText } from '@/lib/scroll-motion';

// ── Paleta por defecto (salvia + blanco minimalista) ──────────────────────────────
const DEFAULT_C = {
  paper: '#fbfbf8',
  sage: '#8c9a86',        // banda / botones
  sageDeep: '#6f7d69',
  ink: '#3a3a34',         // texto
  soft: '#7a7a72',
  cream: '#f2f4ee',       // texto sobre salvia
  line: '#d3d3cb',
};
type ALPalette = typeof DEFAULT_C;

const ThemeCtx = createContext<ALPalette>(DEFAULT_C);
const useC = () => useContext(ThemeCtx);

function resolveAllegriaTheme(t?: TemplateTheme): ALPalette {
  return {
    paper:    t?.bg          || DEFAULT_C.paper,
    sage:     t?.primary     || DEFAULT_C.sage,
    sageDeep: t?.primaryDeep || DEFAULT_C.sageDeep,
    ink:      t?.text        || DEFAULT_C.ink,
    soft:     t?.muted       || DEFAULT_C.soft,
    cream:    t?.onPrimary   || DEFAULT_C.cream,
    line:     t?.line        || DEFAULT_C.line,
  };
}

const F = {
  caps: "'Cinzel', serif",
  script: "'Great Vibes', cursive",
  serif: "'Cormorant Garamond', serif",
  body: "'Cormorant Garamond', serif",
};

function Caps({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <h3 className={className} style={{ fontFamily: F.serif, letterSpacing: '0.18em', textTransform: 'uppercase', lineHeight: 1.5, fontWeight: 500, ...style }}>{children}</h3>;
}
function Script({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return <p className={className} style={{ fontFamily: F.script, color: C.sageDeep, lineHeight: 1, ...style }}>{children}</p>;
}
function Heart({ color, size = 14 }: { color: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden><path d="M12 21C6 17 2 13.5 2 8.8 2 5.4 4.7 3 7.7 3 9.5 3 11 3.9 12 5.3 13 3.9 14.5 3 16.3 3 19.3 3 22 5.4 22 8.8 22 13.5 18 17 12 21z" /></svg>;
}
function SageBtn({ children, href }: { children: React.ReactNode; href: string }) {
  const C = useC();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full px-8 py-2.5 text-[11px] tracking-[0.16em] uppercase transition-all duration-300 hover:brightness-110"
      style={{ background: C.sage, color: C.cream, fontFamily: F.serif }}>
      {children}
    </a>
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

export default function Allegria({ data }: { data: DolceVitaContent }) {
  const { days, hours, mins, secs } = useCountdown(data.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const C = resolveAllegriaTheme(data.theme);

  useEffect(() => {
    document.body.style.background = C.paper;
    return () => { document.body.style.background = ''; };
  }, [C.paper]);

  const toggleMusic = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); } else a.play().then(() => setPlaying(true)).catch(() => {});
  };
  const cd = [{ v: days, l: 'Días' }, { v: hours, l: 'Hrs.' }, { v: mins, l: 'Mins.' }, { v: secs, l: 'Segs.' }];
  const polaroidImg = data.galleryImages[0] || data.coverImage;

  return (
    <ThemeCtx.Provider value={C}>
    <div className="relative w-full overflow-x-hidden" style={{ background: C.paper, color: C.ink, fontFamily: F.body }}>
      <style>{`@keyframes alSpin{to{transform:rotate(360deg)}} @keyframes alFade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {data.musicUrl && <audio ref={audioRef} src={data.musicUrl} loop />}
      {data.musicUrl && (<button onClick={toggleMusic} className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
        style={{ background: C.paper, color: C.sage, border: `1px solid ${C.sage}` }} aria-label="Música">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ animation: playing ? 'alSpin 4s linear infinite' : 'none' }}>
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
        <div className="relative flex flex-col items-center justify-center px-8 py-16 text-center" style={{ background: C.paper }}>
          <div className="relative z-10" style={{ animation: 'alFade 1.1s ease' }}>
            <Caps style={{ fontSize: 'clamp(12px,2vw,15px)', color: C.soft }}>Bienvenidos a la invitación<br />de nuestra boda</Caps>
            <div className="my-5 flex justify-center"><Heart color={C.sage} size={18} /></div>
            <h1 style={{ fontFamily: F.caps, fontSize: 'clamp(34px,7vw,52px)', letterSpacing: '0.06em', color: C.ink }}><CascadeText text={data.bride} /></h1>
            <div className="mx-auto my-3 flex max-w-xs items-center justify-center gap-3"><span className="h-px flex-1" style={{ background: C.ink, opacity: 0.4 }} /><span className="text-[11px] tracking-[0.2em]" style={{ color: C.soft }}>Y</span><span className="h-px flex-1" style={{ background: C.ink, opacity: 0.4 }} /></div>
            <h1 style={{ fontFamily: F.caps, fontSize: 'clamp(34px,7vw,52px)', letterSpacing: '0.06em', color: C.ink }}><CascadeText text={data.groom} delay={420} /></h1>
          </div>
        </div>
      </section>

      {/* ════════ INVITADO (salvia) ════════ */}
      <section className={`px-6 ${SECTION.tight} text-center`} style={{ background: C.sage, color: C.cream }}>
        <Reveal className="mx-auto max-w-2xl">
          <Caps style={{ fontSize: 'clamp(12px,2vw,14px)', color: C.cream }}>{data.introMessage}</Caps>
          {data.guestName && <Script className="mt-6" style={{ fontSize: '40px', color: C.cream }}>{data.guestName}</Script>}
          <p style={{ fontFamily: F.serif, fontSize: TYPE.body }}>Hemos reservado:</p>
          {data.guestPasses && <Script style={{ fontSize: '36px', color: C.cream }}>{data.guestPasses}</Script>}
          <p style={{ fontFamily: F.serif, fontSize: '13px' }}>en su honor</p>
        </Reveal>
      </section>

      {/* ════════ FECHA (en línea) + ¡NOS CASAMOS! ════════ */}
      <section className={`px-6 ${SECTION.tight} text-center`} style={{ background: C.paper }}>
        <Reveal className="mx-auto max-w-2xl">
          <div className="flex items-stretch justify-center gap-4">
            <div className="flex flex-1 items-center justify-end" style={{ maxWidth: 150 }}>
              <span className="h-px w-full" style={{ background: C.ink, opacity: 0.4 }} />
              <Caps className="ml-3 whitespace-nowrap" style={{ fontSize: '15px', color: C.ink }}>{data.dateWeekday}</Caps>
            </div>
            <div className="flex flex-col items-center">
              <Caps style={{ fontSize: '12px', color: C.soft }}>{data.dateCity}</Caps>
              <span style={{ fontFamily: F.caps, fontSize: 'clamp(44px,10vw,64px)', fontWeight: 600, lineHeight: 1, color: C.ink }}>{data.dateDay}</span>
              <span style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.ink }}>{data.dateYear}</span>
            </div>
            <div className="flex flex-1 items-center" style={{ maxWidth: 150 }}>
              <Caps className="mr-3 whitespace-nowrap" style={{ fontSize: '15px', color: C.ink }}>{data.dateMonth}</Caps>
              <span className="h-px w-full" style={{ background: C.ink, opacity: 0.4 }} />
            </div>
          </div>

          <Caps className="mt-10" style={{ fontSize: 'clamp(13px,2vw,16px)', color: C.sageDeep }}>¡Nos casamos!</Caps>
          <Caps className="mx-auto mt-2 max-w-lg" style={{ fontSize: '12px', color: C.soft, letterSpacing: '0.1em' }}>Con gran ilusión, queremos invitarte a ser parte de esta hermosa etapa de nuestro amor.</Caps>

          {/* Ceremonia / Recepción */}
          <div className="mx-auto mt-10 grid max-w-2xl gap-10 sm:grid-cols-2">
            {[
              { icon: 'rings', title: 'Ceremonia Civil', c: data.ceremonyReligious },
              ...(data.reception ? [{ icon: 'camera', title: 'Recepción Social', c: data.reception }] : []),
            ].map((b, i) => (
              <div key={b.title} className="flex flex-col items-center text-center">
                <EventIcon name={b.icon} className="mb-2 h-12 w-12" stroke={C.sage} custom={data} sec={i === 0 ? 'ceremony' : 'reception'} />
                <Caps style={{ fontSize: '14px', color: C.ink }}>{b.title}</Caps>
                <div className="mt-2 flex items-center justify-center gap-2" style={{ fontSize: '15px', color: C.ink }}>
                  <span className="font-semibold">{b.c.time}</span>
                  <span style={{ width: 1, height: 28, background: C.line }} />
                  <span className="max-w-[120px] text-left" style={{ color: C.soft }}>{b.c.place}</span>
                </div>
                <div className="mt-4"><SageBtn href={b.c.maps}>Ver ubicación</SageBtn></div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ════════ CÓDIGO DE VESTIMENTA + COUNTDOWN (polaroid) ════════ */}
      <section className={`px-6 ${SECTION.tight} text-center`} style={{ background: C.paper }}>
        <Reveal className="mx-auto max-w-2xl">
          <EventIcon name="dress" className="mx-auto mb-2 h-12 w-12" stroke={C.sage} custom={data} sec="dress" />
          <Caps style={{ fontSize: '15px', color: C.ink }}>Código de vestimenta</Caps>
          <p className="mx-auto mt-3 max-w-xl" style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.soft, lineHeight: 1.6 }}>{data.dressCode}</p>

          {/* Countdown dentro de polaroid inclinada */}
          <div className="mt-10 flex justify-center">
            <div className="bg-white p-3 pb-6 shadow-xl" style={{ width: 'min(78vw,300px)', transform: 'rotate(-4deg)' }}>
              {polaroidImg && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={polaroidImg} alt="" className="w-full object-cover" style={{ aspectRatio: '4 / 5' }} />
              )}
              <Script className="mt-3" style={{ fontSize: '20px', color: C.sageDeep }}>Nuestro día soñado comienza en</Script>
              <div className="mt-2 flex justify-center gap-3">
                {cd.map(c => (
                  <div key={c.l}>
                    <p style={{ fontFamily: F.serif, fontSize: '22px', fontWeight: 600, lineHeight: 1, color: C.ink }}><Odometer value={c.v} /></p>
                    <p style={{ fontSize: '10px', color: C.soft }}>{c.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ════════ ITINERARIO ════════ */}
      {data.itinerary.length > 0 && (
        <section className={`px-6 ${SECTION.tight}`} style={{ background: C.paper }}>
          <Reveal className="mx-auto max-w-3xl">
            <Caps className="text-center" style={{ fontSize: '16px', color: C.ink }}>Itinerario</Caps>
            <div className="mt-8 grid grid-cols-2 gap-y-8 sm:grid-cols-4">
              {data.itinerary.map((it, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <EventIcon name={it.icon ?? 'rings'} className="h-10 w-10" stroke={C.sage} custom={data} lottieColors={it.iconColors} speed={it.iconSpeed} />
                  <span className="my-2 block h-px w-12" style={{ background: C.line }} />
                  <p className="text-[12px]" style={{ fontFamily: F.serif, color: C.ink }}>{it.label}</p>
                  <p style={{ fontFamily: F.serif, fontSize: TYPE.body, color: C.sageDeep }}>{it.time}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ════════ NOSOTROS (collage) ════════ */}
      {data.galleryImages.length > 0 && (
        <section className={`px-6 ${SECTION.tight}`} style={{ background: C.paper }}>
          <Reveal className="mx-auto max-w-4xl text-center">
            <Caps style={{ fontSize: '16px', color: C.ink }}>Nosotros</Caps>
            <MasonryGallery images={data.galleryImages} className="mt-8" />
          </Reveal>
        </section>
      )}

      {/* ════════ CONFIRMACIÓN ════════ */}
      <section className={`px-6 ${SECTION.tight} text-center`} style={{ background: C.paper }}>
        <Reveal className="mx-auto max-w-xl">
          <Caps style={{ fontSize: 'clamp(14px,2.4vw,18px)', color: C.ink }}>Es muy importante que nos confirmes tu asistencia</Caps>
          <div className="mt-5"><SageBtn href={data.whatsapp}>Confirmar asistencia</SageBtn></div>
        </Reveal>
      </section>

      {/* ════════ REGALO (salvia) — Zelle + QR ════════ */}
      <section className={`px-6 ${SECTION.base} text-center`} style={{ background: C.sage, color: C.cream }}>
        <Reveal className="mx-auto max-w-3xl">
          <EventIcon name="gift" className="mx-auto mb-3 h-12 w-12" stroke={C.cream} custom={data} sec="gift" />
          <Caps style={{ fontSize: '16px', color: C.cream }}>Sugerencia de Regalo</Caps>
          <p className="mx-auto mt-3 max-w-xl" style={{ fontFamily: F.serif, fontSize: TYPE.body, lineHeight: 1.6 }}>{data.giftMessage}</p>
          <div className="mx-auto mt-7 grid max-w-xl gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-center rounded-sm px-5 py-10" style={{ border: `1px solid ${C.cream}` }}>
              <span style={{ fontFamily: F.serif, fontSize: '34px', fontWeight: 700, color: C.cream }}>Zelle</span>
            </div>
            {data.giftQrUrl ? (
              <div className="flex flex-col items-center justify-center rounded-sm px-5 py-6" style={{ border: `1px solid ${C.cream}` }}>
                <Caps style={{ fontSize: '12px', color: C.cream }}>Transferencia QR</Caps>
                <span className="my-2 block h-px w-3/4" style={{ background: C.cream, opacity: 0.4 }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.giftQrUrl} alt="QR" className="h-32 w-32 rounded bg-white p-2" />
              </div>
            ) : (
              data.giftBank && (
                <div className="flex flex-col items-center justify-center rounded-sm px-5 py-8 text-center" style={{ border: `1px solid ${C.cream}` }}>
                  <Caps style={{ fontSize: '12px', color: C.cream }}>{data.giftBank.bank}</Caps>
                  <p style={{ fontFamily: F.serif, fontSize: TYPE.body }}>{data.giftBank.account}</p>
                  <p style={{ fontFamily: F.serif, fontSize: TYPE.body }}>{data.giftBank.holder}</p>
                </div>
              )
            )}
          </div>
          {data.giftThanks && <Caps className="mt-7" style={{ fontSize: '12px', color: C.cream }}>{data.giftThanks}</Caps>}
        </Reveal>
      </section>

      {/* ════════ GALERÍA + SOLO ADULTOS (2 tarjetas) ════════ */}
      <section className={`px-6 ${SECTION.tight}`} style={{ background: C.paper }}>
        <div className="mx-auto grid max-w-3xl gap-5 sm:grid-cols-2">
          <Reveal className="flex flex-col items-center rounded-sm px-6 py-8 text-center" style={{ border: `1px solid ${C.line}` }}>
            <span className="mb-3 block h-px w-10" style={{ background: C.line }} />
            <Caps style={{ fontSize: '13px', color: C.ink }}>Te invitamos a compartir tus fotografías</Caps>
            <p className="mt-3" style={{ fontFamily: F.serif, fontSize: '14px', color: C.soft, lineHeight: 1.5 }}>{data.galleryMsg}</p>
            <div className="mt-4"><SageBtn href={data.galleryUrl}>Compartir fotografías</SageBtn></div>
          </Reveal>
          <Reveal delay={100} className="rounded-sm px-6 py-8 text-center" style={{ border: `1px solid ${C.line}` }}>
            <BabyNo color={C.sage} className="mx-auto mb-3 h-12 w-12" />
            <Caps style={{ fontSize: '13px', color: C.ink }}>Solo Adultos</Caps>
            <p className="mt-3" style={{ fontFamily: F.serif, fontSize: '14px', color: C.soft, lineHeight: 1.5 }}>{data.noKids}</p>
          </Reveal>
        </div>
      </section>

      {/* ════════ FOTO FINAL + FOOTER ════════ */}
      {data.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.coverImage} alt="" className="h-[55vh] w-full object-cover object-top" />
      )}
      <footer className="py-8 text-center" style={{ background: '#1a1a18', color: C.cream }}>
        <p style={{ fontFamily: F.caps, fontSize: '22px', letterSpacing: '0.2em', color: C.cream }}>ENKARTA</p>
        <p className="mt-1" style={{ fontFamily: F.serif, fontSize: '14px', opacity: 0.8 }}>
          ¿Deseas una invitación para tu evento? <span style={{ fontWeight: 700 }}>Contáctanos</span>
        </p>
      </footer>
    </div>
    </ThemeCtx.Provider>
  );
}
