'use client';

import { useEffect, useRef, useState } from 'react';
import { useCountdown, Reveal, EventIcon } from './shared';

// ── Palette (newspaper, black on white) ───────────────────────────────────────
const C = { paper: '#fdfcfa', ink: '#1a1714', soft: '#3c372f', faint: '#7a7368', rule: '#1a1714' };
const FONT = {
  black: "'UnifrakturMaguntia', serif", // blackletter — cover only
  head: "'Playfair Display', Georgia, serif",
  body: "'PT Serif', Georgia, serif",
  script: "'Great Vibes', cursive",
};
const PHOTO = '/catalog/primicia.jpg';

const D = {
  groom: 'Jhonna',
  bride: 'Nikol',
  initials: ['J', 'N'] as [string, string],
  isoDate: '2027-03-27T16:00:00',
  dateWeekday: 'Sábado',
  dateDay: '27',
  dateMonth: 'Marzo',
  dateYear: '2027',
  dateLine: 'Sábado, 27 de Marzo, 2027',
  coupleMessage: [
    'Nos conocimos entre risas y miradas cómplices, sin percibir cómo la amistad se transformó en un amor profundo.',
    'Con la bendición de nuestras familias y el corazón rebosante de gratitud, nos unimos ante Dios para celebrar este regalo de vida compartida. Gracias a todos por su apoyo y cariño en este nuevo capítulo que apenas comienza.',
  ],
  parentsBride: ['Mateo Martinez Paz', 'Santiago Lopez Saenz'],
  parentsGroom: ['Isabela Vargas', 'Catalina Mamani'],
  itinerary: [
    { label: 'Ceremonia Civil y Religiosa', time: '16:00 h', icon: 'church' },
    { label: 'Recepción Social', time: '18:00 h', icon: 'rings' },
    { label: 'Vals y Brindis', time: '18:30 h', icon: 'cheers' },
    { label: 'Cena', time: '20:00 h', icon: 'dinner' },
    { label: 'A bailar', time: '20:30 h', icon: 'dance' },
    { label: 'Fin de la fiesta', time: '00:00 h', icon: 'cheers' },
  ],
  dressCode: 'Formal',
  locations: [
    { name: 'Iglesia La Resurrección', time: '4:00 PM', place: 'Iglesia La Resurrección', desc: 'Un espacio sagrado donde uniremos nuestras vidas, rodeados del amor de nuestros seres queridos y la bendición que marcará el inicio de nuestra nueva etapa juntos.', maps: 'https://maps.google.com' },
    { name: 'Cóctel de Bienvenida', time: '6:00 PM', place: 'La Floresta', desc: 'Un espacio perfecto para compartir con nuestros seres queridos y brindar por el amor de los recién casados.', maps: '' },
    { name: 'Recepción Social', time: '7:00 PM', place: 'La Floresta', desc: 'Una noche llena de alegría, música y celebración en honor a nuestra unión.', maps: 'https://maps.google.com' },
  ],
  rsvpMessage: 'Nos emociona profundamente compartir este momento sagrado con ustedes y hacer de este día un recuerdo inolvidable. Los esperamos con toda la alegría y energía, con ganas de disfrutar y crear recuerdos que permanezcan en nuestros corazones. Su compañía iluminará nuestra celebración.',
  giftMessage: 'Ya tenemos pensado el Ferrari, la mansión y el velero. Ahora lo único que nos falta es el dinero.',
  giftAccount: { no: '191-0848715-0-50', cci: '002-1911084087157' },
  whatsapp: 'https://wa.me/0000000000?text=Confirmo%20mi%20asistencia',
};

