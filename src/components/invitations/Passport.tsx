'use client';

import { useEffect, useRef, useState } from 'react';
import { useCountdown, Reveal, EventIcon } from './shared';

// ── Palette (sand / sage travel theme) ────────────────────────────────────────
const C = {
  cream: '#d9cdb5',
  sage: '#6e795b',
  sageSoft: '#7d886a',
  dark: '#403d2d',
  darkSoft: '#5f5b48',
  creamText: '#ece6d6',
  creamDim: 'rgba(236,230,214,0.78)',
  line: 'rgba(110,121,91,0.4)',
};
const F = {
  script: "'Great Vibes', cursive",
  caps: "'Cinzel', serif",
  body: "'Cormorant Garamond', serif",
  mono: "'Courier New', ui-monospace, monospace",
};

const D = {
  groom: 'Robert',
  bride: 'Isabella',
  initials: ['R', 'I'] as [string, string],
  isoDate: '2027-05-15T16:00:00',
  announce: '¡Nos casamos!',
  verse: 'Uno solo puede ser vencido, pero dos pueden resistir. ¡La cuerda de tres hilos no se rompe fácilmente! Dios, esposo y esposa.',
  verseRef: '(Eclesiastés 4:12)',
  callout: 'Prepara tus maletas y acompáñanos en esta aventura.',
  callout2: '¿Te unes?',
  parentsBride: ['Mateo Martinez Paz', 'Marc Lopez Saenz'],
  parentsGroom: ['Isabela Vargas', 'Catalina Flores'],
  escala: { place: 'Centro de eventos Notre Dame', time: '15:00 h', maps: 'https://maps.google.com' },
  dress: { note: '(buscar en internet)', women: ['Vestido largo', 'Ni un color parecido al blanco'], men: ['Con traje'] },
  itinerary: [
    { label: 'Ceremonia Civil y Religiosa', time: '16:00 h', icon: 'church' },
    { label: 'Recepción Social', time: '18:00 h', icon: 'rings' },
    { label: 'Vals y Brindis', time: '18:30 h', icon: 'cheers' },
    { label: 'Cena', time: '20:00 h', icon: 'dinner' },
    { label: 'A bailar', time: '20:30 h', icon: 'dance' },
    { label: 'Fin de la fiesta', time: '00:00 h', icon: 'cheers' },
  ],
  noKids: 'Amamos a sus niños y queremos que ustedes disfruten y bailen sin parar, es por ello que la invitación es solo para adultos.',
  galleryMsg: 'Te invitamos a compartir los momentos especiales de nuestro evento a través de tus fotografías. Apreciamos que capturen y compartan sus recuerdos para que todos podamos revivir esta ocasión tan especial.',
  galleryUrl: 'https://photos.google.com',
  whatsapp: 'https://wa.me/0000000000?text=Confirmo%20mi%20asistencia',
};

// ── Wavy dune divider (fills with the NEXT section color) ─────────────────────
function Wave({ fill }: { fill: string }) {
  return (
    <div className="relative w-full -mb-px leading-[0]" aria-hidden>
      <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="block w-full" style={{ height: '52px' }}>
        <path d="M0,38 C 260,72 520,8 760,30 C 1000,52 1230,16 1440,40 L1440,70 L0,70 Z" fill={fill} />
      </svg>
    </div>
  );
}

