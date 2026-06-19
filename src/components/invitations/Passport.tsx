'use client';

import { useEffect, useRef, useState, useContext, createContext } from 'react';
import Image from 'next/image';
import { EventIcon, Reveal, useCountdown, PhotoGrid } from './shared';
import { PassportContent, TemplateTheme } from './types';

const DEFAULT_C = {
  cream: '#d9cdb5',
  sage: '#6e795b',
  sageSoft: '#7d886a',
  dark: '#403d2d',
  darkSoft: '#5f5b48',
  creamText: '#ece6d6',
  creamDim: 'rgba(236,230,214,0.78)',
  line: 'rgba(110,121,91,0.4)',
};
type PassportPalette = typeof DEFAULT_C;

const ThemeCtx = createContext<PassportPalette>(DEFAULT_C);
const useC = () => useContext(ThemeCtx);

/** Mapea la paleta semántica editable a los colores internos de Passport. */
function resolvePassportTheme(t?: TemplateTheme): PassportPalette {
  return {
    cream:     t?.bg          || DEFAULT_C.cream,
    sage:      t?.primary     || DEFAULT_C.sage,
    sageSoft:  t?.primary     || DEFAULT_C.sageSoft,
    dark:      t?.text        || t?.primaryDeep || DEFAULT_C.dark,
    darkSoft:  t?.muted       || DEFAULT_C.darkSoft,
    creamText: t?.onPrimary   || DEFAULT_C.creamText,
    creamDim:  DEFAULT_C.creamDim,
    line:      t?.line        || t?.primary || DEFAULT_C.line,
  };
}

const F = {
  script: "'Great Vibes', cursive",
  caps: "'Cinzel', serif",
  body: "'Cormorant Garamond', serif",
};

function Wave({ fill }: { fill: string }) {
  return (
    <div className="relative -mb-px w-full leading-[0]" aria-hidden>
      <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="block w-full" style={{ height: '52px' }}>
        <path d="M0,38 C 260,72 520,8 760,30 C 1000,52 1230,16 1440,40 L1440,70 L0,70 Z" fill={fill} />
      </svg>
    </div>
  );
}

