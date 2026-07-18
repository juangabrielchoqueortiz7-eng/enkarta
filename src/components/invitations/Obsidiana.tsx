'use client';

import { useEffect, useRef, useState, useContext, createContext } from 'react';
import { ObsidianaContent, TemplateTheme } from './types';
import { useCountdown, Odometer, Reveal, EventIcon, MasonryGallery, CalIcon, SECTION, TYPE } from './shared';
import { WriteOn } from '@/lib/scroll-motion';

// ── Paleta por defecto ──────────────────────────────────────────────────────────
const DEFAULT_C = {
  black: '#100f0c',
  panel: '#16140f',
  olive: '#3a3d24',     // bandas / tarjetas verde oliva oscuro
  gold: '#c6a86a',
  goldSoft: '#e7d39b',
  cream: '#ece6d6',
  creamDim: 'rgba(236,230,214,0.72)',
  line: 'rgba(198,168,106,0.55)',
};
type ObsidianaPalette = typeof DEFAULT_C;

const ThemeCtx = createContext<ObsidianaPalette>(DEFAULT_C);
const useC = () => useContext(ThemeCtx);

function resolveObsidianaTheme(t?: TemplateTheme): ObsidianaPalette {
  return {
    black:    t?.bg          || DEFAULT_C.black,
    panel:    DEFAULT_C.panel,
    olive:    t?.primaryDeep || DEFAULT_C.olive,
    gold:     t?.primary     || DEFAULT_C.gold,
    goldSoft: DEFAULT_C.goldSoft,
    cream:    t?.text || t?.onPrimary || DEFAULT_C.cream,
    creamDim: DEFAULT_C.creamDim,
    line:     t?.line        || DEFAULT_C.line,
  };
}

const F = {
  caps: "'Cinzel', serif",
  serif: "'Cormorant Garamond', serif",
  script: "'Great Vibes', cursive",
  body: "'Nunito', sans-serif",
};

// ── Veteado de mármol dorado ──────────────────────────────────────────────────────
function MarbleVeins() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.09]" preserveAspectRatio="none" viewBox="0 0 400 800" fill="none" stroke="#ffffff" strokeWidth="0.8" aria-hidden>
      <path d="M-20 120 C 120 80, 200 220, 420 160" />
      <path d="M-20 360 C 140 320, 260 460, 420 380" opacity="0.7" />
      <path d="M-20 600 C 120 560, 240 700, 420 620" opacity="0.6" />
      <path d="M80 -20 C 60 200, 140 420, 100 820" opacity="0.5" />
      <path d="M320 -20 C 360 220, 280 460, 340 820" opacity="0.5" />
    </svg>
  );
}

