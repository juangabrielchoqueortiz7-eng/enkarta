'use client';

import { useEffect, useRef, useState } from 'react';
import { useCountdown, Reveal } from './shared';

// ── Palette (sage green / cream travel theme) ─────────────────────────────────
const C = {
  sage: '#6e795b',
  sageDeep: '#5b6549',
  sageSoft: '#7c8767',
  cream: '#ece6d6',
  creamDim: 'rgba(236,230,214,0.72)',
  line: 'rgba(236,230,214,0.45)',
};
const F = {
  serif: "'Cinzel', serif",
  body: "'Cormorant Garamond', serif",
  script: "'Great Vibes', cursive",
  mono: "'Courier New', ui-monospace, monospace",
};

const D = {
  groom: 'Robert',
  bride: 'Isabella',
  initials: ['R', 'I'] as [string, string],
  isoDate: '2027-05-15T16:00:00',
  announce: '¡Nos casamos!',
  verse:
    'Uno solo puede ser vencido, pero dos pueden resistir. ¡La cuerda de tres hilos no se rompe fácilmente! Dios, esposo y esposa.',
  verseRef: '(Eclesiastés 4:12)',
  callout: 'Prepara tus maletas y acompáñanos en esta aventura.',
  callout2: '¿Te unes?',
  parentsBride: ['Mateo Martinez Paz', 'Marc Lopez Saenz'],
  parentsGroom: ['Isabela Vargas', 'Catalina Flores'],
  inviteMessage:
    'Deseamos celebrar nuestra boda con su compañía y es por eso que nos complace invitarles a celebrar nuestra unión.',
  escala: { place: 'Centro de eventos Notre Dame', time: '15:00 h', maps: 'https://maps.google.com' },
  dress: { title: 'Etiqueta Rigurosa', note: '(buscar en internet)', women: ['Vestido largo', 'Ni un color parecido al blanco'], men: ['Con traje'] },
  itinerary: [
    { label: 'Ceremonia Civil y Religiosa', time: '16:00 h' },
    { label: 'Recepción Social', time: '18:00 h' },
    { label: 'Vals y Brindis', time: '18:30 h' },
    { label: 'Cena', time: '20:00 h' },
    { label: 'A bailar', time: '20:30 h' },
    { label: 'Fin de la fiesta', time: '00:00 h' },
  ],
  noKids: 'Amamos a sus niños y queremos que ustedes disfruten y bailen sin parar, es por ello que la invitación es solo para adultos.',
  galleryUrl: 'https://photos.google.com',
  whatsapp: 'https://wa.me/0000000000?text=Confirmo%20mi%20asistencia',
};

// ── Globe with orbiting plane ─────────────────────────────────────────────────
function GlobePlane({ size = 64 }: { size?: number }) {
  return (
    <div className="pp-globe relative" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 48 48" className="absolute inset-0 w-full h-full" fill="none" stroke={C.cream} strokeWidth="1.2">
        <circle cx="24" cy="24" r="13" />
        <ellipse cx="24" cy="24" rx="5.5" ry="13" />
        <path d="M11 20h26M11 28h26" />
      </svg>
      <div className="pp-orbit absolute inset-0">
        <svg viewBox="0 0 48 48" className="absolute" style={{ width: size * 0.28, height: size * 0.28, top: -size * 0.06, left: size * 0.36 }} fill={C.cream}>
          <path d="M24 4l5 14 14 5-14 5-5 14-5-14-14-5 14-5z" opacity="0" />
          <path d="M44 6 26 16l-8-3-3 3 6 5-4 6 3 1 4-5 6 5 3-3-3-8z" />
        </svg>
      </div>
    </div>
  );
}

// ── Passport stamp badge (R ✕ I, heart + plane, dashed ring) ──────────────────
function StampBadge({ a, b, size = 150 }: { a: string; b: string; size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }} aria-hidden>
      <div className="absolute inset-0 rounded-full" style={{ border: `2px dashed ${C.cream}`, opacity: 0.85 }} />
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" fill="none" stroke={C.cream} strokeWidth="1.4">
        <path d="M28 32 L72 68 M72 32 L28 68" opacity="0.8" />
        {/* heart top */}
        <path d="M50 22c-2-4-8-3-8 1 0 3 5 6 8 8 3-2 8-5 8-8 0-4-6-5-8-1z" fill={C.cream} stroke="none" />
        {/* plane bottom (pointing down) */}
        <path d="M50 64 L51.4 71 57 74 51.4 74.6 51.4 77 53 79 50 78 47 79 48.6 77 48.6 74.6 43 74 48.6 71 Z" fill={C.cream} stroke="none" />
      </svg>
      <span className="font-serif absolute" style={{ fontFamily: F.serif, color: C.cream, fontSize: size * 0.2, left: size * 0.22 }}>{a}</span>
      <span className="font-serif absolute" style={{ fontFamily: F.serif, color: C.cream, fontSize: size * 0.2, right: size * 0.22 }}>{b}</span>
    </div>
  );
}

