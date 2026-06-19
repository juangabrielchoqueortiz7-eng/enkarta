'use client';

import { useEffect, useRef, useState, useContext, createContext } from 'react';
import { Reveal, useCountdown, PhotoGrid, EventIcon } from './shared';
import { PrimiciaContent, TemplateTheme } from './types';

const DEFAULT_C = { paper: '#fdfcfa', ink: '#1a1714', soft: '#3c372f', faint: '#7a7368', rule: '#1a1714' };
type PrimiciaPalette = typeof DEFAULT_C;

const ThemeCtx = createContext<PrimiciaPalette>(DEFAULT_C);
const useC = () => useContext(ThemeCtx);

/** Mapea la paleta semántica editable a los colores internos de Primicia. */
function resolvePrimiciaTheme(t?: TemplateTheme): PrimiciaPalette {
  return {
    paper: t?.bg      || DEFAULT_C.paper,
    ink:   t?.primary || t?.text || DEFAULT_C.ink,
    soft:  t?.muted   || DEFAULT_C.soft,
    faint: DEFAULT_C.faint,
    rule:  t?.line    || t?.primary || DEFAULT_C.rule,
  };
}
const FONT = {
  black: "'UnifrakturMaguntia', serif",
  head: "'Playfair Display', Georgia, serif",
  body: "'PT Serif', Georgia, serif",
  script: "'Great Vibes', cursive",
};

function ItineraryIcon({
  name,
  className = '',
  delay = '0s',
}: {
  name: string;
  className?: string;
  delay?: string;
}) {
  const style = { animation: `prIconFloat 3.6s ease-in-out ${delay} infinite` };

  switch (name) {
    case 'church':
      return (
        <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M32 7v8M28 11h8" />
          <path d="M12 50h40" />
          <path d="M18 50V28l14-9 14 9v22" />
          <path d="M24 50V34h16v16" />
          <path d="M28 50v-8c0-2.4 1.8-4.2 4-4.2s4 1.8 4 4.2v8" />
          <path d="M16 30h32" />
          <path d="M22 25h20" />
        </svg>
      );
    case 'rings':
      return (
        <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 21 31 34 49 21" />
          <path d="M15 21h34v24H15z" />
          <path d="M25 14h14l-1.4 10H26.4z" />
          <path d="M28.4 18h8" />
          <path d="M28.4 22h6.4" />
          <circle cx="32" cy="28.5" r="4.6" />
          <path d="m29.9 28.5 1.5 1.5 3.2-3.5" />
        </svg>
      );
    case 'cheers':
      return (
        <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="24" cy="17" r="4" />
          <circle cx="38" cy="17" r="4" />
          <path d="M24 21v9M38 21v9" />
          <path d="M24 25l8 4 6-4" />
          <path d="M24 30 20 49h10l-3-12" />
          <path d="M38 30l-4 19h10l-3-12" />
          <path d="M32 29v20" />
        </svg>
      );
    case 'dinner':
      return (
        <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 42h34" />
          <path d="M21 42c0-8 4.2-13.5 10-13.5S41 34 41 42" />
          <path d="M31 28.5c6.5 0 11-4 11-9H20c0 5 4.5 9 11 9Z" />
          <path d="M13 18v14M17 18v14M21 18v14M13 32c0 2 1.8 3.5 4 3.5s4-1.5 4-3.5" />
          <path d="M45 16c-3 0-5.5 3.4-5.5 7.7v9.3M45 16v26" />
          <path d="M46 18.5h4.5" />
        </svg>
      );
    case 'dance':
      return (
        <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 39c8-10 16.4-15.8 25.8-19" />
          <path d="M24.5 31.5c4.4-.4 7.8 1.8 9 5.3 1 2.9-.1 6.2-2.8 8.1L20 52h17.5c3.4 0 5-4.2 2.5-6.6l-5.8-5.4" />
          <path d="M41.5 20.5 49 18l3.5 7-6.4 1.7" />
          <path d="M16 20l2.2 2.2M50 13l2.2-2.2M53 28h3M18 13l-1.2-2.6" />
        </svg>
      );
    case 'party':
    default:
      return (
        <svg viewBox="0 0 64 64" className={className} style={style} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 40h32v6.5c0 3.6-2.9 6.5-6.5 6.5h-19c-3.6 0-6.5-2.9-6.5-6.5V40Z" />
          <path d="M21 40V31c0-5.6 4.5-10 10-10h2c5.5 0 10 4.4 10 10v9" />
          <circle cx="24" cy="49" r="3.2" />
          <circle cx="40" cy="49" r="3.2" />
          <path d="M27 44h10" />
          <path d="M32 14.5c1.8-3.7 6-4.8 8.7-2.4 2 1.8 1.8 5-.3 7-2.6 2.3-6 3.6-8.4 6.1-2.4-2.5-5.8-3.8-8.4-6.1-2.1-2-2.3-5.2-.3-7 2.7-2.4 6.9-1.3 8.7 2.4Z" />
        </svg>
      );
  }
}

