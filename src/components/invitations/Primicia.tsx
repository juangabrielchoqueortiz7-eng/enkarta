'use client';

import { useEffect, useRef, useState } from 'react';
import { useCountdown, Reveal } from './shared';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  paper: '#f4f1e9',
  ink: '#17150f',
  soft: '#4a463c',
  faint: '#8a8475',
  rule: '#17150f',
};
const FONT = {
  black: "'UnifrakturMaguntia', serif", // blackletter masthead
  head: "'Playfair Display', Georgia, serif",
  body: "'PT Serif', Georgia, serif",
  script: "'Great Vibes', cursive",
};

// Demo content (real data wired later)
const D = {
  groom: 'Jhonna',
  bride: 'Nikol',
  initials: ['J', 'N'] as [string, string],
  isoDate: '2027-03-27T16:00:00',
  weekday: 'Sábado',
  day: '27',
  month: 'Marzo',
  year: '2027',
  dateLine: 'Sábado, 27 de Marzo, 2027',
  heroPhoto:
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80',
  coupleMessage: [
    'Nos conocimos entre risas y miradas cómplices, sin percibir cómo la amistad se transformó en un amor profundo.',
    'Con la bendición de nuestras familias y el corazón rebosante de gratitud, nos unimos ante Dios para celebrar este regalo de vida compartida. Gracias a todos por su apoyo y cariño en este nuevo capítulo que apenas comienza.',
  ],
  parentsBride: ['Mateo Martinez Paz', 'Santiago Lopez Saenz'],
  parentsGroom: ['Isabela Vargas', 'Catalina Mamani'],
  itinerary: [
    { label: 'Ceremonia Civil y Religiosa', time: '16:00 h' },
    { label: 'Recepción Social', time: '18:00 h' },
    { label: 'Vals y Brindis', time: '18:30 h' },
    { label: 'Cena', time: '20:00 h' },
    { label: 'A bailar', time: '20:30 h' },
    { label: 'Fin de la fiesta', time: '00:00 h' },
  ],
  dressCode: 'Formal',
  locations: [
    {
      name: 'Iglesia La Resurrección',
      time: '4:00 PM',
      place: 'Iglesia La Resurrección',
      desc: 'Un espacio sagrado donde uniremos nuestras vidas, rodeados del amor de nuestros seres queridos y la bendición que marcará el inicio de nuestra nueva etapa juntos.',
      maps: 'https://maps.google.com',
    },
    {
      name: 'Cóctel de Bienvenida',
      time: '6:00 PM',
      place: 'La Floresta',
      desc: 'Un espacio perfecto para compartir con nuestros seres queridos y brindar por el amor de los recién casados.',
      maps: '',
    },
    {
      name: 'Recepción Social',
      time: '7:00 PM',
      place: 'La Floresta',
      desc: 'Una noche llena de alegría, música y celebración en honor a nuestra unión.',
      maps: 'https://maps.google.com',
    },
  ],
  rsvpMessage:
    'Nos emociona profundamente compartir este momento sagrado con ustedes y hacer de este día un recuerdo inolvidable. Los esperamos con toda la alegría y energía, con ganas de disfrutar y crear recuerdos que permanezcan en nuestros corazones.',
  giftMessage:
    'Ya tenemos pensado el Ferrari, la mansión y el velero. Ahora lo único que nos falta es el dinero.',
  giftAccount: { no: '191-0848715-0-50', cci: '002-1911084087157' },
  whatsapp: 'https://wa.me/0000000000?text=Confirmo%20mi%20asistencia',
};

// ── Newspaper double rule ─────────────────────────────────────────────────────
function Rule({ className = '' }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <div style={{ borderTop: `2.5px solid ${C.rule}`, marginBottom: '2px' }} />
      <div style={{ borderTop: `1px solid ${C.rule}` }} />
    </div>
  );
}