// ── Fronda de palmera dorada ───────────────────────────────────────────────────────
function Frond({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const C = useC();
  const leaf = (y: number, len: number, dir: number, o: number) => (
    <path d={`M60 ${y} q ${dir * len * 0.5} ${-len * 0.5} ${dir * len} ${-len * 0.18}`} stroke={C.gold} strokeWidth="2.2" opacity={o} strokeLinecap="round" />
  );
  return (
    <svg viewBox="0 0 120 220" className={className} style={style} fill="none" aria-hidden>
      <path d="M60 220 C 56 150, 60 80, 62 8" stroke={C.gold} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      {Array.from({ length: 11 }).map((_, i) => {
        const y = 26 + i * 17, len = 46 - i * 2.6, o = 0.9 - i * 0.045;
        return <g key={i}>{leaf(y, len, -1, o)}{leaf(y, len, 1, o)}</g>;
      })}
    </svg>
  );
}

// ── Tipografías ────────────────────────────────────────────────────────────────
function Script({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const C = useC();
  return <p className={className} style={{ fontFamily: F.script, color: C.goldSoft, lineHeight: 1, ...style }}>{children}</p>;
}
function Caps({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <h3 className={className} style={{ fontFamily: F.serif, letterSpacing: '0.14em', textTransform: 'uppercase', lineHeight: 1.45, ...style }}>{children}</h3>;
}

// ── Botones ────────────────────────────────────────────────────────────────────
function OliveBtn({ children, href }: { children: React.ReactNode; href: string }) {
  const C = useC();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-xl px-7 py-3 text-[13px] tracking-[0.12em] uppercase transition-all duration-300 hover:brightness-110"
      style={{ background: C.olive, color: C.goldSoft, border: `1px solid ${C.gold}`, fontFamily: F.body }}>
      {children}
    </a>
  );
}
function GoldBtn({ children, href }: { children: React.ReactNode; href: string }) {
  const C = useC();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-block rounded-2xl px-7 py-3 text-[13px] transition-all duration-300 hover:bg-[rgba(198,168,106,0.12)]"
      style={{ border: `1px solid ${C.gold}`, color: C.cream, fontFamily: F.body }}>
      {children}
    </a>
  );
}

// ── Marco dorado doble inclinado ──────────────────────────────────────────────────
function GoldFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const C = useC();
  return (
    <div className={`relative inline-block px-9 py-11 ${className}`}>
      <span className="absolute inset-0" style={{ border: `1px solid ${C.gold}`, transform: 'rotate(-2.6deg)' }} aria-hidden />
      <span className="absolute inset-0" style={{ border: `1px solid ${C.gold}`, transform: 'rotate(1.6deg)', opacity: 0.55 }} aria-hidden />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ── Ola divisoria (para bandas oliva) ─────────────────────────────────────────────
function Wave({ fill, flip = false }: { fill: string; flip?: boolean }) {
  return (
    <div className="relative w-full leading-[0]" style={{ marginTop: flip ? -1 : 0, marginBottom: flip ? 0 : -1 }} aria-hidden>
      <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="block w-full" style={{ height: 42, transform: flip ? 'rotate(180deg)' : 'none' }}>
        <path d="M0,30 C 360,60 1080,4 1440,30 L1440,60 L0,60 Z" fill={fill} />
      </svg>
    </div>
  );
}

// ── Ícono sobre con $ (lluvia de sobres) ──────────────────────────────────────────
function EnvelopeMoney({ color, className = '' }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 52" className={className} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 16 32 34 56 16" />
      <path d="M8 16h48v28H8z" />
      <path d="M8 44 26 28M56 44 38 28" />
      <path d="M32 22v10M29.5 24.5c0-1.4 1.1-2 2.5-2s2.5.8 2.5 2-1.1 1.7-2.5 1.7-2.5.6-2.5 2 1.1 2 2.5 2 2.5-.6 2.5-2" />
    </svg>
  );
}

export default function Obsidiana({ data }: { data: ObsidianaContent }) {
  const { days, hours, mins, secs } = useCountdown(data.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const C = resolveObsidianaTheme(data.theme);

  useEffect(() => {
    document.body.style.background = C.black;
    return () => { document.body.style.background = ''; };
  }, [C.black]);

  const toggleMusic = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); } else a.play().then(() => setPlaying(true)).catch(() => {});
  };

  const gcal = (() => {
    const s = data.isoDate.replace(/[-:]/g, '').slice(0, 15) + 'Z';
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Boda ${data.bride} & ${data.groom}`)}&dates=${s}/${s}`;
  })();
  const cd = [{ v: days, l: 'Días' }, { v: hours, l: 'Hrs' }, { v: mins, l: 'Mins' }, { v: secs, l: 'Segs' }];

  // Banda de sección
  const Band = ({ tone = 'black', children, className = '' }: { tone?: 'black' | 'olive'; children: React.ReactNode; className?: string }) => (
    <section className={`relative overflow-hidden px-6 ${SECTION.base} ${className}`} style={{ background: tone === 'olive' ? C.olive : C.black, color: C.cream }}>
      {tone === 'black' && <MarbleVeins />}
      {tone === 'black' && <>
        <Frond className="pointer-events-none absolute -right-6 top-10 w-20 opacity-70" style={{ transform: 'rotate(18deg)' }} />
        <Frond className="pointer-events-none absolute -left-8 bottom-12 w-20 opacity-60" style={{ transform: 'rotate(-152deg)' }} />
      </>}
      <div className="relative z-10 mx-auto max-w-3xl">{children}</div>
    </section>
  );

  const timelineItem = (it: { icon?: string; label: string; time: string; iconColors?: Record<string, string>; iconSpeed?: number }) => (
    <div className="flex flex-col items-center px-2 text-center">
      <EventIcon name={it.icon ?? 'rings'} className="h-11 w-11" stroke={C.gold} custom={data} lottieColors={it.iconColors} speed={it.iconSpeed} />
      <p className="mt-2" style={{ fontSize: '15px', color: C.cream }}>{it.label}</p>
      <span className="my-1 block h-px w-14" style={{ borderTop: `1px dashed ${C.line}` }} />
      <p style={{ fontSize: '15px', color: C.goldSoft }}>{it.time}</p>
    </div>
  );

  return (
    <ThemeCtx.Provider value={C}>
    <div className="relative w-full overflow-x-hidden" style={{ background: C.black, color: C.cream, fontFamily: F.body }}>
      <style>{`@keyframes obSpin { to { transform: rotate(360deg);} } @keyframes obFade { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }`}</style>

      {data.musicUrl && <audio ref={audioRef} src={data.musicUrl} loop />}
      {data.musicUrl && (<button onClick={toggleMusic} className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
        style={{ background: C.panel, color: C.gold, border: `1px solid ${C.gold}` }} aria-label="Música">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ animation: playing ? 'obSpin 4s linear infinite' : 'none' }}>
          <path d="M9 17a3 3 0 11-2-2.83V5l11-2v10.17A3 3 0 1116 14V7L9 8.4V17z" />
        </svg>
      </button>)}

      {/* ════════ PORTADA (split foto/panel) ════════ */}
      <section className="relative md:grid md:min-h-screen md:grid-cols-2">
        <div className="relative overflow-hidden h-[44vh] md:h-auto">
          {data.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover ek-kenburns" />
          )}
        </div>
        <div className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-16 text-center" style={{ background: C.black, color: C.cream }}>
          <MarbleVeins />
          <Frond className="pointer-events-none absolute -right-4 bottom-0 w-24 opacity-80" style={{ transform: 'rotate(8deg)' }} />
          <div className="relative z-10" style={{ animation: 'obFade 1.1s ease' }}>
            <GoldFrame>
              <Script style={{ fontSize: TYPE.display }}><WriteOn>{data.bride}</WriteOn></Script>
              <p style={{ fontFamily: F.caps, color: C.cream, fontSize: '20px', margin: '0' }}>&amp;</p>
              <Script style={{ fontSize: TYPE.display }}><WriteOn delay={450}>{data.groom}</WriteOn></Script>
              <div className="mt-5 flex items-center justify-center gap-4" style={{ fontFamily: F.caps, color: C.cream, letterSpacing: '0.08em' }}>
                <span className="text-[12px]">{data.dateWeekday}</span>
                <span style={{ width: 1, height: 38, background: C.gold }} />
                <span style={{ fontFamily: F.serif, fontSize: '46px', lineHeight: 1, color: C.goldSoft }}>{data.dateDay}</span>
                <span style={{ width: 1, height: 38, background: C.gold }} />
                <span className="text-[12px]">{data.dateMonth}</span>
              </div>
              <p className="mt-3 text-[12px] tracking-[0.22em]" style={{ fontFamily: F.caps, color: C.goldSoft }}>{data.datePlace}</p>
            </GoldFrame>
            <p className="mx-auto mt-7 max-w-sm italic" style={{ fontFamily: F.serif, fontSize: TYPE.body, lineHeight: 1.5, color: C.creamDim }}>{data.introMessage}</p>
          </div>
        </div>
      </section>

      {/* ════════ INTRO + INVITADO (oliva) ════════ */}
      <Wave fill={C.olive} />
      <Band tone="olive">
        <Reveal className="text-center">
          <p style={{ fontSize: TYPE.body, color: C.creamDim }}>Bienvenidos a la invitación de nuestra boda</p>
          <div className="mx-auto my-3 flex max-w-xs items-center justify-center gap-3"><span className="h-px flex-1" style={{ background: C.line }} /><span className="h-1 w-1 rounded-full" style={{ background: C.gold }} /><span className="h-px flex-1" style={{ background: C.line }} /></div>
          {data.guestName && <Script style={{ fontSize: '42px' }}>{data.guestName}</Script>}
          {data.guestPasses && (
            <div className="mt-1">
              <p style={{ fontSize: '14px', color: C.creamDim }}>Hemos reservado:</p>
              <Script style={{ fontSize: '36px' }}>{data.guestPasses}</Script>
              <p style={{ fontSize: '13px', color: C.creamDim }}>en su honor</p>
            </div>
          )}
        </Reveal>
      </Band>
      <Wave fill={C.olive} flip />

      {/* ════════ CUENTA REGRESIVA ════════ */}
      <Band>
        <Reveal className="text-center">
          <Script style={{ fontSize: '42px' }}>Faltan</Script>
          <div className="mx-auto mt-4 grid max-w-md grid-cols-4 gap-2 rounded-2xl px-3 py-5" style={{ border: `1px solid ${C.line}` }}>
            {cd.map(c => (
              <div key={c.l}>
                <p style={{ fontFamily: F.serif, fontSize: 'clamp(28px,7vw,40px)', color: C.goldSoft, lineHeight: 1 }}><Odometer value={c.v} /></p>
                <p className="mt-1 text-[12px]" style={{ color: C.creamDim }}>{c.l}</p>
              </div>
            ))}
          </div>
          <div className="mt-6"><OliveBtn href={gcal}><CalIcon />Agendar el evento</OliveBtn></div>
          <Frond className="mx-auto mt-10 w-16 opacity-90" style={{ transform: 'rotate(90deg)' }} />
        </Reveal>
      </Band>

      {/* ════════ PADRES ════════ */}
      <Band>
        <Reveal className="text-center">
          <Caps style={{ fontSize: 'clamp(15px,2.4vw,21px)', color: C.cream }}>{data.blessing}</Caps>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {[{ t: 'Padres del Novio', p: data.parentsGroom }, { t: 'Padres de la Novia', p: data.parentsBride }].map(col => (
              <div key={col.t}>
                <p style={{ fontFamily: F.serif, fontSize: '20px', letterSpacing: '0.05em', color: C.goldSoft }}>{col.t}</p>
                <div className="mt-2 space-y-1" style={{ fontSize: TYPE.body, color: C.cream }}>{col.p.map((n, i) => <p key={i}>{n}</p>)}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </Band>

      {/* ════════ CEREMONIA + RECEPCIÓN + VESTIMENTA ════════ */}
      <Band>
        <div className="grid gap-12 sm:grid-cols-2">
          {[
            { icon: 'church', title: 'Ceremonia Religiosa', c: data.ceremonyReligious },
            ...(data.reception ? [{ icon: 'cheers', title: 'Recepción', c: data.reception }] : []),
          ].map((b, i) => (
            <Reveal key={b.title} className="flex flex-col items-center text-center">
              <EventIcon name={b.icon} className="mb-3 h-14 w-14" stroke={C.gold} custom={data} sec={i === 0 ? 'ceremony' : 'reception'} />
              <Caps style={{ fontSize: '19px', color: C.cream }}>{b.title}</Caps>
              <div className="mt-3 flex items-center justify-center gap-3" style={{ fontSize: '15px' }}>
                <span style={{ fontFamily: F.serif, fontSize: '22px', color: C.cream }}>{b.c.time}</span>
                <span style={{ width: 1, height: 30, background: C.line }} />
                <span className="max-w-[140px] text-left" style={{ color: C.creamDim }}>{b.c.place}</span>
              </div>
              <div className="mt-5"><OliveBtn href={b.c.maps}>Ver ubicación</OliveBtn></div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-12 flex flex-col items-center text-center">
          <EventIcon name="dress" className="mb-3 h-16 w-16" stroke={C.gold} custom={data} sec="dress" />
          <Caps style={{ fontSize: '18px', color: C.cream }}>Vestimenta</Caps>
          <p className="mt-1" style={{ fontSize: TYPE.body, color: C.creamDim }}>{data.dressCode}</p>
        </Reveal>
      </Band>

      {/* ════════ CRONOGRAMA ════════ */}
      <Band>
        <Reveal>
          <Script className="text-center" style={{ fontSize: '46px' }}>Cronograma</Script>
          <div className="relative mx-auto mt-8 max-w-md">
            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2" style={{ background: C.gold }} />
            <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full" style={{ background: C.gold }} />
            <span className="absolute left-1/2 bottom-0 h-2 w-2 -translate-x-1/2 rounded-full" style={{ background: C.gold }} />
            {data.itinerary.map((it, i) => {
              const right = i % 2 === 0;
              return (
                <div key={i} className="relative grid grid-cols-2 items-center" style={{ minHeight: 104 }}>
                  <div className={right ? '' : 'flex justify-center'}>{!right && timelineItem(it)}</div>
                  <div className={right ? 'flex justify-center' : ''}>{right && timelineItem(it)}</div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </Band>

      {/* ════════ HOSPEDAJE (marco dorado) ════════ */}
      {data.lodging.length > 0 && (
        <Band>
          <Reveal className="flex justify-center">
            <GoldFrame className="w-full max-w-md">
              <Script className="text-center" style={{ fontSize: '34px' }}>{data.lodgingTitle ?? 'Sugerencia de hospedaje'}</Script>
              <div className="relative mt-4 overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.lodging[0].image} alt="" className="h-72 w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/35 px-4">
                  <Caps style={{ fontSize: '22px', color: '#fff' }}>{data.lodging[0].name}</Caps>
                </div>
              </div>
            </GoldFrame>
          </Reveal>
        </Band>
      )}

      {/* ════════ REGALO (oliva) ════════ */}
      <Wave fill={C.olive} />
      <Band tone="olive">
        <Reveal className="text-center">
          <EventIcon name="gift" className="mx-auto mb-3 h-12 w-12" stroke={C.gold} custom={data} sec="gift" />
          <Script style={{ fontSize: '40px' }}>Sugerencia de Regalo</Script>
          <p className="mx-auto mt-3 max-w-md" style={{ fontSize: TYPE.body, color: C.creamDim, lineHeight: 1.6 }}>{data.giftMessage}</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {data.giftEnvelopes && (
              <div className="flex flex-col items-center justify-center rounded-2xl px-6 py-9" style={{ border: `1px solid ${C.gold}` }}>
                <EnvelopeMoney color={C.gold} className="mb-4 h-14 w-16" />
                <p style={{ fontSize: TYPE.body, color: C.cream }}>{data.giftEnvelopes}</p>
              </div>
            )}
            {data.giftQrUrl && (
              <div className="flex flex-col items-center justify-center rounded-2xl px-6 py-6" style={{ border: `1px solid ${C.gold}` }}>
                <p style={{ fontFamily: F.serif, fontSize: '18px', color: C.cream }}>Transferencia QR</p>
                <span className="my-2 block h-px w-3/4" style={{ background: C.line }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.giftQrUrl} alt="QR" className="h-36 w-36 rounded-lg bg-white p-2" />
              </div>
            )}
          </div>
          <p className="mt-7" style={{ fontSize: '15px', color: C.goldSoft }}>Gracias por tu muestra de cariño</p>
        </Reveal>
      </Band>
      <Wave fill={C.olive} flip />

      {/* ════════ NOSOTROS ════════ */}
      {data.aboutImage && (
        <Band>
          <Reveal className="text-center">
            <Script style={{ fontSize: '46px' }}>Nosotros</Script>
            <div className="mx-auto mt-5 max-w-sm overflow-hidden rounded-3xl" style={{ border: `1px solid ${C.line}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.aboutImage} alt="" className="w-full object-cover" style={{ aspectRatio: '3 / 4' }} />
            </div>
          </Reveal>
        </Band>
      )}

      {/* ════════ GALERÍA (cuadrícula vertical) ════════ */}
      {data.galleryImages && data.galleryImages.length > 0 && (
        <Band>
          <Reveal>
            <MasonryGallery images={data.galleryImages} variant="grid" aspect="3 / 5" />
          </Reveal>
        </Band>
      )}

      {/* ════════ AGRADECIMIENTO + PADRINOS (oliva) ════════ */}
      <Wave fill={C.olive} />
      <Band tone="olive">
        <Reveal className="text-center">
          <Script style={{ fontSize: '48px' }}>{data.thanksTitle ?? 'Agradecimiento'}</Script>
          <div className="mx-auto my-4 flex max-w-sm items-center justify-center gap-3"><span className="h-px flex-1" style={{ background: C.line }} /><span className="h-1 w-1 rounded-full" style={{ background: C.gold }} /><span className="h-px flex-1" style={{ background: C.line }} /></div>
          <p className="mx-auto max-w-xl" style={{ fontSize: TYPE.body, color: C.creamDim, lineHeight: 1.6 }}>{data.thanksMessage}</p>
          {data.padrinos.length > 0 && (
            <div className="mt-7 rounded-2xl px-6 py-8" style={{ border: `1px solid ${C.gold}` }}>
              <div className="grid gap-7 sm:grid-cols-3">
                {data.padrinos.map((p, i) => (
                  <div key={i}>
                    <p style={{ fontFamily: F.serif, fontSize: '17px', letterSpacing: '0.04em', color: C.goldSoft }}>{p.role}</p>
                    <div className="mt-1 space-y-0.5" style={{ fontSize: TYPE.body, color: C.cream }}>{p.names.map((n, j) => <p key={j}>{n}</p>)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Reveal>
      </Band>
      <Wave fill={C.olive} flip />

      {/* ════════ CIERRE + GALERÍA COMPARTIR ════════ */}
      <Band>
        <Reveal className="text-center">
          <Caps className="mx-auto max-w-xl" style={{ fontSize: 'clamp(16px,2.6vw,22px)', color: C.cream }}>{data.rsvpClosing}</Caps>
          <div className="mx-auto mt-8 max-w-md rounded-3xl px-6 py-8 text-center" style={{ border: `1px solid ${C.gold}`, background: C.olive }}>
            <EventIcon name="camera" className="mx-auto mb-3 h-12 w-12" stroke={C.gold} custom={data} sec="gallery" />
            <p style={{ fontSize: TYPE.body, color: C.cream, lineHeight: 1.6 }}>{data.galleryMsg}</p>
            <div className="mt-5"><GoldBtn href={data.galleryUrl}>Compartir fotografías</GoldBtn></div>
          </div>
        </Reveal>
      </Band>

      {/* ════════ CONFIRMACIÓN ════════ */}
      <Band>
        <Reveal className="text-center">
          <Caps className="mx-auto max-w-md" style={{ fontSize: 'clamp(16px,2.6vw,22px)', color: C.cream }}>{data.rsvpMessage}</Caps>
          <div className="mt-6"><OliveBtn href={data.whatsapp}>Confirmar asistencia</OliveBtn></div>
        </Reveal>
      </Band>

      {/* ════════ FOOTER ════════ */}
      <footer className="py-8 text-center" style={{ background: C.panel, color: C.cream }}>
        <Script style={{ fontSize: '34px' }}>Enkarta</Script>
        <p className="mt-1" style={{ fontSize: '13px', color: C.creamDim }}>
          ¿Deseas una invitación para tu evento? <span style={{ fontWeight: 700, color: C.gold }}>Contáctanos</span>
        </p>
      </footer>
    </div>
    </ThemeCtx.Provider>
  );
}