// ── Buttons ───────────────────────────────────────────────────────────────────
function PpBtn({ children, href, onClick, solid }: { children: React.ReactNode; href?: string; onClick?: () => void; solid?: boolean }) {
  const cls = 'inline-flex items-center justify-center gap-2 px-7 py-2.5 rounded-full text-[12px] tracking-[0.16em] uppercase transition-all duration-300';
  const style: React.CSSProperties = solid
    ? { background: C.cream, color: C.sageDeep, fontFamily: F.serif, fontWeight: 600 }
    : { border: `1.5px solid ${C.cream}`, color: C.cream, fontFamily: F.serif, fontWeight: 600 };
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>{children}</a>;
  return <button onClick={onClick} className={cls} style={style}>{children}</button>;
}

function Label({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <p className={className} style={{ fontFamily: F.serif, color: C.cream, letterSpacing: '0.18em', textTransform: 'uppercase', ...style }}>{children}</p>;
}

// Dashed ticket card
function Ticket({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl p-6" style={{ border: `1.5px dashed ${C.line}`, background: 'rgba(236,230,214,0.05)' }}>{children}</div>;
}

export default function Passport({ guestName, guestPasses }: { guestName?: string; guestPasses?: string }) {
  const { days, hours, mins, secs } = useCountdown(D.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    document.body.style.background = C.sage;
    return () => { document.body.style.background = ''; };
  }, []);

  const enter = () => document.getElementById('pp-intro')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden" style={{ background: C.sage, color: C.cream, fontFamily: F.body }}>
      <style>{`
        @keyframes ppOrbit { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
        @keyframes ppBounce { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(7px);} }
        @keyframes ppFade { from { opacity: 0; transform: translateY(16px);} to { opacity: 1; transform: translateY(0);} }
        .pp-orbit { animation: ppOrbit 7s linear infinite; transform-origin: 50% 50%; }
      `}</style>

      {/* Music toggle */}
      <button onClick={() => { const a = audioRef.current; if (!a) { setPlaying(p => !p); return; } if (playing) { a.pause(); setPlaying(false); } else a.play().then(() => setPlaying(true)).catch(() => {}); }}
        className="fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
        style={{ border: `1.5px solid ${C.cream}`, background: C.sageDeep }} aria-label="Música">
        <svg width="16" height="16" viewBox="0 0 24 24" fill={C.cream}><path d="M9 17a3 3 0 11-2-2.83V5l11-2v10.17A3 3 0 1116 14V7L9 8.4V17z" /></svg>
      </button>

      {/* ════════ COVER ════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="flex flex-col items-center" style={{ animation: 'ppFade 1.1s ease both' }}>
          <GlobePlane size={64} />
          <Label className="mt-5" style={{ fontSize: 'clamp(26px,6vw,44px)', letterSpacing: '0.28em' }}>Pasaporte</Label>
          <p style={{ fontFamily: F.script, fontSize: 'clamp(26px,5vw,40px)', color: C.cream, marginTop: '2px' }}>a nuestra boda</p>
          <div className="my-8"><StampBadge a={D.initials[0]} b={D.initials[1]} size={156} /></div>
          <Label style={{ fontSize: 'clamp(20px,4.5vw,34px)', letterSpacing: '0.16em' }}>{D.groom} &amp; {D.bride}</Label>
          <div className="mt-7"><PpBtn onClick={enter}>✈ Explorar tu pasaporte</PpBtn></div>
        </div>
      </section>

      {/* ════════ INTRO ════════ */}
      <section id="pp-intro" className="px-6 py-20 text-center" style={{ background: C.sageDeep }}>
        <Reveal className="max-w-xl mx-auto flex flex-col items-center">
          <p style={{ fontFamily: F.script, fontSize: 'clamp(44px,10vw,72px)', lineHeight: 0.95 }}>{D.groom}</p>
          <p style={{ fontFamily: F.script, fontSize: 'clamp(20px,5vw,32px)' }}>&amp;</p>
          <p style={{ fontFamily: F.script, fontSize: 'clamp(44px,10vw,72px)', lineHeight: 0.95 }}>{D.bride}</p>
          <Label className="mt-6" style={{ fontSize: 'clamp(16px,4vw,24px)', letterSpacing: '0.2em' }}>{D.announce}</Label>
          <p className="mt-6 italic" style={{ fontFamily: F.body, fontSize: '19px', lineHeight: 1.7, color: C.creamDim }}>{D.verse}</p>
          <p className="mt-2" style={{ fontFamily: F.body, fontSize: '15px', color: C.creamDim }}>{D.verseRef}</p>
          <div className="my-7" style={{ width: 60, height: 1, background: C.line }} />
          <p style={{ fontFamily: F.body, fontSize: '19px', color: C.cream }}>{D.callout}</p>
          <p style={{ fontFamily: F.script, fontSize: '34px', marginTop: 4 }}>{D.callout2}</p>
        </Reveal>
      </section>

      {/* ════════ GUEST ════════ */}
      <section className="px-6 py-16 text-center">
        <Reveal className="max-w-md mx-auto flex flex-col items-center">
          <Ticket>
            <p className="text-[10px] tracking-[0.3em]" style={{ fontFamily: F.mono, color: C.creamDim }}>BOARDING PASS · PASAJERO</p>
            <p className="my-2" style={{ fontFamily: F.script, fontSize: '40px', color: C.cream }}>{guestName || 'Invitado'}</p>
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="italic" style={{ fontFamily: F.body, fontSize: '16px', color: C.creamDim }}>Hemos reservado:</span>
              <span style={{ fontFamily: F.serif, fontSize: '20px', letterSpacing: '0.1em' }}>{guestPasses || '2 pases'}</span>
            </div>
            <p className="italic mt-1" style={{ fontFamily: F.body, fontSize: '16px', color: C.creamDim }}>en su honor</p>
          </Ticket>
        </Reveal>
      </section>

      {/* ════════ BLESSING / PARENTS ════════ */}
      <section className="px-6 py-14 text-center">
        <Reveal className="max-w-2xl mx-auto">
          <Label style={{ fontSize: 'clamp(13px,3.2vw,18px)', letterSpacing: '0.16em' }}>Con la bendición de Dios y de nuestros padres</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8">
            {[['Padres de la Novia', D.parentsBride], ['Padres del Novio', D.parentsGroom]].map(([label, ps]) => (
              <div key={label as string}>
                <Label style={{ fontSize: '12px', opacity: 0.8 }}>{label as string}</Label>
                <div className="mt-2">{(ps as string[]).map(p => <p key={p} style={{ fontFamily: F.body, fontSize: '18px' }}>{p}</p>)}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ════════ COUNTDOWN ════════ */}
      <section className="px-6 py-16" style={{ background: C.sageDeep }}>
        <Reveal className="max-w-lg mx-auto">
          <div className="flex items-start justify-between">
            {[[days, 'Días'], [hours, 'Hrs'], [mins, 'Mins'], [secs, 'Segs']].map(([n, l]) => (
              <div key={l as string} className="text-center flex-1">
                <p style={{ fontFamily: F.serif, fontWeight: 600, fontSize: 'clamp(28px,7vw,44px)', lineHeight: 1 }}>{String(n).padStart(2, '0')}</p>
                <p className="mt-2" style={{ fontFamily: F.serif, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase', color: C.creamDim }}>{l}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ════════ INVITE MESSAGE ════════ */}
      <section className="px-6 py-16 text-center">
        <Reveal className="max-w-xl mx-auto">
          <GlobePlane size={48} />
          <p className="mt-6 italic" style={{ fontFamily: F.body, fontSize: '20px', lineHeight: 1.7 }}>{D.inviteMessage}</p>
        </Reveal>
      </section>

      {/* ════════ ESCALA (ceremony, boarding pass) ════════ */}
      <section className="px-6 py-10">
        <Reveal className="max-w-md mx-auto">
          <Ticket>
            <div className="flex items-center justify-between mb-4">
              <Label style={{ fontSize: '13px' }}>Escala</Label>
              <span style={{ fontFamily: F.mono, fontSize: '11px', color: C.creamDim }}>GATE · 01</span>
            </div>
            <div className="border-t border-dashed my-3" style={{ borderColor: C.line }} />
            <p style={{ fontFamily: F.serif, fontSize: '16px', letterSpacing: '0.06em' }}>{D.escala.place}</p>
            <p className="mt-2" style={{ fontFamily: F.body, fontSize: '22px' }}>{D.escala.time}</p>
            <div className="mt-5 text-center"><PpBtn href={D.escala.maps} solid>Ver ubicación</PpBtn></div>
          </Ticket>
        </Reveal>
      </section>

      {/* ════════ VESTIMENTA ════════ */}
      <section className="px-6 py-16 text-center">
        <Reveal className="max-w-xl mx-auto">
          <Label style={{ fontSize: 'clamp(18px,4.5vw,28px)', letterSpacing: '0.2em' }}>Vestimenta</Label>
          <p className="mt-3" style={{ fontFamily: F.serif, fontWeight: 600, fontSize: '17px', letterSpacing: '0.12em' }}>{D.dress.title.toUpperCase()}</p>
          <p className="italic" style={{ fontFamily: F.body, fontSize: '15px', color: C.creamDim }}>{D.dress.note}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8 text-center">
            <div>
              <Label style={{ fontSize: '13px' }}>Mujeres</Label>
              <div className="mt-2">{D.dress.women.map(w => <p key={w} style={{ fontFamily: F.body, fontSize: '17px', color: C.creamDim }}>{w}</p>)}</div>
            </div>
            <div>
              <Label style={{ fontSize: '13px' }}>Hombres</Label>
              <div className="mt-2">{D.dress.men.map(m => <p key={m} style={{ fontFamily: F.body, fontSize: '17px', color: C.creamDim }}>{m}</p>)}</div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ════════ ITINERARIO ════════ */}
      <section className="px-6 py-16" style={{ background: C.sageDeep }}>
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <div className="text-center">
              <Label style={{ fontSize: 'clamp(18px,4.5vw,28px)', letterSpacing: '0.2em' }}>Itinerario</Label>
              <p className="mt-3 mb-8 italic mx-auto max-w-md" style={{ fontFamily: F.body, fontSize: '16px', color: C.creamDim }}>
                ¡La vida está llena de momentos que no se pueden recuperar! Así que llega puntual y comparte este momento especial con nosotros.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
              {D.itinerary.map((it, i) => (
                <div key={i} className="flex items-baseline justify-between gap-3" style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: '7px' }}>
                  <span style={{ fontFamily: F.body, fontSize: '17px' }}>{it.label}</span>
                  <span style={{ fontFamily: F.serif, fontWeight: 600, fontSize: '15px', whiteSpace: 'nowrap' }}>{it.time}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════ NUESTRO VIAJE / GALLERY ════════ */}
      <section className="px-6 py-16 text-center">
        <Reveal className="max-w-md mx-auto flex flex-col items-center">
          <Label style={{ fontSize: 'clamp(18px,4.5vw,26px)', letterSpacing: '0.18em' }}>Nuestro Viaje</Label>
          <svg viewBox="0 0 48 48" width="46" height="46" className="my-5" fill="none" stroke={C.cream} strokeWidth="1.3">
            <rect x="6" y="14" width="36" height="26" rx="3" /><path d="M16 14l3-5h10l3 5" /><circle cx="24" cy="27" r="7" />
          </svg>
          <PpBtn href={D.galleryUrl}>Compartir fotografías</PpBtn>
        </Reveal>
      </section>

      {/* ════════ SOLO ADULTOS ════════ */}
      <section className="px-6 py-14 text-center" style={{ background: C.sageDeep }}>
        <Reveal className="max-w-xl mx-auto">
          <Label style={{ fontSize: '15px', letterSpacing: '0.18em' }}>Solo Adultos</Label>
          <p className="mt-4 italic" style={{ fontFamily: F.body, fontSize: '18px', lineHeight: 1.7, color: C.creamDim }}>{D.noKids}</p>
        </Reveal>
      </section>

      {/* ════════ CHECK-IN / RSVP ════════ */}
      <section className="px-6 py-20 text-center">
        <Reveal className="max-w-md mx-auto flex flex-col items-center">
          <Label style={{ fontSize: '12px', letterSpacing: '0.3em', opacity: 0.8 }}>— — Confirmar Asistencia — —</Label>
          <Label className="mt-3" style={{ fontSize: 'clamp(20px,5vw,32px)', letterSpacing: '0.14em' }}>Check-in</Label>
          <p className="mt-4 mb-6 italic" style={{ fontFamily: F.body, fontSize: '18px', color: C.creamDim }}>Te esperamos para vivir esta aventura juntos.</p>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.cream} strokeWidth="1.5" className="mb-5" style={{ animation: 'ppBounce 1.8s ease-in-out infinite' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
          <PpBtn href={D.whatsapp} solid>✈ Confirmar asistencia</PpBtn>
        </Reveal>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="py-8 text-center" style={{ background: C.sageDeep }}>
        <Label style={{ fontSize: '18px', letterSpacing: '0.2em' }}>Enkarta</Label>
        <p className="mt-1" style={{ fontFamily: F.body, fontSize: '15px', color: C.creamDim }}>¿Deseas una invitación para tu evento? <span style={{ fontWeight: 700 }}>Contáctanos</span></p>
      </footer>
    </div>
  );
}