function Rule({ className = '' }: { className?: string }) {
  const C = useC();
  return (
    <div className={className} aria-hidden>
      <div style={{ borderTop: `2.5px solid ${C.rule}`, marginBottom: '2px' }} />
      <div style={{ borderTop: `1px solid ${C.rule}` }} />
    </div>
  );
}

function Head({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const C = useC();
  return (
    <h3
      className={className}
      style={{ fontFamily: FONT.head, color: C.ink, fontWeight: 800, lineHeight: 1.15, ...style }}
    >
      {children}
    </h3>
  );
}

function BlackBtn({
  children,
  href,
  onClick,
  full,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  full?: boolean;
}) {
  const C = useC();
  const cls = `inline-flex items-center justify-center px-8 py-3 text-[12px] tracking-[0.16em] uppercase transition-all duration-300 hover:opacity-85 ${full ? 'w-full' : ''}`;
  const style: React.CSSProperties = {
    background: C.ink,
    color: C.paper,
    fontFamily: FONT.head,
    fontWeight: 600,
  };
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

function OutBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const C = useC();
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center px-7 py-2.5 text-[12px] tracking-[0.18em] uppercase transition-all duration-300 hover:bg-[#1a1714] hover:text-white"
      style={{ border: `1.5px solid ${C.ink}`, color: C.ink, fontFamily: FONT.head, fontWeight: 600 }}
    >
      {children}
    </button>
  );
}

function Photo({
  src,
  className = '',
  style,
}: {
  src: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    // El tamaño lo dicta cada uso editorial (columnas del periódico), por lo
    // que next/image no aplica sin romper la maqueta.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={className}
      style={{ filter: 'grayscale(100%) contrast(1.05)', objectFit: 'cover', ...style }}
    />
  );
}

export default function Primicia({ data }: { data: PrimiciaContent }) {
  const { days, hours, mins } = useCountdown(data.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const C = resolvePrimiciaTheme(data.theme);

  useEffect(() => {
    document.body.style.background = C.paper;
    return () => {
      document.body.style.background = '';
    };
  }, [C.paper]);

  const enter = () => document.getElementById('pr-hero')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <ThemeCtx.Provider value={C}>
    <div
      className="relative min-h-screen w-full overflow-x-hidden"
      style={{ background: C.paper, color: C.ink, fontFamily: FONT.body }}
    >
      <style>{`
        @keyframes prBounce { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(7px);} }
        @keyframes prIconFloat { 0%,100%{ transform: translateY(0px);} 50%{ transform: translateY(-6px);} }
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
        style={{ border: `1.5px solid ${C.ink}`, background: C.paper }}
        aria-label="Musica"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={C.ink}>
          <path d="M9 17a3 3 0 11-2-2.83V5l11-2v10.17A3 3 0 1116 14V7L9 8.4V17z" />
        </svg>
      </button>)}

      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-3xl">
          <p style={{ fontFamily: FONT.head, fontWeight: 700, letterSpacing: '0.3em', fontSize: '10px' }}>
            EDICION ESPECIAL · BODAS
          </p>
          <p className="mt-5" style={{ fontFamily: FONT.black, fontSize: 'clamp(34px,7vw,72px)', lineHeight: 1 }}>
            Noticia de Ultimo momento
          </p>
          <Head className="mt-4" style={{ fontSize: 'clamp(28px,6vw,58px)', fontWeight: 900, textTransform: 'uppercase' }}>
            La Boda del Ano
          </Head>
          <Rule className="mt-8 mb-2" />
          <p
            style={{
              fontFamily: FONT.head,
              fontWeight: 600,
              letterSpacing: '0.08em',
              fontSize: 'clamp(11px,2.4vw,15px)',
              textTransform: 'uppercase',
            }}
          >
            {data.dateLine}
          </p>
          <Rule className="mt-2 mb-10" />
          <OutBtn onClick={enter}>Ingresar a mi invitacion</OutBtn>
        </div>
      </section>

      <section id="pr-hero" className="relative">
        <div className="relative w-full overflow-hidden" style={{ height: '92vh' }}>
          <Photo src={data.photoUrl} className="absolute inset-0 h-full w-full" />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, transparent 40%, rgba(0,0,0,0.45) 100%)' }}
          />
          <div className="absolute inset-x-0 bottom-[13%] px-6 text-center text-white">
            <p style={{ fontFamily: FONT.script, fontSize: 'clamp(46px,11vw,104px)', lineHeight: 0.9 }}>{data.groom}</p>
            <p style={{ fontFamily: FONT.script, fontSize: 'clamp(22px,5vw,40px)', margin: '2px 0' }}>&amp;</p>
            <p style={{ fontFamily: FONT.script, fontSize: 'clamp(46px,11vw,104px)', lineHeight: 0.9 }}>{data.bride}</p>
          </div>
          <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full" style={{ height: '7vh' }} aria-hidden>
            <path d="M0 8 L0 4 Q 50 -2 100 4 L100 8 Z" fill={C.paper} />
          </svg>
        </div>
        <div className="flex items-center justify-center gap-4 py-7">
          <span style={{ fontFamily: FONT.head, fontWeight: 700, fontSize: '26px' }}>{data.initials[0]}</span>
          <span style={{ width: '1px', height: '34px', background: C.ink, opacity: 0.5 }} />
          <span style={{ fontFamily: FONT.head, fontWeight: 700, fontSize: '26px' }}>{data.initials[1]}</span>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-16 text-center">
        <Reveal>
          <Head style={{ fontSize: 'clamp(18px,4vw,26px)' }}>Bienvenidos a la invitacion de nuestra Boda</Head>
          <Rule className="mx-auto mb-6 mt-6 w-24" />
          {data.guestName && <p style={{ fontFamily: FONT.script, fontSize: '42px', color: C.ink }}>{data.guestName}</p>}
          {data.guestPasses && (<>
            <p className="mt-2 italic" style={{ color: C.soft, fontSize: '17px' }}>
              Hemos reservado:
            </p>
            <p style={{ fontFamily: FONT.head, fontWeight: 800, fontSize: '30px' }}>{data.guestPasses}</p>
            <p className="italic" style={{ color: C.soft, fontSize: '17px' }}>
              en su honor
            </p>
          </>)}
        </Reveal>
      </section>

      <section className="px-6 py-12 text-center">
        <Reveal>
          <Head style={{ fontSize: 'clamp(16px,3.6vw,24px)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            El gran dia se acerca y no puedes faltar
          </Head>
          <div className="mb-7 mt-7 flex items-center justify-center gap-4">
            <span style={{ fontFamily: FONT.head, letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: '13px' }}>
              {data.dateWeekday}
            </span>
            <span style={{ fontFamily: FONT.head, fontWeight: 900, fontSize: 'clamp(40px,9vw,58px)', lineHeight: 1 }}>
              {data.dateDay}
            </span>
            <div
              className="text-left leading-tight"
              style={{ fontFamily: FONT.head, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
            >
              <div>{data.dateMonth}</div>
              <div>{data.dateYear}</div>
            </div>
          </div>
          <div className="flex items-start justify-center gap-3 sm:gap-5">
            {[
              [days, 'Dias'],
              [hours, 'Horas'],
              [mins, 'Mins.'],
            ].map(([n, l]) => (
              <div key={l as string} className="text-center">
                <div
                  className="flex items-center justify-center"
                  style={{ background: C.ink, color: C.paper, width: 'clamp(64px,18vw,92px)', height: 'clamp(64px,18vw,92px)' }}
                >
                  <span style={{ fontFamily: FONT.head, fontWeight: 800, fontSize: 'clamp(26px,7vw,40px)' }}>
                    {String(n).padStart(2, '0')}
                  </span>
                </div>
                <p className="mt-2" style={{ fontFamily: FONT.head, fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                  {l}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <Reveal>
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
            <Photo src={data.photoUrl} className="w-full" style={{ height: 'clamp(360px,60vw,540px)' }} />
            <div>
              <p style={{ fontFamily: FONT.head, fontWeight: 900, fontSize: '52px', lineHeight: 0.5, color: C.ink }}>&rdquo;</p>
              <Head className="mt-1" style={{ fontSize: 'clamp(22px,4vw,30px)' }}>
                Mensaje de los novios
              </Head>
              <div className="mt-5 space-y-4" style={{ fontFamily: FONT.body, fontSize: '16px', lineHeight: 1.75, color: C.soft, textAlign: 'justify' }}>
                {data.coupleMessage.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <Reveal>
          <Head className="mb-10 text-center" style={{ fontSize: 'clamp(15px,3.4vw,22px)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Con la bendicion de Dios y de nuestros padres
          </Head>
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
            <div className="space-y-8 text-center md:text-left">
              {[
                ['Padres de la Novia', data.parentsBride],
                ['Padres del Novio', data.parentsGroom],
              ].map(([label, people]) => (
                <div key={label as string}>
                  <Head style={{ fontSize: '20px' }}>{label as string}</Head>
                  <div className="mt-1">
                    {(people as string[]).map((person) => (
                      <p key={person} style={{ fontFamily: FONT.body, fontSize: '17px', color: C.soft }}>
                        {person}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Photo src={data.photoUrl} className="order-first w-full md:order-last" style={{ height: 'clamp(340px,55vw,520px)' }} />
          </div>
        </Reveal>
      </section>

      <section className="px-6 py-16">
        <Reveal>
          <Head className="mb-12 text-center" style={{ fontSize: 'clamp(24px,5vw,38px)' }}>
            Itinerario
          </Head>
          <div className="relative mx-auto max-w-4xl px-2 md:px-6">
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2" style={{ background: '#9ea392' }} aria-hidden />
            <div className="relative space-y-10 md:space-y-12">
              {data.itinerary.map((item, index) => {
                const left = index % 2 === 0;
                const delay = `${index * 0.45}s`;
                const block = (
                  <div className={`flex flex-col ${left ? 'items-end text-right' : 'items-start text-left'}`}>
                    <div className={`mb-3 ${left ? 'mr-2' : 'ml-2'}`} style={{ color: C.ink }}>
                      <ItineraryIcon
                        name={item.icon === 'cheers' && item.label.toLowerCase().includes('fin') ? 'party' : item.icon}
                        className="h-12 w-12 md:h-14 md:w-14"
                        delay={delay}
                      />
                    </div>
                    <div className="w-full max-w-[170px] md:max-w-[240px]">
                      <p
                        className="leading-tight"
                        style={{
                          fontFamily: FONT.head,
                          fontSize: 'clamp(16px,3vw,19px)',
                          color: C.ink,
                        }}
                      >
                        {item.label}
                      </p>
                      <div
                        className={`mt-3 border-b border-dashed ${left ? 'ml-auto' : ''}`}
                        style={{ borderColor: '#8f9687', width: '100%', maxWidth: '148px' }}
                      />
                      <p
                        className="mt-3"
                        style={{
                          fontFamily: FONT.head,
                          fontWeight: 700,
                          fontSize: 'clamp(18px,3.4vw,22px)',
                          color: C.ink,
                        }}
                      >
                        {item.time}
                      </p>
                    </div>
                  </div>
                );

                return (
                  <div key={`${item.label}-${item.time}`} className="grid grid-cols-[1fr_28px_1fr] items-center gap-x-3 md:gap-x-8">
                    <div>{left ? block : null}</div>
                    <div className="flex justify-center">
                      <div className="h-3.5 w-3.5 rounded-full border-[3px]" style={{ background: '#fff', borderColor: C.ink }} />
                    </div>
                    <div>{!left ? block : null}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </section>

      <section className="px-6 py-16 text-center">
        <Reveal>
          {data.icons?.dress && (
            <EventIcon name="" custom={data} sec="dress" className="mx-auto mb-3 h-11 w-11" stroke={C.ink} />
          )}
          <Head style={{ fontSize: 'clamp(24px,5vw,38px)' }}>Codigo de Vestimenta</Head>
          <p className="mt-4" style={{ fontFamily: FONT.body, fontSize: '17px', color: C.soft }}>
            Para este dia tan especial, se ha elegido un estilo:
          </p>
          <p className="mt-2" style={{ fontFamily: FONT.head, fontWeight: 900, fontSize: 'clamp(30px,7vw,52px)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {data.dressCode}
          </p>
        </Reveal>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <Reveal>
          <div className="mb-8 flex justify-center">
            {data.icons?.ceremony ? (
              <EventIcon name="" custom={data} sec="ceremony" className="h-12 w-12" stroke={C.ink} />
            ) : (
              <svg width="40" height="48" viewBox="0 0 24 28" fill="none" stroke={C.ink} strokeWidth="1.2">
                <path d="M12 1C7 1 3 5 3 10c0 6.5 9 16 9 16s9-9.5 9-16c0-5-4-9-9-9z" />
                <circle cx="12" cy="10" r="3.2" />
              </svg>
            )}
          </div>
          <div className="space-y-8">
            {data.locations.map((location) => (
              <div key={location.name} className="grid grid-cols-1 sm:grid-cols-2" style={{ border: `1.5px solid ${C.ink}` }}>
                <div className="relative">
                  <div className="absolute left-3 right-3 top-3 z-10 px-2 py-1.5 text-center" style={{ background: C.ink }}>
                    <p style={{ fontFamily: FONT.head, fontWeight: 700, color: C.paper, fontSize: '12px', letterSpacing: '0.06em' }}>
                      {location.name.toUpperCase()}
                    </p>
                  </div>
                  <Photo src={data.photoUrl} className="w-full" style={{ height: '210px' }} />
                </div>
                <div className="flex flex-col justify-center p-5">
                  <p style={{ fontFamily: FONT.head, fontWeight: 700, fontSize: '14px' }}>
                    | {location.time} | {location.place},
                  </p>
                  <p className="mt-2" style={{ fontFamily: FONT.body, fontSize: '14px', color: C.soft, lineHeight: 1.6 }}>
                    {location.desc}
                  </p>
                  {location.maps && (
                    <div className="mt-4">
                      <BlackBtn href={location.maps} full>
                        Ver ubicacion
                      </BlackBtn>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-10">
        <Reveal>
          <div className="flex items-center gap-5 p-5" style={{ border: `1.5px solid ${C.ink}` }}>
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke={C.ink} strokeWidth="1.2" className="shrink-0">
              <circle cx="24" cy="24" r="20" />
              <circle cx="24" cy="18" r="5" />
              <path d="M14 38c0-6 4-10 10-10s10 4 10 10" />
              <path d="M10 10 38 38" />
            </svg>
            <p style={{ fontFamily: FONT.body, fontSize: '16px', color: C.soft, lineHeight: 1.6 }}>
              Amamos a sus ninos y queremos que ustedes disfruten sin parar, por ello es que la invitacion es solo para adultos.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-14">
        <Reveal>
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
            <div>
              <Head style={{ fontSize: 'clamp(24px,4.5vw,34px)' }}>Querida familia y Amigos</Head>
              <p className="mt-5" style={{ fontFamily: FONT.body, fontSize: '15px', color: C.soft, lineHeight: 1.75, textAlign: 'justify' }}>
                {data.rsvpMessage}
              </p>
              <div className="mt-7 p-6 text-center" style={{ border: `1.5px solid ${C.ink}` }}>
                <Head style={{ fontSize: '20px', textTransform: 'uppercase' }}>Confirmar Asistencia</Head>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="1.5" className="mx-auto my-4">
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12l2.5 2.5 4.5-5" />
                </svg>
                <p className="mb-5 italic" style={{ fontFamily: FONT.body, fontSize: '15px', color: C.soft }}>
                  Es importante para nosotros que puedas confirmar tu asistencia.
                </p>
                <BlackBtn href={data.whatsapp} full>
                  Confirmar
                </BlackBtn>
              </div>
            </div>
            <Photo src={data.photoUrl} className="order-first w-full md:order-last" style={{ height: 'clamp(380px,60vw,560px)' }} />
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-2xl px-6 py-14 text-center">
        <Reveal>
          <div className="p-8" style={{ border: `1.5px solid ${C.ink}` }}>
            {data.icons?.gift && (
              <EventIcon name="" custom={data} sec="gift" className="mx-auto mb-3 h-11 w-11" stroke={C.ink} />
            )}
            <Head style={{ fontSize: 'clamp(20px,4.5vw,30px)', textTransform: 'uppercase' }}>Sugerencia de Regalo</Head>
            <p className="mx-auto mt-5 max-w-lg italic" style={{ fontFamily: FONT.body, fontSize: '17px', color: C.soft, lineHeight: 1.7 }}>
              {data.giftMessage}
            </p>
            <div className="mt-6 inline-block text-left">
              <p style={{ fontFamily: FONT.body, fontSize: '16px' }}>
                <b>No:</b> {data.giftAccount.no}
              </p>
              <p style={{ fontFamily: FONT.body, fontSize: '16px' }}>
                <b>CCI:</b> {data.giftAccount.cci}
              </p>
            </div>
            <p className="mt-5 italic" style={{ color: C.soft, fontSize: '15px' }}>
              Gracias por su muestra de carino.
            </p>
          </div>
        </Reveal>
      </section>

      {data.galleryImages && data.galleryImages.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-14 text-center">
          <Reveal>
            {data.icons?.gallery && (
              <EventIcon name="" custom={data} sec="gallery" className="mx-auto mb-3 h-11 w-11" stroke={C.ink} />
            )}
            <Head style={{ fontSize: 'clamp(20px,4.5vw,30px)', textTransform: 'uppercase' }}>Nuestra Galería</Head>
            <div className="mt-7">
              <PhotoGrid images={data.galleryImages} radius={4} />
            </div>
          </Reveal>
        </section>
      )}

      <footer className="py-8 text-center" style={{ background: C.ink, color: C.paper }}>
        <p style={{ fontFamily: FONT.black, fontSize: '24px' }}>Enkarta</p>
        <p className="mt-1" style={{ fontFamily: FONT.body, fontSize: '14px', opacity: 0.7 }}>
          Deseas una invitacion para tu evento? <span style={{ fontWeight: 700 }}>Contactanos</span>
        </p>
      </footer>
    </div>
    </ThemeCtx.Provider>
  );
}