// ── Compass rose ──────────────────────────────────────────────────────────────
function Compass({ size = 96 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" stroke={C.sage} strokeWidth="1.1" aria-hidden>
      <circle cx="50" cy="50" r="30" opacity="0.6" />
      <circle cx="50" cy="50" r="22" opacity="0.35" />
      {[0, 90, 180, 270].map(a => (
        <g key={a} transform={`rotate(${a} 50 50)`}>
          <path d="M50 18 L55 50 L50 50 Z" fill={C.sage} stroke="none" />
          <path d="M50 18 L45 50 L50 50 Z" fill={C.sage} opacity="0.5" stroke="none" />
        </g>
      ))}
      {[45, 135, 225, 315].map(a => (
        <g key={a} transform={`rotate(${a} 50 50)`}>
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

// ── Globe + city + orbiting plane ─────────────────────────────────────────────
function GlobeCity({ size = 130 }: { size?: number }) {
  return (
    <div className="pp-globe relative" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full" fill="none" stroke={C.sage} strokeWidth="1">
        <circle cx="60" cy="60" r="30" opacity="0.5" />
        {/* little skyline buildings around the globe */}
        {Array.from({ length: 22 }).map((_, i) => {
          const a = (i / 22) * Math.PI * 2;
          const r = 30, x = 60 + Math.cos(a) * r, y = 60 + Math.sin(a) * r;
          const h = 5 + ((i * 7) % 9);
          return <line key={i} x1={x} y1={y} x2={60 + Math.cos(a) * (r + h)} y2={60 + Math.sin(a) * (r + h)} strokeWidth="1.6" />;
        })}
        {/* center monogram ring */}
        <circle cx="60" cy="60" r="15" opacity="0.6" />
        <path d="M53 53 L67 67 M67 53 L53 67" opacity="0.5" />
        <text x="53" y="63" fontSize="7" fill={C.sage} stroke="none" fontFamily={F.caps}>R</text>
        <text x="63" y="63" fontSize="7" fill={C.sage} stroke="none" fontFamily={F.caps}>I</text>
      </svg>
      {/* dashed orbit + plane */}
      <div className="pp-orbit absolute inset-0">
        <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full" fill="none" stroke={C.sage} strokeWidth="1" strokeDasharray="3 4" opacity="0.6">
          <circle cx="60" cy="60" r="52" />
        </svg>
        <svg viewBox="0 0 24 24" className="absolute" style={{ width: 20, height: 20, top: 2, left: '50%', marginLeft: -10 }} fill={C.sage}>
          <path d="M22 12 14 14 11 22 9 14 2 12 9 10 11 2 14 10z" opacity="0" />
          <path d="M21 11 13.5 12.5 12 21 10.5 12.5 3 11 10.5 9.5 12 1 13.5 9.5z" />
        </svg>
      </div>
    </div>
  );
}

// ── Plane with dashed trail ───────────────────────────────────────────────────
function PlaneTrail({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" className={className} fill="none" stroke={C.sage} strokeWidth="1.2" aria-hidden>
      <path d="M2 56 C 30 50, 55 34, 96 12" strokeDasharray="3 5" strokeLinecap="round" />
      <path d="M96 12 l8 -6 -1 6 5 2 -6 3 -1 7 -3 -6 -6 1z" fill={C.sage} stroke="none" />
    </svg>
  );
}

// ── Bits ──────────────────────────────────────────────────────────────────────
function Script({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <p className={className} style={{ fontFamily: F.script, color: C.sage, lineHeight: 1, ...style }}>{children}</p>;
}
function Caps({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <p className={className} style={{ fontFamily: F.caps, color: C.sage, letterSpacing: '0.14em', textTransform: 'uppercase', ...style }}>{children}</p>;
}
function SageBtn({ children, href, onClick }: { children: React.ReactNode; href?: string; onClick?: () => void }) {
  const cls = 'inline-flex items-center justify-center gap-2 px-7 py-2.5 rounded-full text-[12px] tracking-[0.14em] uppercase transition-all duration-300 hover:opacity-90';
  const style: React.CSSProperties = { background: C.sage, color: C.creamText, fontFamily: F.caps, fontWeight: 600 };
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>{children}</a>;
  return <button onClick={onClick} className={cls} style={style}>{children}</button>;
}
function Flourish({ flip }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 80 24" width="80" height="24" fill="none" stroke={C.dark} strokeWidth="1" style={{ transform: flip ? 'scaleX(-1)' : undefined }} aria-hidden>
      <path d="M2 12 H 56" strokeLinecap="round" />
      <path d="M56 12 C 64 12, 64 4, 70 4 C 74 4, 74 9, 70 9 C 66 9, 66 4, 70 4" strokeLinecap="round" />
      <circle cx="58" cy="12" r="1.4" fill={C.dark} />
    </svg>
  );
}

export default function Passport({ guestName, guestPasses }: { guestName?: string; guestPasses?: string }) {
  const { days, hours, mins, secs } = useCountdown(D.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => { document.body.style.background = C.cream; return () => { document.body.style.background = ''; }; }, []);
  const enter = () => document.getElementById('pp-intro')?.scrollIntoView({ behavior: 'smooth' });

  const titleSize = { fontSize: 'clamp(36px,8vw,58px)' };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden" style={{ background: C.cream, color: C.dark, fontFamily: F.body }}>
      <style>{`
        @keyframes ppOrbit { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        @keyframes ppFly { 0%{ transform: translate(0,0) rotate(0);} 50%{ transform: translate(8px,-6px) rotate(2deg);} 100%{ transform: translate(0,0) rotate(0);} }
        @keyframes ppFade { from { opacity: 0; transform: translateY(16px);} to { opacity: 1; transform: translateY(0);} }
        .pp-orbit { animation: ppOrbit 9s linear infinite; transform-origin: 50% 50%; }
      `}</style>

      <button onClick={() => { const a = audioRef.current; if (!a) { setPlaying(p => !p); return; } if (playing) { a.pause(); setPlaying(false); } else a.play().then(() => setPlaying(true)).catch(() => {}); }}
        className="fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ border: `1.5px solid ${C.sage}`, background: C.cream }} aria-label="Música">
        <svg width="16" height="16" viewBox="0 0 24 24" fill={C.sage}><path d="M9 17a3 3 0 11-2-2.83V5l11-2v10.17A3 3 0 1116 14V7L9 8.4V17z" /></svg>
      </button>

      {/* ════════ COVER (sage) ════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: C.sage }}>
        <div className="flex flex-col items-center" style={{ animation: 'ppFade 1.1s ease both' }}>
          <div className="pp-globe relative" style={{ width: 60, height: 60 }}>
            <svg viewBox="0 0 48 48" className="absolute inset-0 w-full h-full" fill="none" stroke={C.creamText} strokeWidth="1.2"><circle cx="24" cy="24" r="13" /><ellipse cx="24" cy="24" rx="5.5" ry="13" /><path d="M11 20h26M11 28h26" /></svg>
            <div className="pp-orbit absolute inset-0"><svg viewBox="0 0 24 24" className="absolute" style={{ width: 16, height: 16, top: -3, left: '52%' }} fill={C.creamText}><path d="M21 11 13.5 12.5 12 21 10.5 12.5 3 11 10.5 9.5 12 1 13.5 9.5z" /></svg></div>
          </div>
          <Caps className="mt-5" style={{ color: C.creamText, fontSize: 'clamp(26px,6vw,44px)', letterSpacing: '0.28em' }}>Pasaporte</Caps>
          <p style={{ fontFamily: F.script, fontSize: 'clamp(26px,5vw,40px)', color: C.creamText, marginTop: 2 }}>a nuestra boda</p>
          {/* stamp badge */}
          <div className="relative flex items-center justify-center my-8" style={{ width: 156, height: 156 }}>
            <div className="absolute inset-0 rounded-full" style={{ border: `2px dashed ${C.creamText}`, opacity: 0.85 }} />
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" fill="none" stroke={C.creamText} strokeWidth="1.4">
              <path d="M28 32 L72 68 M72 32 L28 68" opacity="0.8" />
              <path d="M50 22c-2-4-8-3-8 1 0 3 5 6 8 8 3-2 8-5 8-8 0-4-6-5-8-1z" fill={C.creamText} stroke="none" />
              <path d="M50 64 L51.4 71 57 74 51.4 74.6 51.4 77 53 79 50 78 47 79 48.6 77 48.6 74.6 43 74 48.6 71 Z" fill={C.creamText} stroke="none" />
            </svg>
            <span className="absolute" style={{ fontFamily: F.caps, color: C.creamText, fontSize: 30, left: 34 }}>{D.initials[0]}</span>
            <span className="absolute" style={{ fontFamily: F.caps, color: C.creamText, fontSize: 30, right: 34 }}>{D.initials[1]}</span>
          </div>
          <Caps style={{ color: C.creamText, fontSize: 'clamp(20px,4.5vw,34px)', letterSpacing: '0.16em' }}>{D.groom} &amp; {D.bride}</Caps>
          <div className="mt-7">
            <button onClick={enter} className="inline-flex items-center justify-center gap-2 px-7 py-2.5 rounded-full text-[12px] tracking-[0.16em] uppercase transition-all duration-300 hover:bg-[#ece6d6] hover:text-[#6e795b]" style={{ border: `1.5px solid ${C.creamText}`, color: C.creamText, fontFamily: F.caps, fontWeight: 600 }}>✈ Explorar tu pasaporte</button>
          </div>
        </div>
        <Wave fill={C.cream} />
      </section>

      {/* ════════ INTRO (cream) ════════ */}
      <section id="pp-intro" className="px-6 pt-10 pb-4 text-center">
        <Reveal className="max-w-xl mx-auto flex flex-col items-center">
          <Script style={{ fontSize: 'clamp(40px,9vw,64px)' }}>{D.groom} &amp; {D.bride}</Script>
          <Caps className="mt-5" style={{ color: C.dark, fontSize: 'clamp(18px,4.5vw,28px)', letterSpacing: '0.12em' }}>¡Nos casamos!</Caps>
          <p className="mt-6 italic" style={{ fontFamily: F.body, fontSize: '19px', lineHeight: 1.7, color: C.darkSoft }}>{D.verse}</p>
          <p className="mt-2 italic" style={{ fontFamily: F.body, fontSize: '15px', color: C.darkSoft }}>{D.verseRef}</p>
        </Reveal>
      </section>

      <Wave fill={C.sage} />
      {/* ════════ CALLOUT + GUEST (sage) ════════ */}
      <section className="px-6 py-8 text-center" style={{ background: C.sage, color: C.creamText }}>
        <Reveal className="max-w-xl mx-auto flex flex-col items-center">
          <p style={{ fontFamily: F.body, fontSize: '20px', color: C.creamText }}>{D.callout}</p>
          <p style={{ fontFamily: F.script, fontSize: '34px', marginTop: 4 }}>{D.callout2}</p>
          <div className="flex items-center gap-3 my-7 w-full max-w-sm">
            <div className="flex-1 h-px" style={{ background: 'rgba(236,230,214,0.4)' }} />
            <svg width="16" height="14" viewBox="0 0 16 14" fill={C.creamText}><path d="M8 13C2 9 0 5.5 0 3.2 0 1 2.2 0 4 1.4 5.5 .2 8 1 8 3.2 8 1 10.5 .2 12 1.4 13.8 0 16 1 16 3.2 16 5.5 14 9 8 13z" /></svg>
            <div className="flex-1 h-px" style={{ background: 'rgba(236,230,214,0.4)' }} />
          </div>
          <p style={{ fontFamily: F.script, fontSize: '42px', color: C.creamText }}>{guestName || 'Invitado'}</p>
          <p className="mt-1 italic" style={{ fontFamily: F.body, fontSize: '17px', color: C.creamDim }}>Hemos reservado:</p>
          <p style={{ fontFamily: F.script, fontSize: '34px', color: C.creamText }}>{guestPasses || '2 pases'}</p>
          <p className="italic" style={{ fontFamily: F.body, fontSize: '17px', color: C.creamDim }}>en su honor</p>
        </Reveal>
      </section>
      <Wave fill={C.cream} />

      {/* ════════ BLESSING / PARENTS + COMPASS (cream) ════════ */}
      <section className="px-6 py-12 text-center">
        <Reveal className="max-w-2xl mx-auto">
          <Caps style={{ fontSize: 'clamp(13px,3.2vw,18px)', letterSpacing: '0.16em' }}>Con la bendición de Dios y de nuestros padres</Caps>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8">
            {[['Padres de la Novia', D.parentsBride], ['Padres del Novio', D.parentsGroom]].map(([label, ps]) => (
              <div key={label as string}>
                <Caps style={{ fontSize: '15px' }}>{label as string}</Caps>
                <div className="mt-2">{(ps as string[]).map(p => <p key={p} style={{ fontFamily: F.body, fontSize: '18px', color: C.dark }}>{p}</p>)}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-10"><Compass size={110} /></div>
        </Reveal>
      </section>

      {/* ════════ COUNTDOWN (cream, ornamental) ════════ */}
      <section className="px-6 pb-14">
        <Reveal className="max-w-xl mx-auto">
          <div style={{ borderTop: `1px solid ${C.line}`, width: '70%', margin: '0 auto' }} />
          <div className="flex items-center justify-center gap-2 sm:gap-4 my-3">
            <Flourish />
            <div className="flex items-start gap-4 sm:gap-6">
              {[[days, 'Días'], [hours, 'Hrs'], [mins, 'Mins'], [secs, 'Segs']].map(([n, l]) => (
                <div key={l as string} className="text-center">
                  <p style={{ fontFamily: F.caps, fontWeight: 700, fontSize: 'clamp(24px,6vw,36px)', lineHeight: 1, color: C.dark }}>{String(n).padStart(2, '0')}</p>
                  <p className="mt-1.5" style={{ fontFamily: F.body, fontSize: '14px', color: C.darkSoft }}>{l}</p>
                </div>
              ))}
            </div>
            <Flourish flip />
          </div>
          <div style={{ borderTop: `1px solid ${C.line}`, width: '70%', margin: '0 auto' }} />
        </Reveal>
      </section>

      {/* ════════ ESCALA (cream) ════════ */}
      <section className="px-6 py-12 text-center">
        <Reveal className="flex flex-col items-center">
          <svg width="34" height="40" viewBox="0 0 24 28" fill="none" stroke={C.sage} strokeWidth="1.2"><path d="M12 1C7 1 3 5 3 10c0 6.5 9 16 9 16s9-9.5 9-16c0-5-4-9-9-9z" /><circle cx="12" cy="10" r="3.2" /></svg>
          <Script className="mt-2" style={titleSize}>Escala</Script>
          <p className="mt-3" style={{ fontFamily: F.body, fontSize: '20px', color: C.dark }}>{D.escala.place}</p>
          <p style={{ fontFamily: F.body, fontSize: '20px', color: C.darkSoft }}>{D.escala.time}</p>
          <div className="mt-5"><SageBtn href={D.escala.maps}>✈ Ver ubicación</SageBtn></div>
        </Reveal>
      </section>

      {/* ════════ VESTIMENTA (cream) ════════ */}
      <section className="px-6 py-12 text-center">
        <Reveal className="max-w-xl mx-auto">
          <Script style={titleSize}>Vestimenta</Script>
          <Caps className="mt-3" style={{ fontSize: '16px', letterSpacing: '0.1em' }}>Etiqueta Rigurosa</Caps>
          <p className="italic" style={{ fontFamily: F.body, fontSize: '15px', color: C.darkSoft }}>{D.dress.note}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-7">
            <div>
              <Caps style={{ fontSize: '14px', color: C.dark }}>Mujeres</Caps>
              <div className="mt-2">{D.dress.women.map(w => <p key={w} style={{ fontFamily: F.body, fontSize: '17px', color: C.darkSoft }}>{w}</p>)}</div>
            </div>
            <div>
              <Caps style={{ fontSize: '14px', color: C.dark }}>Hombres</Caps>
              <div className="mt-2">{D.dress.men.map(m => <p key={m} style={{ fontFamily: F.body, fontSize: '17px', color: C.darkSoft }}>{m}</p>)}</div>
            </div>
          </div>
          <div className="flex justify-center mt-10"><GlobeCity size={140} /></div>
        </Reveal>
      </section>

      {/* ════════ ITINERARIO (cream, timeline) ════════ */}
      <section className="px-6 py-12">
        <Reveal>
          <div className="text-center">
            <Script style={titleSize}>Itinerario</Script>
            <p className="mt-3 mb-10 italic mx-auto max-w-md" style={{ fontFamily: F.body, fontSize: '17px', color: C.darkSoft }}>¡La vida está llena de momentos que no se pueden recuperar! Así que llega puntual y comparte este momento especial con nosotros.</p>
          </div>
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute left-1/2 top-2 bottom-2 -translate-x-1/2" style={{ width: '1px', background: C.line }} aria-hidden />
            <div className="space-y-9">
              {D.itinerary.map((it, i) => {
                const left = i % 2 === 0;
                const block = (
                  <div className={`flex flex-col items-center ${left ? 'sm:items-end sm:text-right' : 'sm:items-start sm:text-left'} text-center`}>
                    <EventIcon name={it.icon} className="w-9 h-9 mb-1.5" stroke={C.sage} />
                    <p style={{ fontFamily: F.body, fontSize: '17px', color: C.dark }}>{it.label}</p>
                    <p style={{ fontFamily: F.caps, fontWeight: 600, fontSize: '15px', color: C.sage }}>{it.time}</p>
                  </div>
                );
                return (
                  <div key={i} className="relative grid grid-cols-1 sm:grid-cols-[1fr_28px_1fr] items-center gap-2">
                    <div className={`hidden sm:block ${left ? 'sm:pr-6' : ''}`}>{left && block}</div>
                    <div className="hidden sm:flex justify-center"><span className="w-2.5 h-2.5 rounded-full" style={{ background: C.sage }} /></div>
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
      {/* ════════ GALLERY (sage) ════════ */}
      <section className="px-6 py-14 text-center" style={{ background: C.sage, color: C.creamText }}>
        <Reveal className="max-w-md mx-auto flex flex-col items-center">
          <svg viewBox="0 0 48 48" width="46" height="46" className="mb-5" fill="none" stroke={C.creamText} strokeWidth="1.3"><rect x="6" y="14" width="36" height="26" rx="3" /><path d="M16 14l3-5h10l3 5" /><circle cx="24" cy="27" r="7" /></svg>
          <p className="italic" style={{ fontFamily: F.body, fontSize: '18px', lineHeight: 1.6, color: C.creamText }}>{D.galleryMsg}</p>
          <div className="mt-6"><a href={D.galleryUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full text-[12px] tracking-[0.14em] uppercase" style={{ background: C.cream, color: C.sage, fontFamily: F.caps, fontWeight: 600 }}>Compartir fotografías</a></div>
        </Reveal>
      </section>
      <Wave fill={C.cream} />

      {/* ════════ SOLO ADULTOS (cream) ════════ */}
      <section className="relative px-6 py-14 text-center overflow-hidden">
        <PlaneTrail className="absolute left-2 top-6 w-28 opacity-70" />
        <Reveal className="max-w-xl mx-auto">
          <Script style={titleSize}>Solo Adultos</Script>
          <p className="mt-5 italic" style={{ fontFamily: F.body, fontSize: '18px', lineHeight: 1.7, color: C.darkSoft }}>{D.noKids}</p>
        </Reveal>
      </section>

      <Wave fill={C.sage} />
      {/* ════════ CHECK-IN / RSVP (sage) ════════ */}
      <section className="px-6 py-16 text-center" style={{ background: C.sage, color: C.creamText }}>
        <Reveal className="max-w-md mx-auto flex flex-col items-center">
          <p style={{ fontFamily: F.caps, fontSize: '12px', letterSpacing: '0.3em', color: C.creamDim }}>— Confirmar Asistencia —</p>
          <Script className="mt-3" style={{ color: C.creamText, fontSize: 'clamp(38px,9vw,58px)' }}>Check-in</Script>
          <p className="mt-3 italic" style={{ fontFamily: F.body, fontSize: '18px', color: C.creamDim }}>Te esperamos para vivir esta aventura juntos.</p>
          <div className="mt-6"><a href={D.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-[12px] tracking-[0.14em] uppercase" style={{ background: C.cream, color: C.sage, fontFamily: F.caps, fontWeight: 600 }}>✈ Confirmar asistencia</a></div>
        </Reveal>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="py-8 text-center" style={{ background: C.sage, color: C.creamText, borderTop: '1px solid rgba(236,230,214,0.2)' }}>
        <Caps style={{ color: C.creamText, fontSize: '18px', letterSpacing: '0.2em' }}>Enkarta</Caps>
        <p className="mt-1" style={{ fontFamily: F.body, fontSize: '15px', color: C.creamDim }}>¿Deseas una invitación para tu evento? <span style={{ fontWeight: 700 }}>Contáctanos</span></p>
      </footer>
    </div>
  );
}