function Compass({ size = 96 }: { size?: number }) {
  const C = useC();
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" stroke={C.sage} strokeWidth="1.1" aria-hidden>
      <circle cx="50" cy="50" r="30" opacity="0.6" />
      <circle cx="50" cy="50" r="22" opacity="0.35" />
      {[0, 90, 180, 270].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 50 50)`}>
          <path d="M50 18 L55 50 L50 50 Z" fill={C.sage} stroke="none" />
          <path d="M50 18 L45 50 L50 50 Z" fill={C.sage} opacity="0.5" stroke="none" />
        </g>
      ))}
      {[45, 135, 225, 315].map((angle) => (
        <g key={angle} transform={`rotate(${angle} 50 50)`}>
          <path d="M50 28 L53 50 L50 50 Z" fill={C.sage} opacity="0.4" stroke="none" />
        </g>
      ))}
      <circle cx="50" cy="50" r="3.5" fill={C.cream} />
      <text x="50" y="14" textAnchor="middle" fontSize="8" fill={C.sage} fontFamily={F.caps} stroke="none">N</text>
      <text x="50" y="92" textAnchor="middle" fontSize="8" fill={C.sage} fontFamily={F.caps} stroke="none">S</text>
      <text x="90" y="53" textAnchor="middle" fontSize="8" fill={C.sage} fontFamily={F.caps} stroke="none">E</text>
      <text x="10" y="53" textAnchor="middle" fontSize="8" fill={C.sage} fontFamily={F.caps} stroke="none">W</text>
    </svg>
  );
}

function GlobeCity({ size = 130 }: { size?: number }) {
  const C = useC();
  return (
    <div className="pp-globe relative" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" fill="none" stroke={C.sage} strokeWidth="1">
        <circle cx="60" cy="60" r="30" opacity="0.5" />
        {Array.from({ length: 22 }).map((_, index) => {
          const angle = (index / 22) * Math.PI * 2;
          const radius = 30;
          const h = 5 + ((index * 7) % 9);
          // Redondeamos para que servidor y cliente generen el mismo string (evita warning de hidratación)
          const r3 = (n: number) => Math.round(n * 1000) / 1000;
          const x = r3(60 + Math.cos(angle) * radius);
          const y = r3(60 + Math.sin(angle) * radius);
          const x2 = r3(60 + Math.cos(angle) * (radius + h));
          const y2 = r3(60 + Math.sin(angle) * (radius + h));
          return <line key={index} x1={x} y1={y} x2={x2} y2={y2} strokeWidth="1.6" />;
        })}
        <circle cx="60" cy="60" r="15" opacity="0.6" />
        <path d="M53 53 L67 67 M67 53 L53 67" opacity="0.5" />
        <text x="53" y="63" fontSize="7" fill={C.sage} stroke="none" fontFamily={F.caps}>R</text>
        <text x="63" y="63" fontSize="7" fill={C.sage} stroke="none" fontFamily={F.caps}>I</text>
      </svg>
      <div className="pp-orbit absolute inset-0">
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" fill="none" stroke={C.sage} strokeWidth="1" strokeDasharray="3 4" opacity="0.6">
          <circle cx="60" cy="60" r="52" />
        </svg>
        <svg viewBox="0 0 24 24" className="absolute" style={{ width: 20, height: 20, top: 2, left: '50%', marginLeft: -10 }} fill={C.sage}>
          <path d="M21 11 13.5 12.5 12 21 10.5 12.5 3 11 10.5 9.5 12 1 13.5 9.5z" />
        </svg>
      </div>
    </div>
  );
}

function PlaneTrail({ className = '' }: { className?: string }) {
  const C = useC();
  return (
    <svg viewBox="0 0 120 60" className={className} fill="none" stroke={C.sage} strokeWidth="1.2" aria-hidden>
      <path d="M2 56 C 30 50, 55 34, 96 12" strokeDasharray="3 5" strokeLinecap="round" />
      <path d="M96 12 l8 -6 -1 6 5 2 -6 3 -1 7 -3 -6 -6 1z" fill={C.sage} stroke="none" />
    </svg>
  );
}

function Script({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return <p className={className} style={{ fontFamily: F.script, color: C.sage, lineHeight: 1, ...style }}>{children}</p>;
}

function Caps({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return <p className={className} style={{ fontFamily: F.caps, color: C.sage, letterSpacing: '0.14em', textTransform: 'uppercase', ...style }}>{children}</p>;
}

function SageBtn({ children, href, onClick }: { children: React.ReactNode; href?: string; onClick?: () => void }) {
  const C = useC();
  const cls = 'inline-flex items-center justify-center gap-2 rounded-full px-7 py-2.5 text-[12px] tracking-[0.14em] uppercase transition-all duration-300 hover:opacity-90';
  const style: React.CSSProperties = { background: C.sage, color: C.creamText, fontFamily: F.caps, fontWeight: 600 };
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={cls} style={style}>
      {children}
    </button>
  );
}

function Flourish({ flip }: { flip?: boolean }) {
  const C = useC();
  return (
    <svg viewBox="0 0 80 24" width="80" height="24" fill="none" stroke={C.dark} strokeWidth="1" style={{ transform: flip ? 'scaleX(-1)' : undefined }} aria-hidden>
      <path d="M2 12 H 56" strokeLinecap="round" />
      <path d="M56 12 C 64 12, 64 4, 70 4 C 74 4, 74 9, 70 9 C 66 9, 66 4, 70 4" strokeLinecap="round" />
      <circle cx="58" cy="12" r="1.4" fill={C.dark} />
    </svg>
  );
}

export default function Passport({ data }: { data: PassportContent }) {
  const { days, hours, mins, secs } = useCountdown(data.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const C = resolvePassportTheme(data.theme);

  useEffect(() => {
    document.body.style.background = C.cream;
    return () => {
      document.body.style.background = '';
    };
  }, [C.cream]);

  const enter = () => document.getElementById('pp-intro')?.scrollIntoView({ behavior: 'smooth' });
  const titleSize = { fontSize: 'clamp(36px,8vw,58px)' };

  return (
    <ThemeCtx.Provider value={C}>
    <div className="relative min-h-screen w-full overflow-x-hidden" style={{ background: C.cream, color: C.dark, fontFamily: F.body }}>
      <style>{`
        @keyframes ppOrbit { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        @keyframes ppFade { from { opacity: 0; transform: translateY(16px);} to { opacity: 1; transform: translateY(0);} }
        .pp-orbit { animation: ppOrbit 9s linear infinite; transform-origin: 50% 50%; }
      `}</style>
      {data.musicUrl && <audio ref={audioRef} src={data.musicUrl} loop />}

      {data.musicUrl && (<button
        onClick={() => {
          const a = audioRef.current;
          if (!a) {
            setPlaying((prev) => !prev);
            return;
          }
          if (playing) {
            a.pause();
            setPlaying(false);
          } else {
            a.play().then(() => setPlaying(true)).catch(() => {});
          }
        }}
        className="fixed bottom-5 right-5 z-50 flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-110"
        style={{ border: `1.5px solid ${C.sage}`, background: C.cream }}
        aria-label="Musica"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={C.sage}>
          <path d="M9 17a3 3 0 11-2-2.83V5l11-2v10.17A3 3 0 1116 14V7L9 8.4V17z" />
        </svg>
      </button>)}

      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center" style={{ background: C.sage }}>
        <div className="flex flex-col items-center" style={{ animation: 'ppFade 1.1s ease both' }}>
          <div className="pp-globe relative" style={{ width: 60, height: 60 }}>
            <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full" fill="none" stroke={C.creamText} strokeWidth="1.2">
              <circle cx="24" cy="24" r="13" />
              <ellipse cx="24" cy="24" rx="5.5" ry="13" />
              <path d="M11 20h26M11 28h26" />
            </svg>
            <div className="pp-orbit absolute inset-0">
              <svg viewBox="0 0 24 24" className="absolute" style={{ width: 16, height: 16, top: -3, left: '52%' }} fill={C.creamText}>
                <path d="M21 11 13.5 12.5 12 21 10.5 12.5 3 11 10.5 9.5 12 1 13.5 9.5z" />
              </svg>
            </div>
          </div>
          <Caps className="mt-5" style={{ color: C.creamText, fontSize: 'clamp(26px,6vw,44px)', letterSpacing: '0.28em' }}>Pasaporte</Caps>
          <p style={{ fontFamily: F.script, fontSize: 'clamp(26px,5vw,40px)', color: C.creamText, marginTop: 2 }}>a nuestra boda</p>
          <div className="relative my-8 flex items-center justify-center" style={{ width: 156, height: 156 }}>
            <div className="absolute inset-0 rounded-full" style={{ border: `2px dashed ${C.creamText}`, opacity: 0.85 }} />
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" fill="none" stroke={C.creamText} strokeWidth="1.4">
              <path d="M28 32 L72 68 M72 32 L28 68" opacity="0.8" />
              <path d="M50 22c-2-4-8-3-8 1 0 3 5 6 8 8 3-2 8-5 8-8 0-4-6-5-8-1z" fill={C.creamText} stroke="none" />
              <path d="M50 64 L51.4 71 57 74 51.4 74.6 51.4 77 53 79 50 78 47 79 48.6 77 48.6 74.6 43 74 48.6 71 Z" fill={C.creamText} stroke="none" />
            </svg>
            <span className="absolute" style={{ fontFamily: F.caps, color: C.creamText, fontSize: 30, left: 34 }}>{data.initials[0]}</span>
            <span className="absolute" style={{ fontFamily: F.caps, color: C.creamText, fontSize: 30, right: 34 }}>{data.initials[1]}</span>
          </div>
          <Caps style={{ color: C.creamText, fontSize: 'clamp(20px,4.5vw,34px)', letterSpacing: '0.16em' }}>
            {data.groom} &amp; {data.bride}
          </Caps>
          <div className="mt-7">
            <button
              onClick={enter}
              className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-2.5 text-[12px] tracking-[0.16em] uppercase transition-all duration-300 hover:bg-[#ece6d6] hover:text-[#6e795b]"
              style={{ border: `1.5px solid ${C.creamText}`, color: C.creamText, fontFamily: F.caps, fontWeight: 600 }}
            >
              Explorar tu pasaporte
            </button>
          </div>
        </div>
        <Wave fill={C.cream} />
      </section>

      <section id="pp-intro" className="px-6 pb-4 pt-10 text-center">
        <Reveal className="mx-auto flex max-w-xl flex-col items-center">
          <Script style={{ fontSize: 'clamp(40px,9vw,64px)' }}>{data.groom} &amp; {data.bride}</Script>
          <Caps className="mt-5" style={{ color: C.dark, fontSize: 'clamp(18px,4.5vw,28px)', letterSpacing: '0.12em' }}>{data.announce}</Caps>
          <p className="mt-6 italic" style={{ fontFamily: F.body, fontSize: '19px', lineHeight: 1.7, color: C.darkSoft }}>{data.verse}</p>
          <p className="mt-2 italic" style={{ fontFamily: F.body, fontSize: '15px', color: C.darkSoft }}>{data.verseRef}</p>
        </Reveal>
      </section>

      {/* ── Foto de los novios (polaroid de viaje, solo si hay foto subida) ── */}
      {data.coverImage && (
        <section className="px-6 pb-12 pt-6 flex justify-center">
          <Reveal className="relative w-full max-w-[320px]">
            <div
              className="relative bg-white p-3 pb-12"
              style={{ transform: 'rotate(-2.5deg)', boxShadow: '0 18px 44px rgba(59,74,46,0.22)' }}
            >
              {/* Cinta adhesiva */}
              <div className="absolute -top-3 left-1/2 h-7 w-24 -translate-x-1/2" style={{ background: 'rgba(236,230,214,0.85)', transform: 'translateX(-50%) rotate(3deg)', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }} />
              <div className="relative w-full" style={{ aspectRatio: '4/5' }}>
                <Image
                  src={data.coverImage}
                  alt={`${data.groom} y ${data.bride}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 90vw, 320px"
                />
              </div>
              <p className="absolute bottom-3 left-0 right-0 text-center" style={{ fontFamily: F.script, fontSize: '24px', color: C.sage }}>
                {data.groom} &amp; {data.bride}
              </p>
              {/* Sello postal */}
              <div className="pointer-events-none absolute -right-5 -bottom-6 flex h-20 w-20 items-center justify-center rounded-full" style={{ border: `1.5px dashed ${C.sage}`, transform: 'rotate(12deg)', background: C.cream, opacity: 0.92 }}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke={C.sage} strokeWidth="1.4">
                  <path d="M10.5 13.5 3 11l1.5-1.5 6.5 1 5-5c.6-.6 1.6-.6 2 0 .4.4.4 1.4 0 2l-5 5 1 6.5L12.5 21l-2.5-7.5z" />
                </svg>
              </div>
            </div>
          </Reveal>
        </section>
      )}

      <Wave fill={C.sage} />
      <section className="px-6 py-8 text-center" style={{ background: C.sage, color: C.creamText }}>
        <Reveal className="mx-auto flex max-w-xl flex-col items-center">
          <p style={{ fontFamily: F.body, fontSize: '20px', color: C.creamText }}>{data.callout}</p>
          <p style={{ fontFamily: F.script, fontSize: '34px', marginTop: 4 }}>{data.callout2}</p>
          <div className="my-7 flex w-full max-w-sm items-center gap-3">
            <div className="h-px flex-1" style={{ background: 'rgba(236,230,214,0.4)' }} />
            <svg width="16" height="14" viewBox="0 0 16 14" fill={C.creamText}>
              <path d="M8 13C2 9 0 5.5 0 3.2 0 1 2.2 0 4 1.4 5.5 .2 8 1 8 3.2 8 1 10.5 .2 12 1.4 13.8 0 16 1 16 3.2 16 5.5 14 9 8 13z" />
            </svg>
            <div className="h-px flex-1" style={{ background: 'rgba(236,230,214,0.4)' }} />
          </div>
          <p style={{ fontFamily: F.script, fontSize: '42px', color: C.creamText }}>{data.guestName || 'Invitado'}</p>
          {data.guestPasses && (<>
            <p className="mt-1 italic" style={{ fontFamily: F.body, fontSize: '17px', color: C.creamDim }}>Hemos reservado:</p>
            <p style={{ fontFamily: F.script, fontSize: '34px', color: C.creamText }}>{data.guestPasses}</p>
            <p className="italic" style={{ fontFamily: F.body, fontSize: '17px', color: C.creamDim }}>en su honor</p>
          </>)}
        </Reveal>
      </section>
      <Wave fill={C.cream} />

      <section className="px-6 py-12 text-center">
        <Reveal className="mx-auto max-w-2xl">
          <Caps style={{ fontSize: 'clamp(13px,3.2vw,18px)', letterSpacing: '0.16em' }}>Con la bendicion de Dios y de nuestros padres</Caps>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
            {[
              ['Padres de la Novia', data.parentsBride],
              ['Padres del Novio', data.parentsGroom],
            ].map(([label, people]) => (
              <div key={label as string}>
                <Caps style={{ fontSize: '15px' }}>{label as string}</Caps>
                <div className="mt-2">
                  {(people as string[]).map((person) => (
                    <p key={person} style={{ fontFamily: F.body, fontSize: '18px', color: C.dark }}>{person}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center"><Compass size={110} /></div>
        </Reveal>
      </section>

      <section className="px-6 pb-14">
        <Reveal className="mx-auto max-w-xl">
          <div style={{ borderTop: `1px solid ${C.line}`, width: '70%', margin: '0 auto' }} />
          <div className="my-3 flex items-center justify-center gap-2 sm:gap-4">
            <Flourish />
            <div className="flex items-start gap-4 sm:gap-6">
              {[
                [days, 'Dias'],
                [hours, 'Hrs'],
                [mins, 'Mins'],
                [secs, 'Segs'],
              ].map(([n, label]) => (
                <div key={label as string} className="text-center">
                  <p style={{ fontFamily: F.caps, fontWeight: 700, fontSize: 'clamp(24px,6vw,36px)', lineHeight: 1, color: C.dark }}>
                    {String(n).padStart(2, '0')}
                  </p>
                  <p className="mt-1.5" style={{ fontFamily: F.body, fontSize: '14px', color: C.darkSoft }}>{label}</p>
                </div>
              ))}
            </div>
            <Flourish flip />
          </div>
          <div style={{ borderTop: `1px solid ${C.line}`, width: '70%', margin: '0 auto' }} />
        </Reveal>
      </section>

      <section className="px-6 py-12 text-center">
        <Reveal className="flex flex-col items-center">
          {data.icons?.ceremony ? (
            <EventIcon name="" custom={data} sec="ceremony" className="h-10 w-10" stroke={C.sage} />
          ) : (
            <svg width="34" height="40" viewBox="0 0 24 28" fill="none" stroke={C.sage} strokeWidth="1.2">
              <path d="M12 1C7 1 3 5 3 10c0 6.5 9 16 9 16s9-9.5 9-16c0-5-4-9-9-9z" />
              <circle cx="12" cy="10" r="3.2" />
            </svg>
          )}
          <Script className="mt-2" style={titleSize}>Escala</Script>
          <p className="mt-3" style={{ fontFamily: F.body, fontSize: '20px', color: C.dark }}>{data.escala.place}</p>
          <p style={{ fontFamily: F.body, fontSize: '20px', color: C.darkSoft }}>{data.escala.time}</p>
          <div className="mt-5"><SageBtn href={data.escala.maps}>Ver ubicacion</SageBtn></div>
        </Reveal>
      </section>

      <section className="px-6 py-12 text-center">
        <Reveal className="mx-auto max-w-xl">
          {data.icons?.dress && (
            <EventIcon name="" custom={data} sec="dress" className="mx-auto mb-2 h-10 w-10" stroke={C.sage} />
          )}
          <Script style={titleSize}>Vestimenta</Script>
          <Caps className="mt-3" style={{ fontSize: '16px', letterSpacing: '0.1em' }}>Etiqueta Rigurosa</Caps>
          <p className="italic" style={{ fontFamily: F.body, fontSize: '15px', color: C.darkSoft }}>{data.dress.note}</p>
          <div className="mt-7 grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div>
              <Caps style={{ fontSize: '14px', color: C.dark }}>Mujeres</Caps>
              <div className="mt-2">
                {data.dress.women.map((item) => (
                  <p key={item} style={{ fontFamily: F.body, fontSize: '17px', color: C.darkSoft }}>{item}</p>
                ))}
              </div>
            </div>
            <div>
              <Caps style={{ fontSize: '14px', color: C.dark }}>Hombres</Caps>
              <div className="mt-2">
                {data.dress.men.map((item) => (
                  <p key={item} style={{ fontFamily: F.body, fontSize: '17px', color: C.darkSoft }}>{item}</p>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-10 flex justify-center"><GlobeCity size={140} /></div>
        </Reveal>
      </section>

      <section className="px-6 py-12">
        <Reveal>
          <div className="text-center">
            <Script style={titleSize}>Itinerario</Script>
            <p className="mx-auto mb-10 mt-3 max-w-md italic" style={{ fontFamily: F.body, fontSize: '17px', color: C.darkSoft }}>
              La vida esta llena de momentos que no se pueden recuperar. Llega puntual y comparte este momento especial con nosotros.
            </p>
          </div>
          <div className="relative mx-auto max-w-2xl">
            <div className="absolute bottom-2 left-1/2 top-2 hidden -translate-x-1/2 sm:block" style={{ width: '1px', background: C.line }} aria-hidden />
            <div className="space-y-9">
              {data.itinerary.map((item, index) => {
                const left = index % 2 === 0;
                const block = (
                  <div className={`flex flex-col items-center text-center ${left ? 'sm:items-end sm:text-right' : 'sm:items-start sm:text-left'}`}>
                    <EventIcon name={item.icon} className="mb-1.5 h-9 w-9" stroke={C.sage} custom={data} lottieColors={item.iconColors} speed={item.iconSpeed} />
                    <p style={{ fontFamily: F.body, fontSize: '17px', color: C.dark }}>{item.label}</p>
                    <p style={{ fontFamily: F.caps, fontWeight: 600, fontSize: '15px', color: C.sage }}>{item.time}</p>
                  </div>
                );

                return (
                  <div key={`${item.label}-${item.time}`} className="relative grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_28px_1fr]">
                    <div className={`hidden sm:block ${left ? 'sm:pr-6' : ''}`}>{left && block}</div>
                    <div className="hidden justify-center sm:flex">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: C.sage }} />
                    </div>
                    <div className={`hidden sm:block ${!left ? 'sm:pl-6' : ''}`}>{!left && block}</div>
                    <div className="sm:hidden">{block}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </section>

      <Wave fill={C.sage} />
      <section className="px-6 py-14 text-center" style={{ background: C.sage, color: C.creamText }}>
        <Reveal className="mx-auto flex max-w-md flex-col items-center">
          {data.icons?.gallery ? (
            <EventIcon name="" custom={data} sec="gallery" className="mb-5 h-12 w-12" stroke={C.creamText} />
          ) : (
            <svg viewBox="0 0 48 48" width="46" height="46" className="mb-5" fill="none" stroke={C.creamText} strokeWidth="1.3">
              <rect x="6" y="14" width="36" height="26" rx="3" />
              <path d="M16 14l3-5h10l3 5" />
              <circle cx="24" cy="27" r="7" />
            </svg>
          )}
          <p className="italic" style={{ fontFamily: F.body, fontSize: '18px', lineHeight: 1.6, color: C.creamText }}>{data.galleryMsg}</p>
          <PhotoGrid images={data.galleryImages} className="mt-7 w-full max-w-lg" radius={12} />
          <div className="mt-6">
            <a
              href={data.galleryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-7 py-2.5 text-[12px] tracking-[0.14em] uppercase"
              style={{ background: C.cream, color: C.sage, fontFamily: F.caps, fontWeight: 600 }}
            >
              Compartir fotografias
            </a>
          </div>
        </Reveal>
      </section>
      <Wave fill={C.cream} />

      <section className="relative overflow-hidden px-6 py-14 text-center">
        <PlaneTrail className="absolute left-2 top-6 w-28 opacity-70" />
        <Reveal className="mx-auto max-w-xl">
          <Script style={titleSize}>Solo Adultos</Script>
          <p className="mt-5 italic" style={{ fontFamily: F.body, fontSize: '18px', lineHeight: 1.7, color: C.darkSoft }}>{data.noKids}</p>
        </Reveal>
      </section>

      <Wave fill={C.sage} />
      <section className="px-6 py-16 text-center" style={{ background: C.sage, color: C.creamText }}>
        <Reveal className="mx-auto flex max-w-md flex-col items-center">
          <p style={{ fontFamily: F.caps, fontSize: '12px', letterSpacing: '0.3em', color: C.creamDim }}>Confirmar Asistencia</p>
          <Script className="mt-3" style={{ color: C.creamText, fontSize: 'clamp(38px,9vw,58px)' }}>Check-in</Script>
          <p className="mt-3 italic" style={{ fontFamily: F.body, fontSize: '18px', color: C.creamDim }}>Te esperamos para vivir esta aventura juntos.</p>
          <div className="mt-6"><a href={data.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-[12px] tracking-[0.14em] uppercase" style={{ background: C.cream, color: C.sage, fontFamily: F.caps, fontWeight: 600 }}>Confirmar asistencia</a></div>
        </Reveal>
      </section>

      <footer className="py-8 text-center" style={{ background: C.sage, color: C.creamText, borderTop: '1px solid rgba(236,230,214,0.2)' }}>
        <Caps style={{ color: C.creamText, fontSize: '18px', letterSpacing: '0.2em' }}>Enkarta</Caps>
        <p className="mt-1" style={{ fontFamily: F.body, fontSize: '15px', color: C.creamDim }}>
          Deseas una invitacion para tu evento? <span style={{ fontWeight: 700 }}>Contactanos</span>
        </p>
      </footer>
    </div>
    </ThemeCtx.Provider>
  );
}
