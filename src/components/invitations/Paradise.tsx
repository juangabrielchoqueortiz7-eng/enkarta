'use client';

import { useEffect, useRef, useState, useContext, createContext } from 'react';
import { ParadiseContent, TemplateTheme } from './types';
import { useCountdown, Odometer, Reveal, EventIcon, PhotoGrid, Monogram } from './shared';
import { WriteOn, CascadeText } from '@/lib/scroll-motion';

// ── Paleta por defecto ──────────────────────────────────────────────────────────
const DEFAULT_C = {
  green: '#5f6b47',      // verde salvia medio (bandas claras de verde)
  greenDeep: '#3c4a2a',  // verde bosque (bandas oscuras, botones, pie)
  cream: '#eceedd',      // marfil
  gold: '#c7b181',       // dorado (script de acento sobre verde)
  creamText: '#eef0e0',  // texto claro sobre verde
  greenText: '#3c4a2a',  // texto/script verde sobre crema
  line: 'rgba(199,177,129,0.55)',
};
type ParadisePalette = typeof DEFAULT_C;

const ThemeCtx = createContext<ParadisePalette>(DEFAULT_C);
const useC = () => useContext(ThemeCtx);

function resolveParadiseTheme(t?: TemplateTheme): ParadisePalette {
  return {
    green:     t?.primary     || DEFAULT_C.green,
    greenDeep: t?.primaryDeep || DEFAULT_C.greenDeep,
    cream:     t?.bg          || DEFAULT_C.cream,
    gold:      (t as { gold?: string })?.gold || DEFAULT_C.gold,
    creamText: t?.onPrimary   || DEFAULT_C.creamText,
    greenText: t?.text        || DEFAULT_C.greenText,
    line:      t?.line        || DEFAULT_C.line,
  };
}

const F = {
  caps: "'Cinzel', serif",
  serif: "'Cormorant Garamond', serif",
  script: "'Great Vibes', cursive",
  body: "'Nunito', sans-serif",
};

// ── Textura sutil de mármol/papel sobre las bandas verdes ────────────────────────
function MarbleBg() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-[0.10]" aria-hidden style={{
      background:
        'radial-gradient(120% 80% at 15% 10%, rgba(255,255,255,0.6), transparent 45%),' +
        'radial-gradient(90% 70% at 85% 90%, rgba(255,255,255,0.4), transparent 50%),' +
        'radial-gradient(60% 50% at 70% 30%, rgba(0,0,0,0.25), transparent 60%)',
    }} />
  );
}

// ── Foto en marco de arco (parte superior redondeada) ────────────────────────────
function ArchPhoto({ src, className = '', style, first, second }: { src?: string; className?: string; style?: React.CSSProperties; first?: string; second?: string }) {
  const C = useC();
  return (
    <div className={`overflow-hidden ${className}`} style={{ borderRadius: '999px 999px 14px 14px', background: C.greenDeep, ...style }}>
      {src
        ? // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        : <Monogram name={first} second={second} bg={`linear-gradient(160deg, ${C.green}, ${C.greenDeep})`} fg={C.gold} />}
    </div>
  );
}

// ── Ola divisoria ────────────────────────────────────────────────────────────────
function Wave({ fill, flip = false }: { fill: string; flip?: boolean }) {
  return (
    <div className={`relative w-full leading-[0] ${flip ? '-mt-px rotate-180' : '-mb-px'}`} aria-hidden>
      <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="block w-full" style={{ height: '48px' }}>
        <path d="M0,40 C 240,70 480,12 740,32 C 1000,52 1230,18 1440,42 L1440,70 L0,70 Z" fill={fill} />
      </svg>
    </div>
  );
}

// ── Títulos ──────────────────────────────────────────────────────────────────────
function Script({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return <p className={className} style={{ fontFamily: F.script, color: C.gold, lineHeight: 1, ...style }}>{children}</p>;
}
function CapsTitle({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <h3 className={className} style={{ fontFamily: F.serif, letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1.4, ...style }}>{children}</h3>;
}

// ── Iconos de línea propios (estilo Invitali) ────────────────────────────────────
function BookCross({ color, className = '' }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 56" className={className} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M32 18v14M27 23h10" />
      <path d="M8 40c8-5 16-5 24 0 8-5 16-5 24 0" />
      <path d="M8 40V44c8-5 16-5 24 0 8-5 16-5 24 0v-4" />
      <path d="M32 32v8" />
    </svg>
  );
}
function BabyNo({ color, className = '' }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="26" />
      <path d="M14 14 50 50" />
      <circle cx="28" cy="26" r="3" />
      <path d="M22 34c0 5 4 9 9 9 3 0 5-1 7-3" />
      <path d="M24 40l-5 6M36 42l4 5" />
    </svg>
  );
}
function CalIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}