// ── Bits ──────────────────────────────────────────────────────────────────────
function Rule({ className = '' }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <div style={{ borderTop: `2.5px solid ${C.rule}`, marginBottom: '2px' }} />
      <div style={{ borderTop: `1px solid ${C.rule}` }} />
    </div>
  );
}
function Head({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <h3 className={className} style={{ fontFamily: FONT.head, color: C.ink, fontWeight: 800, lineHeight: 1.15, ...style }}>{children}</h3>;
}
// Solid black button (newspaper)
function BlackBtn({ children, href, onClick, full }: { children: React.ReactNode; href?: string; onClick?: () => void; full?: boolean }) {
  const cls = `inline-flex items-center justify-center px-8 py-3 text-[12px] tracking-[0.16em] uppercase transition-all duration-300 hover:opacity-85 ${full ? 'w-full' : ''}`;
  const style: React.CSSProperties = { background: C.ink, color: C.paper, fontFamily: FONT.head, fontWeight: 600 };
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>{children}</a>;
  return <button onClick={onClick} className={cls} style={style}>{children}</button>;
}
// Black bordered button (cover)
function OutBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button onClick={onClick} className="inline-flex items-center justify-center px-7 py-2.5 text-[12px] tracking-[0.18em] uppercase transition-all duration-300 hover:bg-[#1a1714] hover:text-white" style={{ border: `1.5px solid ${C.ink}`, color: C.ink, fontFamily: FONT.head, fontWeight: 600 }}>{children}</button>;
}
function Photo({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  // grayscale newspaper photo
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={PHOTO} alt="" className={className} style={{ filter: 'grayscale(100%) contrast(1.05)', objectFit: 'cover', ...style }} />;
}

export default function Primicia({ guestName, guestPasses }: { guestName?: string; guestPasses?: string }) {
  const { days, hours, mins } = useCountdown(D.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => { document.body.style.background = C.paper; return () => { document.body.style.background = ''; }; }, []);
  const enter = () => document.getElementById('pr-hero')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden" style={{ background: C.paper, color: C.ink, fontFamily: FONT.body }}>
      <style>{`@keyframes prBounce { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(7px);} }`}</style>

      <button onClick={() => { const a = audioRef.current; if (!a) { setPlaying(p => !p); return; } if (playing) { a.pause(); setPlaying(false); } else a.play().then(() => setPlaying(true)).catch(() => {}); }}
        className="fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110" style={{ border: `1.5px solid ${C.ink}`, background: C.paper }} aria-label="Música">
        <svg width="16" height="16" viewBox="0 0 24 24" fill={C.ink}><path d="M9 17a3 3 0 11-2-2.83V5l11-2v10.17A3 3 0 1116 14V7L9 8.4V17z" /></svg>
      </button>

      {/* ════════ COVER ════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-3xl">
          <p style={{ fontFamily: FONT.head, fontWeight: 700, letterSpacing: '0.3em', fontSize: '10px' }}>EDICIÓN ESPECIAL · BODAS</p>
          <p className="mt-5" style={{ fontFamily: FONT.black, fontSize: 'clamp(34px,7vw,72px)', lineHeight: 1 }}>Noticia de Último momento</p>
          <Head className="mt-4" style={{ fontSize: 'clamp(28px,6vw,58px)', fontWeight: 900, textTransform: 'uppercase' }}>La Boda del Año</Head>
          <Rule className="mt-8 mb-2" />
          <p style={{ fontFamily: FONT.head, fontWeight: 600, letterSpacing: '0.08em', fontSize: 'clamp(11px,2.4vw,15px)', textTransform: 'uppercase' }}>{D.dateLine}</p>
          <Rule className="mt-2 mb-10" />
          <OutBtn onClick={enter}>Ingresar a mi invitación</OutBtn>
        </div>
      </section>

      {/* ════════ HERO PHOTO ════════ */}
      <section id="pr-hero" className="relative">
        <div className="relative w-full" style={{ height: '92vh', overflow: 'hidden' }}>
          <Photo className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, transparent 40%, rgba(0,0,0,0.45) 100%)' }} />
          <div className="absolute inset-x-0 bottom-[13%] text-center text-white px-6">
            <p style={{ fontFamily: FONT.script, fontSize: 'clamp(46px,11vw,104px)', lineHeight: 0.9 }}>{D.groom}</p>
            <p style={{ fontFamily: FONT.script, fontSize: 'clamp(22px,5vw,40px)', margin: '2px 0' }}>&amp;</p>
            <p style={{ fontFamily: FONT.script, fontSize: 'clamp(46px,11vw,104px)', lineHeight: 0.9 }}>{D.bride}</p>
          </div>
          <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full" style={{ height: '7vh' }} aria-hidden>
            <path d="M0 8 L0 4 Q 50 -2 100 4 L100 8 Z" fill={C.paper} />
          </svg>
        </div>
        <div className="flex items-center justify-center gap-4 py-7">
          <span style={{ fontFamily: FONT.head, fontWeight: 700, fontSize: '26px' }}>{D.initials[0]}</span>
          <span style={{ width: '1px', height: '34px', background: C.ink, opacity: 0.5 }} />
          <span style={{ fontFamily: FONT.head, fontWeight: 700, fontSize: '26px' }}>{D.initials[1]}</span>
        </div>
      </section>

      {/* ════════ WELCOME ════════ */}
      <section className="px-6 py-16 text-center max-w-2xl mx-auto">
        <Reveal>
          <Head style={{ fontSize: 'clamp(18px,4vw,26px)' }}>Bienvenidos a la invitación de nuestra Boda</Head>
          <Rule className="w-24 mx-auto mt-6 mb-6" />
          {guestName && <p style={{ fontFamily: FONT.script, fontSize: '42px', color: C.ink }}>{guestName}</p>}
          <p className="mt-2 italic" style={{ color: C.soft, fontSize: '17px' }}>Hemos reservado:</p>
          <p style={{ fontFamily: FONT.head, fontWeight: 800, fontSize: '30px' }}>{guestPasses || '2 pases'}</p>
          <p className="italic" style={{ color: C.soft, fontSize: '17px' }}>en su honor</p>
        </Reveal>
      </section>

      {/* ════════ COUNTDOWN (black boxes) ════════ */}
      <section className="px-6 py-12 text-center">
        <Reveal>
          <Head style={{ fontSize: 'clamp(16px,3.6vw,24px)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>¡El gran día se acerca y no puedes faltar!</Head>
          <div className="flex items-center justify-center gap-4 mt-7 mb-7">
            <span style={{ fontFamily: FONT.head, letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: '13px' }}>{D.dateWeekday}</span>
            <span style={{ fontFamily: FONT.head, fontWeight: 900, fontSize: 'clamp(40px,9vw,58px)', lineHeight: 1 }}>{D.dateDay}</span>
            <div className="text-left leading-tight" style={{ fontFamily: FONT.head, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.1em' }}><div>{D.dateMonth}</div><div>{D.dateYear}</div></div>
          </div>
          <div className="flex items-start justify-center gap-3 sm:gap-5">
            {[[days, 'Días'], [hours, 'Horas'], [mins, 'Mins.']].map(([n, l]) => (
              <div key={l as string} className="text-center">
                <div className="flex items-center justify-center" style={{ background: C.ink, color: C.paper, width: 'clamp(64px,18vw,92px)', height: 'clamp(64px,18vw,92px)' }}>
                  <span style={{ fontFamily: FONT.head, fontWeight: 800, fontSize: 'clamp(26px,7vw,40px)' }}>{String(n).padStart(2, '0')}</span>
                </div>
                <p className="mt-2" style={{ fontFamily: FONT.head, fontSize: '12px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{l}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ════════ MENSAJE DE LOS NOVIOS (photo + text) ════════ */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            <Photo className="w-full" style={{ height: 'clamp(360px,60vw,540px)' }} />
            <div>
              <p style={{ fontFamily: FONT.head, fontWeight: 900, fontSize: '52px', lineHeight: 0.5, color: C.ink }}>&rdquo;</p>
              <Head className="mt-1" style={{ fontSize: 'clamp(22px,4vw,30px)' }}>Mensaje de los novios</Head>
              <div className="mt-5 space-y-4" style={{ fontFamily: FONT.body, fontSize: '16px', lineHeight: 1.75, color: C.soft, textAlign: 'justify' }}>
                {D.coupleMessage.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ════════ BLESSING / PARENTS (text + photo) ════════ */}
      <section className="px-6 py-12 max-w-5xl mx-auto">
        <Reveal>
          <Head className="text-center mb-10" style={{ fontSize: 'clamp(15px,3.4vw,22px)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Con la bendición de Dios y de nuestros padres</Head>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="text-center md:text-left space-y-8">
              {[['Padres de la Novia', D.parentsBride], ['Padres del Novio', D.parentsGroom]].map(([label, ps]) => (
                <div key={label as string}>
                  <Head style={{ fontSize: '20px' }}>{label as string}</Head>
                  <div className="mt-1">{(ps as string[]).map(p => <p key={p} style={{ fontFamily: FONT.body, fontSize: '17px', color: C.soft }}>{p}</p>)}</div>
                </div>
              ))}
            </div>
            <Photo className="w-full order-first md:order-last" style={{ height: 'clamp(340px,55vw,520px)' }} />
          </div>
        </Reveal>
      </section>

      {/* ════════ ITINERARIO (vertical timeline) ════════ */}
      <section className="px-6 py-16">
        <Reveal>
          <Head className="text-center mb-12" style={{ fontSize: 'clamp(24px,5vw,38px)' }}>Itinerario</Head>
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute left-1/2 top-2 bottom-2 -translate-x-1/2" style={{ width: '1px', background: 'rgba(26,23,20,0.35)' }} aria-hidden />
            <div className="space-y-9">
              {D.itinerary.map((it, i) => {
                const left = i % 2 === 0;
                const block = (
                  <div className={`flex flex-col items-center ${left ? 'md:items-end md:text-right' : 'md:items-start md:text-left'} text-center`}>
                    <EventIcon name={it.icon} className="w-9 h-9 mb-1.5" stroke={C.ink} />
                    <p style={{ fontFamily: FONT.body, fontSize: '16px', color: C.soft }}>{it.label}</p>
                    <p style={{ fontFamily: FONT.head, fontWeight: 700, fontSize: '17px' }}>{it.time}</p>
                  </div>
                );
                return (
                  <div key={i} className="relative grid grid-cols-1 md:grid-cols-[1fr_28px_1fr] items-center gap-2">
                    <div className={`hidden md:block ${left ? 'md:pr-6' : ''}`}>{left && block}</div>
                    <div className="hidden md:flex justify-center"><span className="w-2.5 h-2.5 rounded-full" style={{ background: C.ink }} /></div>
                    <div className={`hidden md:block ${!left ? 'md:pl-6' : ''}`}>{!left && block}</div>
                    <div className="md:hidden">{block}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ════════ DRESS CODE ════════ */}
      <section className="px-6 py-16 text-center">
        <Reveal>
          <Head style={{ fontSize: 'clamp(24px,5vw,38px)' }}>Código de Vestimenta</Head>
          <p className="mt-4" style={{ fontFamily: FONT.body, fontSize: '17px', color: C.soft }}>Para este día tan especial, se ha elegido un estilo:</p>
          <p className="mt-2" style={{ fontFamily: FONT.head, fontWeight: 900, fontSize: 'clamp(30px,7vw,52px)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{D.dressCode}</p>
        </Reveal>
      </section>

      {/* ════════ LOCATIONS ════════ */}
      <section className="px-6 py-12 max-w-3xl mx-auto">
        <Reveal>
          <div className="flex justify-center mb-8">
            <svg width="40" height="48" viewBox="0 0 24 28" fill="none" stroke={C.ink} strokeWidth="1.2"><path d="M12 1C7 1 3 5 3 10c0 6.5 9 16 9 16s9-9.5 9-16c0-5-4-9-9-9z" /><circle cx="12" cy="10" r="3.2" /></svg>
          </div>
          <div className="space-y-8">
            {D.locations.map((loc, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-2" style={{ border: `1.5px solid ${C.ink}` }}>
                <div className="relative">
                  <div className="absolute top-3 left-3 right-3 z-10 text-center py-1.5 px-2" style={{ background: C.ink }}>
                    <p style={{ fontFamily: FONT.head, fontWeight: 700, color: C.paper, fontSize: '12px', letterSpacing: '0.06em' }}>{loc.name.toUpperCase()}</p>
                  </div>
                  <Photo className="w-full" style={{ height: '210px' }} />
                </div>
                <div className="p-5 flex flex-col justify-center">
                  <p style={{ fontFamily: FONT.head, fontWeight: 700, fontSize: '14px' }}>| {loc.time} | {loc.place},</p>
                  <p className="mt-2" style={{ fontFamily: FONT.body, fontSize: '14px', color: C.soft, lineHeight: 1.6 }}>{loc.desc}</p>
                  {loc.maps && <div className="mt-4"><BlackBtn href={loc.maps} full>Ver ubicación</BlackBtn></div>}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ════════ NO KIDS ════════ */}
      <section className="px-6 py-10 max-w-3xl mx-auto">
        <Reveal>
          <div className="flex items-center gap-5 p-5" style={{ border: `1.5px solid ${C.ink}` }}>
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none" stroke={C.ink} strokeWidth="1.2" className="flex-shrink-0"><circle cx="24" cy="24" r="20" /><circle cx="24" cy="18" r="5" /><path d="M14 38c0-6 4-10 10-10s10 4 10 10" /><path d="M10 10 38 38" /></svg>
            <p style={{ fontFamily: FONT.body, fontSize: '16px', color: C.soft, lineHeight: 1.6 }}>Amamos a sus niños y queremos que ustedes disfruten sin parar, por ello es que la invitación es solo para adultos.</p>
          </div>
        </Reveal>
      </section>

      {/* ════════ RSVP (text + photo) ════════ */}
      <section className="px-6 py-14 max-w-5xl mx-auto">
        <Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <Head style={{ fontSize: 'clamp(24px,4.5vw,34px)' }}>Querida familia y Amigos</Head>
              <p className="mt-5" style={{ fontFamily: FONT.body, fontSize: '15px', color: C.soft, lineHeight: 1.75, textAlign: 'justify' }}>{D.rsvpMessage}</p>
              <div className="mt-7 p-6 text-center" style={{ border: `1.5px solid ${C.ink}` }}>
                <Head style={{ fontSize: '20px', textTransform: 'uppercase' }}>Confirmar Asistencia</Head>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="1.5" className="mx-auto my-4"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12l2.5 2.5 4.5-5" /></svg>
                <p className="mb-5 italic" style={{ fontFamily: FONT.body, fontSize: '15px', color: C.soft }}>Es importante para nosotros que puedas confirmar tu asistencia.</p>
                <BlackBtn href={D.whatsapp} full>Confirmar</BlackBtn>
              </div>
            </div>
            <Photo className="w-full order-first md:order-last" style={{ height: 'clamp(380px,60vw,560px)' }} />
          </div>
        </Reveal>
      </section>

      {/* ════════ GIFT ════════ */}
      <section className="px-6 py-14 max-w-2xl mx-auto text-center">
        <Reveal>
          <div className="p-8" style={{ border: `1.5px solid ${C.ink}` }}>
            <Head style={{ fontSize: 'clamp(20px,4.5vw,30px)', textTransform: 'uppercase' }}>Sugerencia de Regalo</Head>
            <p className="mt-5 mx-auto max-w-lg italic" style={{ fontFamily: FONT.body, fontSize: '17px', color: C.soft, lineHeight: 1.7 }}>{D.giftMessage}</p>
            <div className="mt-6 inline-block text-left">
              <p style={{ fontFamily: FONT.body, fontSize: '16px' }}><b>No:</b> {D.giftAccount.no}</p>
              <p style={{ fontFamily: FONT.body, fontSize: '16px' }}><b>CCI:</b> {D.giftAccount.cci}</p>
            </div>
            <p className="mt-5 italic" style={{ color: C.soft, fontSize: '15px' }}>Gracias por su muestra de cariño.</p>
          </div>
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