// Headline (newspaper, bold serif caps)
function Headline({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <h3 className={className} style={{ fontFamily: FONT.head, color: C.ink, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.15, ...style }}>
      {children}
    </h3>
  );
}

// Blackletter flourish heading
function Black({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <p className={className} style={{ fontFamily: FONT.black, color: C.ink, lineHeight: 1, ...style }}>{children}</p>;
}

// Outline button (newspaper)
function NewsBtn({ children, href, onClick }: { children: React.ReactNode; href?: string; onClick?: () => void }) {
  const cls = 'inline-flex items-center justify-center px-7 py-2.5 text-[12px] tracking-[0.18em] uppercase transition-all duration-300 hover:bg-[#17150f] hover:text-[#f4f1e9]';
  const style: React.CSSProperties = { border: `1.5px solid ${C.ink}`, color: C.ink, fontFamily: FONT.head, fontWeight: 600 };
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>{children}</a>;
  return <button onClick={onClick} className={cls} style={style}>{children}</button>;
}

export default function Primicia({ guestName, guestPasses }: { guestName?: string; guestPasses?: string }) {
  const { days, hours, mins } = useCountdown(D.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    document.body.style.background = C.paper;
    return () => { document.body.style.background = ''; };
  }, []);

  const enter = () => document.getElementById('pr-hero')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden" style={{ background: C.paper, color: C.ink, fontFamily: FONT.body }}>
      <style>{`
        @keyframes prBounce { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(7px);} }
        .pr-col { column-gap: 28px; }
        @media (min-width: 640px){ .pr-col-2 { column-count: 2; } }
      `}</style>

      {/* Music toggle */}
      <button onClick={() => { const a = audioRef.current; if (!a) { setPlaying(p => !p); return; } if (playing) { a.pause(); setPlaying(false); } else a.play().then(() => setPlaying(true)).catch(() => {}); }}
        className="fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
        style={{ border: `1.5px solid ${C.ink}`, background: C.paper }} aria-label="Música">
        <svg width="16" height="16" viewBox="0 0 24 24" fill={C.ink}><path d="M9 17a3 3 0 11-2-2.83V5l11-2v10.17A3 3 0 1116 14V7L9 8.4V17z" /></svg>
      </button>

      {/* ════════ COVER (newspaper masthead) ════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-3xl">
          <Black className="text-[8px] sm:text-[10px] tracking-[0.3em] mb-6" style={{ fontFamily: FONT.head, fontWeight: 700, letterSpacing: '0.3em' }}>EDICIÓN ESPECIAL · BODAS</Black>
          <Black style={{ fontSize: 'clamp(34px, 7vw, 72px)' }}>Noticia de Último momento</Black>
          <Headline className="mt-4" style={{ fontSize: 'clamp(28px, 6vw, 58px)', fontWeight: 900 }}>La Boda del Año</Headline>
          <Rule className="mt-8 mb-2" />
          <p style={{ fontFamily: FONT.head, fontWeight: 600, letterSpacing: '0.08em', fontSize: 'clamp(11px,2.4vw,15px)', textTransform: 'uppercase' }}>{D.dateLine}</p>
          <Rule className="mt-2 mb-10" />
          <NewsBtn onClick={enter}>Ingresar a mi invitación</NewsBtn>
        </div>
      </section>

      {/* ════════ HERO PHOTO ════════ */}
      <section id="pr-hero" className="relative">
        <div className="relative w-full" style={{ height: '92vh', overflow: 'hidden' }}>
          <img src={D.heroPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'grayscale(15%) contrast(1.02)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 35%, rgba(0,0,0,0.35) 100%)' }} />
          <div className="absolute inset-x-0 bottom-[12%] text-center text-white px-6">
            <p style={{ fontFamily: FONT.script, fontSize: 'clamp(46px,11vw,104px)', lineHeight: 0.9 }}>{D.groom}</p>
            <p style={{ fontFamily: FONT.script, fontSize: 'clamp(22px,5vw,40px)', margin: '2px 0' }}>&amp;</p>
            <p style={{ fontFamily: FONT.script, fontSize: 'clamp(46px,11vw,104px)', lineHeight: 0.9 }}>{D.bride}</p>
          </div>
          {/* book-fold white edge */}
          <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full" style={{ height: '7vh' }} aria-hidden>
            <path d="M0 8 L0 4 Q 50 -2 100 4 L100 8 Z" fill={C.paper} />
            <path d="M0 4 Q 50 -2 100 4" fill="none" stroke={C.ink} strokeWidth="0.15" />
          </svg>
        </div>
        {/* J | N monogram */}
        <div className="flex items-center justify-center gap-4 py-7" style={{ background: C.paper }}>
          <span style={{ fontFamily: FONT.head, fontWeight: 700, fontSize: '26px' }}>{D.initials[0]}</span>
          <span style={{ width: '1px', height: '34px', background: C.ink, opacity: 0.5 }} />
          <span style={{ fontFamily: FONT.head, fontWeight: 700, fontSize: '26px' }}>{D.initials[1]}</span>
        </div>
      </section>

      {/* ════════ WELCOME + guest ════════ */}
      <section className="px-6 py-16 text-center max-w-2xl mx-auto">
        <Reveal>
          <Headline style={{ fontSize: 'clamp(18px,4vw,26px)', fontWeight: 700 }}>Bienvenidos a la invitación de nuestra Boda</Headline>
          <Rule className="w-24 mx-auto mt-6 mb-6" />
          {guestName && <p style={{ fontFamily: FONT.script, fontSize: '40px', color: C.ink }}>{guestName}</p>}
          <p className="mt-2 italic" style={{ color: C.soft, fontSize: '17px' }}>Hemos reservado:</p>
          <p style={{ fontFamily: FONT.head, fontWeight: 800, fontSize: '30px', letterSpacing: '0.04em' }}>{guestPasses || '2 pases'}</p>
          <p className="italic" style={{ color: C.soft, fontSize: '17px' }}>en su honor</p>
        </Reveal>
      </section>

      {/* ════════ COUNTDOWN ════════ */}
      <section className="px-6 py-14 text-center" style={{ background: C.ink, color: C.paper }}>
        <Reveal>
          <Headline style={{ color: C.paper, fontSize: 'clamp(17px,4vw,26px)', fontWeight: 800 }}>¡El gran día se acerca y no puedes faltar!</Headline>
          <div className="flex items-center justify-center gap-4 mt-8 mb-8">
            <span style={{ fontFamily: FONT.head, letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '13px' }}>{D.weekday}</span>
            <span style={{ fontFamily: FONT.head, fontWeight: 900, fontSize: 'clamp(40px,9vw,60px)', lineHeight: 1 }}>{D.day}</span>
            <div className="text-left leading-tight" style={{ fontFamily: FONT.head, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              <div>{D.month}</div><div>{D.year}</div>
            </div>
          </div>
          <div className="flex items-start justify-center gap-8">
            {[[days, 'Días'], [hours, 'Horas'], [mins, 'Mins.']].map(([n, l]) => (
              <div key={l as string} className="text-center">
                <p style={{ fontFamily: FONT.head, fontWeight: 800, fontSize: 'clamp(28px,7vw,44px)', lineHeight: 1 }}>{String(n).padStart(2, '0')}</p>
                <p className="mt-1" style={{ fontFamily: FONT.head, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.7 }}>{l}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ════════ MESSAGE (newspaper columns) ════════ */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <Reveal>
          <div className="text-center mb-6">
            <Black style={{ fontSize: 'clamp(30px,6vw,46px)' }}>Mensaje de los novios</Black>
          </div>
          <Rule className="mb-6" />
          <div className="pr-col pr-col-2" style={{ fontFamily: FONT.body, fontSize: '16px', lineHeight: 1.75, color: C.soft, textAlign: 'justify' }}>
            {D.coupleMessage.map((p, i) => (
              <p key={i} className="mb-4" style={i === 0 ? { textIndent: 0 } : {}}>
                {i === 0 && <span style={{ float: 'left', fontFamily: FONT.head, fontWeight: 800, fontSize: '52px', lineHeight: 0.8, paddingRight: '8px', color: C.ink }}>{p.charAt(0)}</span>}
                {i === 0 ? p.slice(1) : p}
              </p>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ════════ BLESSING / PARENTS ════════ */}
      <section className="px-6 py-14 text-center max-w-3xl mx-auto">
        <Reveal>
          <Rule className="w-32 mx-auto mb-6" />
          <Headline style={{ fontSize: 'clamp(15px,3.5vw,22px)', fontWeight: 700 }}>Con la bendición de Dios y de nuestros padres</Headline>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8">
            {[['Padres de la Novia', D.parentsBride], ['Padres del Novio', D.parentsGroom]].map(([label, ps]) => (
              <div key={label as string}>
                <p style={{ fontFamily: FONT.script, fontSize: '26px', color: C.ink, marginBottom: '6px' }}>{label as string}</p>
                {(ps as string[]).map(p => <p key={p} style={{ fontFamily: FONT.body, fontSize: '17px', color: C.soft }}>{p}</p>)}
              </div>
            ))}
          </div>
          <Rule className="w-32 mx-auto mt-8" />
        </Reveal>
      </section>

      {/* ════════ ITINERARY ════════ */}
      <section className="px-6 py-16" style={{ background: C.ink, color: C.paper }}>
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <p className="text-center italic" style={{ fontFamily: FONT.head, fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.7 }}>Exclusiva: dos almas, una bendición y un gran «sí»</p>
            <div className="text-center mt-2 mb-8"><Black style={{ color: C.paper, fontSize: 'clamp(32px,6vw,48px)' }}>Itinerario</Black></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-5">
              {D.itinerary.map((it, i) => (
                <div key={i} className="flex items-baseline justify-between gap-3" style={{ borderBottom: '1px solid rgba(244,241,233,0.25)', paddingBottom: '8px' }}>
                  <span style={{ fontFamily: FONT.body, fontSize: '16px' }}>{it.label}</span>
                  <span style={{ fontFamily: FONT.head, fontWeight: 800, fontSize: '18px', whiteSpace: 'nowrap' }}>{it.time}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ════════ DRESS CODE ════════ */}
      <section className="px-6 py-16 text-center">
        <Reveal>
          <Black style={{ fontSize: 'clamp(26px,5vw,40px)' }}>Código de Vestimenta</Black>
          <p className="mt-4" style={{ fontFamily: FONT.body, fontSize: '17px', color: C.soft }}>Para este día tan especial, se ha elegido un estilo:</p>
          <p className="mt-2" style={{ fontFamily: FONT.head, fontWeight: 900, fontSize: 'clamp(30px,7vw,52px)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{D.dressCode}</p>
        </Reveal>
      </section>

      {/* ════════ LOCATIONS ════════ */}
      <section className="px-6 py-12 max-w-3xl mx-auto">
        <Reveal>
          <p className="text-center italic mb-2" style={{ fontFamily: FONT.head, fontSize: '12px', letterSpacing: '0.16em', textTransform: 'uppercase', color: C.faint }}>Únete a nosotros para celebrar una unión de amor, risas y felicidad</p>
          <div className="text-center mb-10"><Black style={{ fontSize: 'clamp(30px,6vw,46px)' }}>¿Dónde será?</Black></div>
        </Reveal>
        <div className="space-y-10">
          {D.locations.map((loc, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="text-center">
                <Headline style={{ fontSize: 'clamp(16px,3.6vw,22px)', fontWeight: 800 }}>{loc.name}</Headline>
                <p className="mt-1" style={{ fontFamily: FONT.head, fontSize: '14px', letterSpacing: '0.08em' }}>| {loc.time} | {loc.place}</p>
                <p className="mt-3 mx-auto max-w-xl italic" style={{ fontFamily: FONT.body, fontSize: '15px', color: C.soft, lineHeight: 1.7 }}>{loc.desc}</p>
                {loc.maps && <div className="mt-4"><NewsBtn href={loc.maps}>Ver ubicación</NewsBtn></div>}
              </div>
              {i < D.locations.length - 1 && <Rule className="w-24 mx-auto mt-10" />}
            </Reveal>
          ))}
        </div>
      </section>

      {/* ════════ NO KIDS ════════ */}
      <section className="px-6 py-14 text-center" style={{ background: C.ink, color: C.paper }}>
        <Reveal>
          <p className="max-w-xl mx-auto italic" style={{ fontFamily: FONT.body, fontSize: '17px', lineHeight: 1.7 }}>
            Amamos a sus niños y queremos que ustedes disfruten sin parar, por ello es que la invitación es solo para <span style={{ fontFamily: FONT.head, fontWeight: 800, fontStyle: 'normal' }}>adultos</span>.
          </p>
        </Reveal>
      </section>

      {/* ════════ RSVP ════════ */}
      <section className="px-6 py-16 text-center max-w-2xl mx-auto">
        <Reveal>
          <Black style={{ fontSize: 'clamp(28px,5.5vw,42px)' }}>Querida familia y Amigos</Black>
          <p className="mt-6 italic" style={{ fontFamily: FONT.body, fontSize: '16px', color: C.soft, lineHeight: 1.75 }}>{D.rsvpMessage}</p>
          <Rule className="w-24 mx-auto mt-8 mb-6" />
          <p style={{ fontFamily: FONT.head, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '14px' }}>Confirmar asistencia</p>
          <p className="mt-2 mb-5 italic" style={{ color: C.soft, fontSize: '15px' }}>Es importante para nosotros que puedas confirmar tu asistencia.</p>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="1.5" className="mx-auto mb-5" style={{ animation: 'prBounce 1.8s ease-in-out infinite' }}><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
          <NewsBtn href={D.whatsapp}>Confirmar</NewsBtn>
        </Reveal>
      </section>

      {/* ════════ GIFT ════════ */}
      <section className="px-6 py-16 text-center max-w-2xl mx-auto">
        <Reveal>
          <Rule className="mb-8" />
          <Headline style={{ fontSize: 'clamp(20px,4.5vw,30px)', fontWeight: 800 }}>Sugerencia de Regalo</Headline>
          <p className="mt-5 mx-auto max-w-lg italic" style={{ fontFamily: FONT.body, fontSize: '17px', color: C.soft, lineHeight: 1.7 }}>{D.giftMessage}</p>
          <div className="mt-7 inline-block text-left px-8 py-5" style={{ border: `1.5px solid ${C.ink}` }}>
            <p style={{ fontFamily: FONT.body, fontSize: '16px' }}><b>No:</b> {D.giftAccount.no}</p>
            <p style={{ fontFamily: FONT.body, fontSize: '16px' }}><b>CCI:</b> {D.giftAccount.cci}</p>
          </div>
          <p className="mt-6 italic" style={{ color: C.soft, fontSize: '15px' }}>Gracias por su muestra de cariño.</p>
          <Rule className="mt-8" />
        </Reveal>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="py-8 text-center" style={{ background: C.ink, color: C.paper }}>
        <p style={{ fontFamily: FONT.black, fontSize: '24px' }}>Enkarta</p>
        <p className="mt-1" style={{ fontFamily: FONT.body, fontSize: '14px', opacity: 0.7 }}>¿Deseas una invitación para tu evento? <span style={{ fontWeight: 700 }}>Contáctanos</span></p>
      </footer>
    </div>
  );
}