export default function Paradise({ data }: { data: ParadiseContent }) {
  const { days, hours, mins, secs } = useCountdown(data.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const C = resolveParadiseTheme(data.theme);

  useEffect(() => {
    document.body.style.background = C.cream;
    return () => { document.body.style.background = ''; };
  }, [C.cream]);

  const toggleMusic = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else a.play().then(() => setPlaying(true)).catch(() => {});
  };

  const gcalUrl = (() => {
    const start = data.isoDate.replace(/[-:]/g, '').slice(0, 15) + 'Z';
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Boda ${data.bride} & ${data.groom}`)}&dates=${start}/${start}`;
  })();

  const cd = [
    { v: days, l: 'Días' }, { v: hours, l: 'Hrs' }, { v: mins, l: 'Mins' }, { v: secs, l: 'Segs' },
  ];


  return (
    <ThemeCtx.Provider value={C}>
    <div className="relative w-full overflow-x-hidden" style={{ background: C.cream, color: C.greenText, fontFamily: F.body }}>
      <style>{`
        @keyframes paFade { from { opacity: 0; transform: translateY(18px);} to { opacity: 1; transform: translateY(0);} }
        @keyframes paSpin { to { transform: rotate(360deg);} }
      `}</style>

      {data.musicUrl && <audio ref={audioRef} src={data.musicUrl} loop />}

      {/* Botón música */}
      {data.musicUrl && (<button onClick={toggleMusic} className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
        style={{ background: C.green, color: C.gold, border: `1px solid ${C.gold}` }} aria-label="Música">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ animation: playing ? 'paSpin 4s linear infinite' : 'none' }}>
          <path d="M9 17a3 3 0 11-2-2.83V5l11-2v10.17A3 3 0 1116 14V7L9 8.4V17z" />
        </svg>
      </button>)}

      {/* ════════ PORTADA ════════ */}
      <section className="relative px-6 py-16 md:py-0 md:min-h-screen md:flex md:items-center" style={{ background: C.green, color: C.creamText }}>
        <MarbleBg />
        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 md:grid-cols-2">
          {/* Nombres */}
          <div className="order-2 text-center md:order-1 md:text-left md:pl-8" style={{ animation: 'paFade 1s ease' }}>
            <h1 style={{ fontFamily: F.caps, fontSize: 'clamp(44px,8vw,86px)', lineHeight: 0.92, letterSpacing: '0.04em' }}>
              <CascadeText text={data.bride} />
            </h1>
            <p style={{ fontFamily: F.script, color: C.gold, fontSize: 'clamp(30px,5vw,52px)', marginTop: -6 }}><WriteOn delay={300}>{data.brideLast}</WriteOn></p>
            <p style={{ fontFamily: F.caps, fontSize: 'clamp(40px,7vw,72px)', lineHeight: 0.7 }}>&amp;</p>
            <h1 style={{ fontFamily: F.caps, fontSize: 'clamp(44px,8vw,86px)', lineHeight: 0.92, letterSpacing: '0.04em' }}>
              <CascadeText text={data.groom} delay={520} />
            </h1>
            <p style={{ fontFamily: F.script, color: C.gold, fontSize: 'clamp(30px,5vw,52px)', marginTop: -6 }}><WriteOn delay={800}>{data.groomLast}</WriteOn></p>
          </div>

          {/* Foto + fecha/ciudad verticales */}
          <div className="order-1 flex items-center justify-center gap-4 md:order-2">
            <span className="hidden text-[13px] tracking-[0.35em] sm:block" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: C.creamText }}>{data.dateLabel}</span>
            <ArchPhoto src={data.coverImage} first={data.bride} second={data.groom} className="w-[min(78vw,360px)]" style={{ aspectRatio: '3 / 4' }} />
            <span className="hidden text-[13px] tracking-[0.35em] sm:block" style={{ writingMode: 'vertical-rl', color: C.creamText }}>{data.city}</span>
          </div>
        </div>
      </section>

      {/* ════════ INTRO + INVITADO ════════ */}
      <section className="relative px-6 py-16 text-center" style={{ background: C.greenDeep, color: C.creamText }}>
        <MarbleBg />
        <Reveal className="relative z-10 mx-auto max-w-2xl">
          <p style={{ fontSize: '18px', lineHeight: 1.7 }}>{data.introMessage}</p>
          {data.guestName && <Script className="mt-6" style={{ fontSize: '40px' }}>{data.guestName}</Script>}
          {data.guestPasses && (
            <div className="mt-3">
              <p style={{ fontSize: '17px' }}>Hemos reservado:</p>
              <Script style={{ fontSize: '38px' }}>{data.guestPasses}</Script>
              <p style={{ fontSize: '16px' }}>en su honor</p>
            </div>
          )}
        </Reveal>
      </section>

      {/* ════════ VERSÍCULO ════════ */}
      <section className="px-6 py-16 text-center" style={{ background: C.cream, color: C.greenText }}>
        <Reveal className="mx-auto flex max-w-2xl flex-col items-center">
          <BookCross color={C.greenText} className="mb-6 h-12 w-14" />
          <p style={{ fontSize: '17px', lineHeight: 1.7 }}>
            «{data.verse}» {data.verseRef && <span className="whitespace-nowrap">{data.verseRef}</span>}
          </p>
        </Reveal>
      </section>

      {/* ════════ CUENTA REGRESIVA ════════ */}
      <section className="relative px-6 py-16" style={{ background: C.green, color: C.creamText }}>
        <MarbleBg />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
          <Reveal className="text-center">
            <Script style={{ fontSize: '40px' }}>Faltan</Script>
            <div className="mt-4 rounded-2xl px-4 py-6" style={{ border: `1px solid ${C.creamText}` }}>
              <div className="grid grid-cols-4 gap-2">
                {cd.map(c => (
                  <div key={c.l}>
                    <p style={{ fontFamily: F.serif, fontSize: 'clamp(26px,5vw,40px)', lineHeight: 1 }}><Odometer value={c.v} /></p>
                    <p className="mt-1" style={{ fontSize: '12px', opacity: 0.85 }}>{c.l}</p>
                  </div>
                ))}
              </div>
            </div>
            <a href={gcalUrl} target="_blank" rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-lg px-7 py-3 text-[14px] transition-opacity hover:opacity-90"
              style={{ background: C.greenDeep, color: C.creamText }}>
              <CalIcon color={C.creamText} /> Agendar el Evento
            </a>
          </Reveal>
          <Reveal delay={120} className="flex justify-center">
            <ArchPhoto src={data.secondaryImage} first={data.bride} second={data.groom} className="w-[min(72vw,330px)]" style={{ aspectRatio: '4 / 5' }} />
          </Reveal>
        </div>
      </section>

      {/* ════════ PADRES ════════ */}
      <section className="px-6 py-16 text-center" style={{ background: C.cream, color: C.greenText }}>
        <Reveal>
          <CapsTitle style={{ fontSize: 'clamp(16px,2.4vw,22px)', color: C.greenText }}>{data.blessing}</CapsTitle>
          <div className="mx-auto mt-10 grid max-w-3xl gap-10 sm:grid-cols-2">
            {[{ t: 'Padres de la Novia', p: data.parentsBride }, { t: 'Padres del Novio', p: data.parentsGroom }].map(col => (
              <div key={col.t}>
                <Script style={{ fontSize: '32px', color: C.greenText }}>{col.t}</Script>
                <div className="mt-3 space-y-1" style={{ fontSize: '17px' }}>
                  {col.p.map((n, i) => <p key={i}>{n}</p>)}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ════════ CEREMONIA + VESTIMENTA ════════ */}
      <section className="relative px-6 py-16" style={{ background: C.greenDeep, color: C.creamText }}>
        <MarbleBg />
        <div className="relative z-10 mx-auto grid max-w-4xl gap-12 sm:grid-cols-2">
          {[
            { icon: 'church', title: 'Ceremonia Religiosa', c: data.ceremonyReligious },
            ...(data.ceremonyCivil ? [{ icon: 'rings', title: 'Ceremonia Civil', c: data.ceremonyCivil }] : []),
          ].map((b, i) => (
            <Reveal key={b.title} className="flex flex-col items-center text-center">
              <EventIcon name={b.icon} className="mb-3 h-14 w-14" stroke={C.creamText} custom={data} sec={i === 0 ? 'ceremony' : 'reception'} />
              <Script style={{ fontSize: '34px' }}>{b.title}</Script>
              <div className="mt-3 flex items-center justify-center gap-3" style={{ fontSize: '16px' }}>
                <span>{b.c.time}</span>
                <span style={{ width: 1, height: 30, background: C.creamText, opacity: 0.5 }} />
                <span className="text-left">{b.c.place}</span>
              </div>
              <a href={b.c.maps} target="_blank" rel="noopener noreferrer"
                className="mt-5 inline-block rounded-lg px-6 py-2.5 text-[13px] transition-opacity hover:opacity-90"
                style={{ background: C.greenDeep, color: C.creamText, border: `1px solid ${C.creamText}` }}>
                Ver ubicación
              </a>
            </Reveal>
          ))}
        </div>
        <Reveal className="relative z-10 mt-14 flex flex-col items-center text-center">
          <EventIcon name="dress" className="mb-3 h-16 w-16" stroke={C.creamText} custom={data} sec="dress" />
          <Script style={{ fontSize: '32px' }}>Vestimenta</Script>
          <p className="mt-1" style={{ fontSize: '17px' }}>{data.dressCode}</p>
        </Reveal>
      </section>

      {/* ════════ CRONOGRAMA (TIMELINE) ════════ */}
      <section className="relative px-6 py-16" style={{ background: C.greenDeep, color: C.creamText }}>
        <MarbleBg />
        <Reveal className="relative z-10">
          <Script className="text-center" style={{ fontSize: '44px' }}>Cronograma</Script>
          <div className="relative mx-auto mt-10 max-w-2xl">
            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2" style={{ background: C.gold }} />
            <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full" style={{ background: C.gold }} />
            <span className="absolute left-1/2 bottom-0 h-2 w-2 -translate-x-1/2 rounded-full" style={{ background: C.gold }} />
            {data.itinerary.map((it, i) => {
              const right = i % 2 === 0;
              return (
                <div key={i} className="relative grid grid-cols-2 items-center" style={{ minHeight: 108 }}>
                  <div className={right ? '' : 'flex flex-col items-center'}>
                    {!right && <TimelineItem icon={it.icon} label={it.label} time={it.time} color={C.creamText} line={C.gold} colors={it.iconColors} speed={it.iconSpeed} />}
                  </div>
                  <div className={right ? 'flex flex-col items-center' : ''}>
                    {right && <TimelineItem icon={it.icon} label={it.label} time={it.time} color={C.creamText} line={C.gold} colors={it.iconColors} speed={it.iconSpeed} />}
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </section>

      {/* ════════ REGALOS ════════ */}
      <section className="px-6 py-16 text-center" style={{ background: C.cream, color: C.greenText }}>
        <Reveal className="mx-auto max-w-4xl">
          <EventIcon name="gift" className="mx-auto mb-4 h-12 w-12" stroke={C.greenText} custom={data} sec="gift" />
          <Script style={{ fontSize: '38px', color: C.greenText }}>Sugerencia de Regalo</Script>
          <p className="mx-auto mt-4 max-w-lg" style={{ fontSize: '16px', lineHeight: 1.6 }}>{data.giftMessage}</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {data.giftRegistryUrl && (
              <div className="flex flex-col items-center justify-center rounded-2xl px-6 py-10" style={{ border: `1px solid ${C.greenText}` }}>
                <p style={{ fontFamily: F.serif, fontSize: '40px', fontWeight: 700, color: C.greenText }}>{data.giftRegistryLabel}</p>
                <a href={data.giftRegistryUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-6 rounded-lg px-7 py-3 text-[14px] transition-opacity hover:opacity-90"
                  style={{ background: C.greenDeep, color: C.creamText }}>Ver la Mesa de Regalos</a>
              </div>
            )}
            {data.giftQrUrl && (
              <div className="flex flex-col items-center justify-center rounded-2xl px-6 py-8" style={{ border: `1px solid ${C.greenText}` }}>
                <p style={{ fontFamily: F.serif, fontSize: '18px' }}>Transferencia QR</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.giftQrUrl} alt="QR" className="mt-3 h-40 w-40 rounded-lg bg-white p-2" />
              </div>
            )}
          </div>
        </Reveal>
      </section>

      {/* ════════ HOSPEDAJE + SOLO ADULTOS + GALERÍA ════════ */}
      <section className="relative px-6 py-16" style={{ background: C.green, color: C.creamText }}>
        <MarbleBg />
        <div className="relative z-10 mx-auto max-w-4xl">
          {data.lodging.length > 0 && (
            <Reveal className="mx-auto max-w-md rounded-3xl p-6 text-center" style={{ background: C.greenDeep }}>
              <Script style={{ fontSize: '32px' }}>{data.lodgingTitle ?? 'Sugerencia de hospedaje'}</Script>
              <div className="relative mt-4 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.lodging[0].image} alt="" className="h-72 w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 px-4 text-center">
                  <CapsTitle style={{ fontSize: 'clamp(18px,3vw,26px)', color: '#fff' }}>{data.lodging[0].name}</CapsTitle>
                </div>
              </div>
            </Reveal>
          )}

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Reveal className="rounded-2xl p-7 text-center" style={{ background: C.greenDeep }}>
              <BabyNo color={C.creamText} className="mx-auto mb-3 h-14 w-14" />
              <Script style={{ fontSize: '30px' }}>Solo Adultos</Script>
              <p className="mt-2" style={{ fontSize: '15px', lineHeight: 1.6 }}>{data.noKids}</p>
            </Reveal>
            <Reveal delay={100} className="flex flex-col items-center rounded-2xl p-7 text-center" style={{ background: C.greenDeep }}>
              <EventIcon name="camera" className="mb-3 h-12 w-12" stroke={C.creamText} custom={data} sec="gallery" />
              <p style={{ fontSize: '15px', lineHeight: 1.6 }}>{data.galleryMsg}</p>
              <a href={data.galleryUrl} target="_blank" rel="noopener noreferrer"
                className="mt-5 rounded-full px-6 py-2.5 text-[13px] transition-opacity hover:opacity-90"
                style={{ border: `1px solid ${C.creamText}`, color: C.creamText }}>Compartir fotografías</a>
            </Reveal>
          </div>

          <PhotoGrid images={data.galleryImages} className="mx-auto mt-8 max-w-2xl" />
        </div>
      </section>

      {/* ════════ CONFIRMACIÓN ════════ */}
      <section className="px-6 py-16 text-center" style={{ background: C.cream, color: C.greenText }}>
        <Reveal className="mx-auto max-w-2xl">
          <p style={{ fontSize: '17px', lineHeight: 1.7 }}>{data.rsvpMessage}</p>
          <a href={data.whatsapp} target="_blank" rel="noopener noreferrer"
            className="mt-7 inline-block rounded-lg px-8 py-3 text-[15px] transition-opacity hover:opacity-90"
            style={{ background: C.greenDeep, color: C.creamText }}>Confirmar Asistencia</a>
          <CapsTitle className="mx-auto mt-8 max-w-xl" style={{ fontSize: 'clamp(18px,2.6vw,26px)', color: C.greenText }}>{data.rsvpClosing}</CapsTitle>
        </Reveal>
      </section>

      {/* ════════ FOTO FINAL + PIE ════════ */}
      <Wave fill={C.cream} flip />
      <section className="relative" style={{ background: C.greenDeep }}>
        {data.footerImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.footerImage} alt="" className="h-[60vh] w-full object-cover object-top" />
        )}
        <footer className="py-8 text-center" style={{ background: C.greenDeep, color: C.creamText }}>
          <p style={{ fontFamily: F.script, fontSize: '34px', color: C.gold }}>Enkarta</p>
          <p className="mt-1" style={{ fontSize: '14px', opacity: 0.8 }}>
            ¿Deseas una invitación para tu evento? <span style={{ fontWeight: 700 }}>Contáctanos</span>
          </p>
        </footer>
      </section>
    </div>
    </ThemeCtx.Provider>
  );
}

// ── Ítem del cronograma ───────────────────────────────────────────────────────────
function TimelineItem({ icon, label, time, color, line, colors, speed }: { icon?: string; label: string; time: string; color: string; line: string; colors?: Record<string, string>; speed?: number }) {
  return (
    <div className="flex flex-col items-center px-3 text-center">
      <EventIcon name={icon ?? 'rings'} className="h-12 w-12" stroke={color} lottieColors={colors} speed={speed} />
      <p className="mt-2" style={{ fontFamily: F.body, fontSize: '16px', color }}>{label}</p>
      <span className="my-1 block h-px w-16" style={{ borderTop: `1px dashed ${line}` }} />
      <p style={{ fontFamily: F.body, fontSize: '16px', color }}>{time}</p>
    </div>
  );
}
