'use client';

import { useEffect, useRef, useState, useContext, createContext } from 'react';
import { GraziaContent, TemplateTheme } from './types';
import { useCountdown, Odometer, Reveal, EventIcon, MasonryGallery, CalIcon, Monogram, SECTION, TYPE, ENKARTA_WA_URL } from './shared';
import { WriteOn, CascadeText } from '@/lib/scroll-motion';

// ── Paleta por defecto ──────────────────────────────────────────────────────────
const DEFAULT_C = {
  paper: '#fdfcf8',
  tan: '#bca478',       // champagne (bandas / botones)
  tanSoft: '#d6c096',
  gold: '#b6985f',      // dorado (script / iconos / contornos)
  ink: '#2c2c27',       // texto
  black: '#1b1b18',     // banda código de vestimenta + pie
  cream: '#f7f2e7',     // texto sobre tan/negro
  gray: '#f2f0ea',      // bandas gris claro
  line: 'rgba(182,152,95,0.6)',
};
type GZPalette = typeof DEFAULT_C;

const ThemeCtx = createContext<GZPalette>(DEFAULT_C);
const useC = () => useContext(ThemeCtx);

function resolveGraziaTheme(t?: TemplateTheme): GZPalette {
  return {
    paper:   t?.bg          || DEFAULT_C.paper,
    tan:     t?.primary     || DEFAULT_C.tan,
    tanSoft: DEFAULT_C.tanSoft,
    gold:    t?.primary     || DEFAULT_C.gold,
    ink:     t?.text        || DEFAULT_C.ink,
    black:   t?.primaryDeep || DEFAULT_C.black,
    cream:   t?.onPrimary   || DEFAULT_C.cream,
    gray:    DEFAULT_C.gray,
    line:    t?.line        || DEFAULT_C.line,
  };
}

const F = {
  caps: "'Cormorant Garamond', serif",
  script: "'Great Vibes', cursive",
  body: "'Cormorant Garamond', serif",
};

function Script({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return <p className={className} style={{ fontFamily: F.script, color: C.gold, lineHeight: 1, ...style }}>{children}</p>;
}
function Caps({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <h3 className={className} style={{ fontFamily: F.caps, letterSpacing: '0.18em', textTransform: 'uppercase', lineHeight: 1.5, fontWeight: 500, ...style }}>{children}</h3>;
}
function TanBtn({ children, href, filled = true }: { children: React.ReactNode; href: string; filled?: boolean }) {
  const C = useC();
  const style: React.CSSProperties = filled
    ? { background: C.tan, color: C.cream, border: `1px solid ${C.tan}` }
    : { background: 'transparent', color: C.tan, border: `1px solid ${C.tan}` };
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-md px-7 py-2.5 text-[12px] tracking-[0.1em] transition-all duration-300 hover:brightness-105"
      style={{ ...style, fontFamily: F.body }}>
      {children}
    </a>
  );
}

export default function Grazia({ data }: { data: GraziaContent }) {
  const { days, hours, mins, secs } = useCountdown(data.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const C = resolveGraziaTheme(data.theme);

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

  return (
    <ThemeCtx.Provider value={C}>
    <div className="relative w-full overflow-x-hidden" style={{ background: C.paper, color: C.ink, fontFamily: F.body }}>
      <style>{`@keyframes gzSpin{to{transform:rotate(360deg)}} @keyframes gzFade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {data.musicUrl && <audio ref={audioRef} src={data.musicUrl} loop />}
      {data.musicUrl && (<button onClick={toggleMusic} className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
        style={{ background: C.paper, color: C.tan, border: `1px solid ${C.tan}` }} aria-label="Música">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ animation: playing ? 'gzSpin 4s linear infinite' : 'none' }}>
          <path d="M9 17a3 3 0 11-2-2.83V5l11-2v10.17A3 3 0 1116 14V7L9 8.4V17z" />
        </svg>
      </button>)}

      {/* ════════ PORTADA ════════ */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        {data.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover ek-kenburns" />
        )}
        <div className="relative z-10 flex flex-col items-center justify-center rounded-full px-10 py-12 text-center"
          style={{ background: 'rgba(253,252,248,0.96)', width: 'min(80vw,320px)', height: 'min(80vw,320px)', animation: 'gzFade 1.2s ease' }}>
          <Script style={{ fontSize: '28px', color: C.ink }}><WriteOn>{data.coverLabel ?? 'La boda de'}</WriteOn></Script>
          <Caps style={{ fontSize: TYPE.subtitle, color: C.ink }}><CascadeText text={data.groom} delay={350} /></Caps>
          <div className="my-1 flex items-center gap-3"><span className="h-px w-8" style={{ background: C.ink }} /><span style={{ fontFamily: F.script, fontSize: 22, color: C.ink }}>&amp;</span><span className="h-px w-8" style={{ background: C.ink }} /></div>
          <Caps style={{ fontSize: TYPE.subtitle, color: C.ink }}><CascadeText text={data.bride} delay={700} /></Caps>
          <Caps className="mt-3" style={{ fontSize: '11px', color: C.ink }}>{data.dateText}</Caps>
        </div>
      </section>

      {/* ════════ SAVE THE DATE ════════ */}
      <section className={`px-6 ${SECTION.base} text-center`} style={{ background: C.paper }}>
        <Reveal className="mx-auto max-w-2xl">
          <Caps style={{ fontSize: TYPE.title, color: C.ink }}>Save the Date</Caps>
          <p className="mx-auto mt-5 max-w-lg" style={{ fontFamily: F.body, fontSize: TYPE.lead, color: C.ink, lineHeight: 1.6 }}>{data.saveDateMsg}</p>

          <div className="mt-10 flex items-start justify-center gap-8 sm:gap-16">
            {[{ img: data.groomPhoto, name: data.groomName }, { img: data.bridePhoto, name: data.brideName }].map((p, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="overflow-hidden rounded-full" style={{ width: 'min(34vw,160px)', height: 'min(34vw,160px)' }}>
                  {p.img
                    ? // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.img} alt="" className="h-full w-full object-cover" />
                    : <Monogram name={p.name} bg={C.gray} fg={C.gold} ring={C.line} />}
                </div>
                <Script className="mt-4" style={{ fontSize: '26px', color: C.ink }}>{p.name}</Script>
              </div>
            ))}
          </div>

          <Caps className="mt-12" style={{ fontSize: TYPE.subtitle, color: C.ink }}>{data.dateText}</Caps>
          <p className="mt-1" style={{ fontFamily: F.caps, fontSize: '20px', letterSpacing: '0.05em', color: C.ink }}>{data.timeText}</p>

          <div className="mx-auto mt-6 max-w-sm rounded-2xl px-4 py-4" style={{ border: `1px solid ${C.line}` }}>
            <p className="text-[12px] tracking-[0.25em]" style={{ fontFamily: F.caps, textTransform: 'uppercase', color: C.gold }}>Faltan</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {cd.map(c => (
                <div key={c.l}>
                  <p style={{ fontFamily: F.caps, fontSize: '26px', fontWeight: 600, lineHeight: 1, color: C.ink }}><Odometer value={c.v} /></p>
                  <p className="text-[11px]" style={{ color: C.ink }}>{c.l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-7"><TanBtn href={gcal}><CalIcon />Agendar el evento</TanBtn></div>
        </Reveal>
      </section>

      {/* ════════ INVITADO (tan) ════════ */}
      <section className={`px-6 ${SECTION.tight} text-center`} style={{ background: C.tan, color: C.cream }}>
        <Reveal className="mx-auto max-w-xl">
          {data.guestName && <Script style={{ fontSize: '42px', color: C.cream }}>{data.guestName}</Script>}
          <p style={{ fontSize: '15px' }}>Hemos reservado:</p>
          {data.guestPasses && <Script style={{ fontSize: '36px', color: C.cream }}>{data.guestPasses}</Script>}
          <p style={{ fontSize: '14px' }}>en su honor</p>
        </Reveal>
      </section>

      {/* ════════ PADRES + CEREMONIA ════════ */}
      <section className={`px-6 ${SECTION.base}`} style={{ background: C.paper }}>
        <div className="mx-auto max-w-3xl">
          <Reveal className="grid gap-10 text-center sm:grid-cols-2">
            {[{ t: 'Padres del Novio', p: data.parentsGroom }, { t: 'Padres de la Novia', p: data.parentsBride }].map(col => (
              <div key={col.t}>
                <Script style={{ fontSize: '24px' }}>{col.t}</Script>
                <div className="mt-2 space-y-1">{col.p.map((n, i) => <Caps key={i} style={{ fontSize: '14px', color: C.ink }}>{n}</Caps>)}</div>
              </div>
            ))}
          </Reveal>

          <Reveal className="relative mt-14 grid gap-10 text-center sm:grid-cols-2">
            <span className="absolute left-1/2 top-2 bottom-2 hidden w-px -translate-x-1/2 sm:block" style={{ background: C.line }} />
            {[
              { title: 'Ceremonia Religiosa', c: data.ceremonyReligious },
              ...(data.reception ? [{ title: 'Recepción Social', c: data.reception }] : []),
            ].map(b => (
              <div key={b.title} className="flex flex-col items-center">
                <Script style={{ fontSize: '24px' }}>{b.title}</Script>
                <Caps className="mt-1" style={{ fontSize: '18px', color: C.ink }}>{b.c.date}</Caps>
                <p className="mt-3" style={{ fontFamily: F.body, fontSize: TYPE.body, color: C.ink }}>{b.c.place}</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="rounded px-4 py-2 text-[13px]" style={{ border: `1px solid ${C.line}`, color: C.ink, fontFamily: F.body }}>{b.c.time}</span>
                  <TanBtn href={b.c.maps}>Ubicación</TanBtn>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ════════ ITINERARIO ════════ */}
      <section className={`px-6 ${SECTION.tight}`} style={{ background: C.paper }}>
        <Reveal className="mx-auto max-w-5xl">
          <Caps className="text-center" style={{ fontSize: TYPE.title, color: C.ink }}>Itinerario</Caps>
          <div className="mt-10 grid grid-cols-2 gap-y-9 sm:grid-cols-4 lg:grid-cols-8">
            {data.itinerary.map((it, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <EventIcon name={it.icon ?? 'rings'} className="h-10 w-10" stroke={C.gold} custom={data} lottieColors={it.iconColors} speed={it.iconSpeed} />
                <span className="my-2 block h-px w-14" style={{ background: C.line }} />
                <p style={{ fontFamily: F.caps, fontSize: '17px', color: C.gold }}>{it.time}</p>
                <p className="mt-1 text-[12px]" style={{ fontFamily: F.body, color: C.ink }}>{it.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ════════ HOSPEDAJE ════════ */}
      {data.lodging.length > 0 && (
        <section className={`px-6 ${SECTION.tight}`} style={{ background: C.paper }}>
          <Reveal className="mx-auto max-w-2xl rounded-sm px-6 py-8 text-center" style={{ border: `1px solid ${C.line}` }}>
            <Caps style={{ fontSize: '15px', color: C.ink }}>{data.lodgingTitle ?? 'Sugerencia de hospedaje'}</Caps>
            <p className="mx-auto mt-4 max-w-md" style={{ fontFamily: F.body, fontSize: TYPE.body, color: C.ink, lineHeight: 1.5 }}>{data.lodging[0].desc}</p>
            <div className="mt-5"><TanBtn href="#" filled={false}>Descuento especial</TanBtn></div>
            {data.lodgingContact && <p className="mt-4" style={{ fontFamily: F.body, fontSize: TYPE.body, color: C.ink }}>{data.lodgingContact}</p>}
          </Reveal>
        </section>
      )}

      {/* ════════ REGALO (gris) ════════ */}
      <section className={`px-6 ${SECTION.base} text-center`} style={{ background: C.gray }}>
        <Reveal className="mx-auto max-w-2xl">
          <Script style={{ fontSize: '46px' }}>Sugerencia de Regalo</Script>
          <p className="mx-auto mt-3 max-w-lg" style={{ fontFamily: F.body, fontSize: TYPE.body, color: C.ink, lineHeight: 1.5 }}>{data.giftMessage}</p>
          <div className="mt-6 space-y-3">
            {data.giftAccounts.map((a, i) => (
              <div key={i}>
                <Caps style={{ fontSize: '15px', color: C.ink }}>{a.name}</Caps>
                <p style={{ fontFamily: F.body, fontSize: TYPE.body, color: C.ink }}>{a.account}</p>
              </div>
            ))}
          </div>
          {data.giftQrUrl && (
            <div className="mx-auto mt-6 inline-block rounded-2xl p-2" style={{ border: `1px solid ${C.line}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.giftQrUrl} alt="QR" className="h-36 w-36 rounded-lg bg-white p-1" />
            </div>
          )}
        </Reveal>
      </section>

      {/* ════════ NUESTRA HISTORIA + GALERÍA ════════ */}
      {data.galleryImages.length > 0 && (
        <section className={`px-6 ${SECTION.base}`} style={{ background: C.paper }}>
          <Reveal className="mx-auto max-w-4xl text-center">
            <Script style={{ fontSize: '44px' }}>{data.storyTitle ?? 'Nuestra Historia'}</Script>
            <p className="mx-auto mt-4 max-w-xl" style={{ fontFamily: F.body, fontSize: TYPE.body, color: C.ink, lineHeight: 1.6 }}>{data.storyMessage}</p>
            <MasonryGallery images={data.galleryImages} variant="rounded" className="mt-8" />
          </Reveal>
        </section>
      )}

      {/* ════════ SOLO ADULTOS (gris) ════════ */}
      <section className={`px-6 ${SECTION.tight} text-center`} style={{ background: C.gray }}>
        <Reveal className="mx-auto max-w-xl">
          <Script style={{ fontSize: '44px' }}>Solo Adultos</Script>
          <p className="mx-auto mt-3 max-w-md" style={{ fontFamily: F.body, fontSize: TYPE.body, color: C.ink, lineHeight: 1.5 }}>{data.noKids}</p>
        </Reveal>
      </section>

      {/* ════════ CÓDIGO DE VESTIMENTA (negro) ════════ */}
      <section className={`px-6 ${SECTION.roomy} text-center`} style={{ background: C.black, color: C.cream }}>
        <Reveal>
          <Script style={{ fontSize: '40px', color: C.gold }}>{data.dressCodeTitle ?? 'Código de vestimenta'}</Script>
          <p className="mt-2" style={{ fontFamily: F.caps, fontSize: '24px', letterSpacing: '0.08em', color: C.cream }}>{data.dressCode}</p>
        </Reveal>
      </section>

      {/* ════════ GALERÍA SHARE + CONFIRMACIÓN ════════ */}
      <section className={`px-6 ${SECTION.base} text-center`} style={{ background: C.paper }}>
        <Reveal className="mx-auto max-w-md rounded-sm px-6 py-8 text-center" style={{ border: `1px solid ${C.line}` }}>
          <EventIcon name="camera" className="mx-auto mb-3 h-11 w-11" stroke={C.tan} custom={data} sec="gallery" />
          <p style={{ fontFamily: F.body, fontSize: TYPE.body, color: C.ink, lineHeight: 1.5 }}>{data.galleryMsg}</p>
          <div className="mt-5"><TanBtn href={data.galleryUrl}>Compartir fotografías</TanBtn></div>
        </Reveal>

        <Reveal className="mx-auto mt-12 max-w-lg">
          <Script style={{ fontSize: '44px' }}>Confirmar asistencia</Script>
          <p className="mx-auto mt-3 max-w-md" style={{ fontFamily: F.body, fontSize: TYPE.body, color: C.ink, lineHeight: 1.5 }}>{data.rsvpMessage}</p>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.6" className="mx-auto my-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 14l6 6 6-6" />
          </svg>
          <TanBtn href={data.whatsapp}>Confirmar</TanBtn>
        </Reveal>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="py-9 text-center" style={{ background: C.black, color: C.cream }}>
        <Script style={{ fontSize: '34px', color: C.gold }}>Enkarta</Script>
        <p className="mt-1" style={{ fontFamily: F.body, fontSize: '14px', opacity: 0.85 }}>
          ¿Deseas una invitación para tu evento? <a href={ENKARTA_WA_URL} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: C.gold, textDecoration: 'underline', textUnderlineOffset: 3 }}>Contáctanos</a>
        </p>
      </footer>
    </div>
    </ThemeCtx.Provider>
  );
}
