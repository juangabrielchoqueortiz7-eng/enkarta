'use client';

import { useEffect, useRef, useState } from 'react';
import { InvitationContent } from './types';
import { useCountdown, Reveal, Particles, CopyBtn, EventIcon, OrchidSprig } from './shared';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#fbfdff',
  navy: '#1e3a5f',
  navyDeep: '#16304f',
  ink: '#274a73',
  soft: '#6982a3',
  line: 'rgba(30,58,95,0.45)',
};

// ── Detailed orchid blossom ───────────────────────────────────────────────────
function OrchidBloom({ x, y, s, o = 0.9 }: { x: number; y: number; s: number; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      {/* dorsal sepal */}
      <ellipse cx="0" cy="-11" rx="6.5" ry="11" />
      {/* lateral petals */}
      <ellipse cx="-12" cy="-3" rx="11.5" ry="6.5" transform="rotate(-32)" />
      <ellipse cx="12" cy="-3" rx="11.5" ry="6.5" transform="rotate(32)" />
      {/* lateral sepals */}
      <ellipse cx="-8" cy="9" rx="8.5" ry="5.5" transform="rotate(-18)" />
      <ellipse cx="8" cy="9" rx="8.5" ry="5.5" transform="rotate(18)" />
      {/* labellum / lip */}
      <path d="M-3 3 C -5 9, -3 14, 0 15 C 3 14, 5 9, 3 3 Z" />
      {/* column */}
      <circle cx="0" cy="1" r="2.4" />
      <circle cx="0" cy="1" r="0.9" fill={C.navy} />
      {/* petal veins */}
      <line x1="0" y1="-3" x2="0" y2="-20" strokeWidth="0.5" />
      <line x1="0" y1="0" x2="-20" y2="-9" strokeWidth="0.5" />
      <line x1="0" y1="0" x2="20" y2="-9" strokeWidth="0.5" />
    </g>
  );
}

// ── Corner orchid spray (fixed frame) ─────────────────────────────────────────
function OrchidCluster({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const leaf = (x: number, y: number, rx: number, ry: number, rot: number, o: number) => (
    <g transform={`rotate(${rot} ${x} ${y})`} opacity={o}>
      <path d={`M${x - rx} ${y} Q ${x} ${y - ry * 1.6} ${x + rx} ${y} Q ${x} ${y + ry * 1.6} ${x - rx} ${y} Z`} />
      <line x1={x - rx} y1={y} x2={x + rx} y2={y} strokeWidth="0.5" />
    </g>
  );
  return (
    <svg viewBox="0 0 210 210" className={className} style={style} fill="none" stroke={C.navy} strokeWidth="1" aria-hidden>
      {/* flowing stems */}
      <path d="M6 6 C 45 28, 80 55, 104 104" strokeLinecap="round" opacity="0.85" />
      <path d="M6 6 C 26 48, 32 86, 36 128" strokeLinecap="round" opacity="0.7" />
      <path d="M34 6 C 70 22, 104 40, 132 78" strokeLinecap="round" opacity="0.6" />
      <path d="M16 30 C 40 60, 52 92, 58 132" strokeLinecap="round" opacity="0.45" />
      {/* leaves */}
      {leaf(62, 52, 16, 6, -32, 0.7)}
      {leaf(86, 82, 18, 6.5, -22, 0.65)}
      {leaf(44, 100, 15, 5.5, -58, 0.6)}
      {leaf(112, 64, 16, 6, -12, 0.6)}
      {leaf(56, 36, 13, 5, -42, 0.55)}
      {leaf(30, 70, 12, 4.5, -68, 0.45)}
      {/* buds */}
      <g opacity="0.6"><ellipse cx="138" cy="84" rx="3" ry="6" transform="rotate(40 138 84)" /><line x1="138" y1="84" x2="132" y2="78" strokeWidth="0.6" /></g>
      <g opacity="0.55"><ellipse cx="40" cy="136" rx="3" ry="6" transform="rotate(-20 40 136)" /></g>
      {/* orchid blossoms */}
      <OrchidBloom x={104} y={104} s={1} o={0.9} />
      <OrchidBloom x={40} y={126} s={0.72} o={0.8} />
      <OrchidBloom x={130} y={74} s={0.6} o={0.7} />
      <OrchidBloom x={22} y={58} s={0.5} o={0.6} />
    </svg>
  );
}

// ── Soft watercolor botanical (parallax background) ───────────────────────────
function WatercolorBg() {
  const blot = (cx: string, cy: string, r: string, o: number) => (
    <div style={{ position: 'absolute', left: cx, top: cy, width: r, height: r, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: `radial-gradient(circle, rgba(96,128,170,${o}), transparent 70%)` }} />
  );
  return (
    <div className="absolute inset-0">
      {blot('18%', '20%', '420px', 0.10)}
      {blot('82%', '34%', '380px', 0.08)}
      {blot('30%', '64%', '460px', 0.09)}
      {blot('72%', '82%', '420px', 0.08)}
      {/* faint large leaves drifting through */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 900" fill="none" stroke="#5f7ba6" strokeWidth="1" opacity="0.12">
        {[[60, 120, 40], [330, 260, -30], [110, 480, 20], [300, 640, -18], [200, 820, 8], [40, 720, -40]].map(([x, y, rot], i) => (
          <g key={i} transform={`rotate(${rot} ${x} ${y})`}>
            <path d={`M${x} ${y} C ${x - 50} ${y - 70}, ${x - 30} ${y - 150}, ${x} ${y - 200} C ${x + 30} ${y - 150}, ${x + 50} ${y - 70}, ${x} ${y} Z`} />
            <line x1={x} y1={y} x2={x} y2={y - 200} strokeWidth="0.6" />
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Monogram (intertwined initials in a soft ring) ────────────────────────────
function Monogram({ a, b, size = 150 }: { a: string; b: string; size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full border" style={{ borderColor: 'rgba(30,58,95,0.18)' }} />
      <span className="font-great leading-none" style={{ color: C.navy, fontSize: size * 0.62, marginRight: -size * 0.16, marginTop: -size * 0.04 }}>{a}</span>
      <span className="font-great leading-none" style={{ color: C.ink, fontSize: size * 0.62, marginLeft: -size * 0.16, marginBottom: -size * 0.04 }}>{b}</span>
    </div>
  );
}

// ── Circular orchid wreath with script names ──────────────────────────────────
function CircleWreath({ groom, bride, size = 300 }: { groom: string; bride: string; size?: number }) {
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 300 300" className="absolute inset-0 w-full h-full" fill="none" stroke={C.navy} strokeWidth="1" aria-hidden>
        <circle cx="150" cy="150" r="118" opacity="0.55" />
        {/* small accent sprig upper-left */}
        <g opacity="0.8" transform="translate(74 70) rotate(-30) scale(0.6)">
          <path d="M0 0 C 14 -6, 28 -4, 40 6" strokeLinecap="round" />
          <ellipse cx="14" cy="-2" rx="6" ry="2.4" transform="rotate(-18 14 -2)" />
        </g>
        <OrchidBloom x={74} y={70} s={0.5} o={0.85} />
        {/* lower-right floral cluster trailing along the ring */}
        <path d="M250 178 C 240 210, 215 238, 182 252" strokeLinecap="round" opacity="0.7" />
        <ellipse cx="232" cy="208" rx="9" ry="3.4" transform="rotate(48 232 208)" opacity="0.6" />
        <ellipse cx="208" cy="232" rx="9" ry="3.4" transform="rotate(70 208 232)" opacity="0.6" />
        <ellipse cx="258" cy="186" rx="7" ry="3" transform="rotate(36 258 186)" opacity="0.5" />
        <OrchidBloom x={252} y={172} s={0.7} o={0.9} />
        <OrchidBloom x={224} y={222} s={0.92} o={0.9} />
        <OrchidBloom x={180} y={250} s={0.66} o={0.85} />
        <g opacity="0.6"><ellipse cx="160" cy="262" rx="6" ry="2.6" transform="rotate(82 160 262)" /></g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-great leading-[0.9]" style={{ color: C.navy, fontSize: size * 0.2 }}>{groom}</span>
        <span className="font-cormorant" style={{ color: C.soft, fontSize: size * 0.07 }}>&amp;</span>
        <span className="font-great leading-[0.9]" style={{ color: C.navy, fontSize: size * 0.2 }}>{bride}</span>
      </div>
    </div>
  );
}

// ── Outline button (azure style) ──────────────────────────────────────────────
function OutlineBtn({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const cls =
    'inline-flex items-center justify-center gap-2 px-8 py-3 font-cinzel text-[11px] sm:text-[12px] tracking-[0.18em] uppercase transition-all duration-300 hover:bg-[#1e3a5f] hover:text-white';
  const style = { border: `1px solid ${C.line}`, color: C.ink, borderRadius: '20px 6px 20px 6px' } as React.CSSProperties;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>{children}</a>;
  return <button onClick={onClick} className={cls} style={style}>{children}</button>;
}

// ── Section heading (caps) + script ──────────────────────────────────────────
function CapsTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`font-cinzel tracking-[0.16em] ${className}`} style={{ color: C.soft }}>{children}</h3>;
}

export default function Azure({ data }: { data: InvitationContent }) {
  const { days, hours, mins, secs } = useCountdown(data.isoDate);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const enter = () => {
    document.getElementById('az-intro')?.scrollIntoView({ behavior: 'smooth' });
    if (data.musicUrl && audioRef.current) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  };
  const toggleMusic = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else a.play().then(() => setPlaying(true)).catch(() => {});
  };

  useEffect(() => {
    document.body.style.background = C.bg;
    return () => { document.body.style.background = ''; };
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden" style={{ background: C.bg, color: C.ink }}>
      {/* keyframes */}
      <style>{`
        @keyframes featherFall {
          0%   { transform: translateY(0) translateX(0) rotate(0deg) scale(var(--s,1)); opacity: 0; }
          12%  { opacity: .34; }
          50%  { transform: translateY(56vh) translateX(var(--drift,30px)) rotate(var(--spin,15deg)) scale(var(--s,1)); }
          88%  { opacity: .34; }
          100% { transform: translateY(116vh) translateX(0) rotate(calc(var(--spin,15deg) * -1)) scale(var(--s,1)); opacity: 0; }
        }
        @keyframes azBounce { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(8px);} }
        @keyframes azFadeUp { from{opacity:0; transform:translateY(20px);} to{opacity:1; transform:translateY(0);} }
        @keyframes azDrift { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(-14px);} }
        @keyframes azParallax { from { transform: translateY(0) scale(1.12); } to { transform: translateY(-60px) scale(1.12); } }
        @supports (animation-timeline: scroll()) {
          .az-parallax { animation: azParallax linear both; animation-timeline: scroll(root); }
        }
      `}</style>

      {/* ── Parallax watercolor background (fixed, rises subtly on scroll via CSS) ── */}
      <div className="az-parallax pointer-events-none fixed inset-0 z-0" aria-hidden style={{ transform: 'scale(1.12)' }}>
        <WatercolorBg />
      </div>

      {/* ── Fixed corner orchid frame ── */}
      <div className="pointer-events-none fixed inset-0 z-[1]" aria-hidden>
        <OrchidCluster className="absolute -top-8 -left-8 w-[44vw] max-w-[340px] min-w-[190px] opacity-90" />
        <OrchidCluster className="absolute -bottom-8 -right-8 w-[44vw] max-w-[340px] min-w-[190px] opacity-90" style={{ transform: 'scaleX(-1) scaleY(-1)' }} />
        <OrchidCluster className="absolute -bottom-10 -left-10 w-[30vw] max-w-[230px] min-w-[140px] opacity-65" style={{ transform: 'scaleY(-1)' }} />
        <OrchidCluster className="absolute -top-10 -right-10 w-[30vw] max-w-[230px] min-w-[140px] opacity-55" style={{ transform: 'scaleX(-1)' }} />
      </div>

      <Particles color="#3a5a82" tip="#9aa9d6" count={6} />

      {data.musicUrl && <audio ref={audioRef} src={data.musicUrl} loop />}

      {/* ── Music toggle ── */}
      <button onClick={toggleMusic} className="fixed bottom-5 right-5 z-50 w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
        style={{ background: C.navy, color: '#fff' }} aria-label="Música">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ animation: playing ? 'spin 4s linear infinite' : 'none' }}>
          <path d="M9 17a3 3 0 11-2-2.83V5l11-2v10.17A3 3 0 1116 14V7L9 8.4V17z" />
        </svg>
      </button>

      {/* ════════ COVER ════════ */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div style={{ animation: 'azFadeUp 1.2s ease' }} className="flex flex-col items-center">
          <Monogram a={data.initials[0]} b={data.initials[1]} size={160} />
          <h1 className="font-cinzel mt-5 tracking-[0.14em]" style={{ color: C.navy, fontSize: 'clamp(26px,5vw,46px)' }}>
            {data.groom} <span style={{ color: C.soft }}>&amp;</span> {data.bride}
          </h1>
          <p className="font-cinzel mt-2 tracking-[0.4em] text-[11px] sm:text-sm" style={{ color: C.soft }}>
            {data.month.toUpperCase()} {data.day} · {data.year}
          </p>
          <div className="mt-8 flex flex-col items-center gap-5">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.soft} strokeWidth="1.5" style={{ animation: 'azBounce 1.8s ease-in-out infinite' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
            </svg>
            <OutlineBtn onClick={enter}>Ingresar a mi invitación</OutlineBtn>
          </div>
        </div>
      </section>

      {/* ════════ INTRO (script names in orchid wreath) ════════ */}
      <section id="az-intro" className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <Reveal>
          <CircleWreath groom={data.groom} bride={data.bride} size={300} />
        </Reveal>
        <Reveal delay={150}>
          <p className="font-cormorant mt-10 max-w-xl mx-auto" style={{ color: C.ink, fontSize: '19px', lineHeight: 1.7 }}>
            {data.introMessage}
          </p>
        </Reveal>
      </section>

      {/* ════════ WELCOME + COUNTDOWN ════════ */}
      <section id="az-welcome" className="relative z-10 pt-16 pb-20 px-6 text-center">
        <Reveal>
          <CapsTitle className="text-[15px] sm:text-[19px] max-w-2xl mx-auto leading-relaxed">
            {data.welcomeTitle}
          </CapsTitle>
        </Reveal>

        <Reveal delay={120} className="mt-12 flex flex-col items-center">
          <Monogram a={data.initials[0]} b={data.initials[1]} size={130} />
          <p className="font-cinzel mt-3 tracking-[0.12em]" style={{ color: C.navy, fontSize: 'clamp(20px,4vw,30px)' }}>
            {data.groom} <span style={{ color: C.soft }}>&amp;</span> {data.bride}
          </p>
        </Reveal>

        {/* Date — circular badge with SÁBADO ── JULIO */}
        <Reveal delay={180} className="mt-10 flex items-center justify-center max-w-xl mx-auto">
          <div className="flex-1 flex items-center justify-end gap-3 min-w-0">
            <span className="font-cinzel tracking-[0.2em] text-[11px] sm:text-base whitespace-nowrap" style={{ color: C.soft }}>{data.weekday}</span>
            <div className="h-px flex-1 max-w-[70px]" style={{ background: C.line }} />
          </div>
          <div className="relative z-10 -mx-3 sm:-mx-4 w-28 h-28 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center flex-shrink-0" style={{ border: `1px solid ${C.line}`, background: C.bg }}>
            <span className="font-cinzel tracking-[0.16em] text-[8px] sm:text-[10px]" style={{ color: C.soft }}>{data.city.toUpperCase()}</span>
            <span className="font-playfair font-bold leading-none" style={{ color: C.navy, fontSize: 'clamp(40px,9vw,58px)' }}>{data.day}</span>
            <span className="font-cinzel tracking-[0.14em] text-[9px] sm:text-[11px] mt-0.5" style={{ color: C.soft }}>{data.year}</span>
          </div>
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <div className="h-px flex-1 max-w-[70px]" style={{ background: C.line }} />
            <span className="font-cinzel tracking-[0.2em] text-[11px] sm:text-base whitespace-nowrap" style={{ color: C.soft }}>{data.month}</span>
          </div>
        </Reveal>

        {/* Solo faltan + wide countdown */}
        <Reveal delay={240} className="mt-12">
          <p className="font-cormorant italic mb-5" style={{ color: C.soft, fontSize: '17px' }}>Solo faltan</p>
          <div className="flex items-baseline justify-between max-w-md sm:max-w-xl mx-auto px-1">
            {[[days, 'Días'], [hours, 'Horas'], [mins, 'Min.'], [secs, 'Seg.']].map(([n, l]) => (
              <div key={l as string} className="flex items-baseline gap-0.5">
                <span className="font-playfair font-bold leading-none" style={{ color: C.navy, fontSize: 'clamp(26px,6vw,40px)' }}>
                  {String(n).padStart(2, '0')}
                </span>
                <span className="font-cormorant" style={{ color: C.soft, fontSize: '12px' }}>{l}</span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Blessing + parents */}
        <Reveal delay={120} className="mt-16">
          <OrchidSprig color={C.navy} className="w-24 mx-auto mb-6 opacity-70" />
          <CapsTitle className="text-[12px] sm:text-[15px]">{data.blessing}</CapsTitle>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto font-cormorant" style={{ color: C.ink, fontSize: '17px' }}>
            <div>{data.parentsGroom.map((p) => <p key={p}>{p}</p>)}</div>
            <div>{data.parentsBride.map((p) => <p key={p}>{p}</p>)}</div>
          </div>
        </Reveal>
      </section>

      {/* ════════ CEREMONY + RECEPTION ════════ */}
      <section className="relative z-10 py-10 px-6">
        <OrchidSprig color={C.navy} className="w-24 mx-auto mb-12 opacity-70" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 max-w-3xl mx-auto">
          {[
            { icon: 'church', title: 'Ceremonia Religiosa', d: data.ceremony },
            { icon: 'cheers', title: 'Recepción Social', d: data.reception },
          ].map((b, i) => (
            <Reveal key={b.title} delay={i * 120} className="flex flex-col items-center text-center">
              <EventIcon name={b.icon} className="w-12 h-12 mb-3" stroke={C.navy} />
              <CapsTitle className="text-[13px] sm:text-[15px]">{b.title}</CapsTitle>
              <div className="mt-3 flex items-stretch justify-center gap-3">
                <p className="font-playfair font-bold" style={{ color: C.navy, fontSize: 'clamp(26px,5vw,34px)' }}>{b.d.time}</p>
                <div className="text-left font-cormorant flex flex-col justify-center" style={{ color: C.soft, fontSize: '14px', borderLeft: `1px solid ${C.line}`, paddingLeft: '12px', maxWidth: 150 }}>
                  <p>{b.d.place}</p>
                  {b.d.address && <p>{b.d.address}</p>}
                </div>
              </div>
              <div className="mt-5"><OutlineBtn href={b.d.mapsUrl}>Ver ubicación</OutlineBtn></div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ════════ DRESS CODE ════════ */}
      <section className="relative z-10 py-16 px-6 text-center">
        <Reveal className="flex flex-col items-center">
          <EventIcon name="dress" className="w-12 h-12 mb-3" stroke={C.navy} />
          <CapsTitle className="text-[14px] sm:text-[16px]">Dress Code</CapsTitle>
          <div className="mt-3 font-cormorant" style={{ color: C.ink, fontSize: '17px' }}>
            <p><span className="font-semibold">Hombres:</span> <span style={{ color: C.soft }}>{data.dressCode.men}</span></p>
            <p><span className="font-semibold">Damas:</span> <span style={{ color: C.soft }}>{data.dressCode.women}</span></p>
          </div>
        </Reveal>
      </section>

      {/* ════════ ITINERARIO ════════ */}
      <section className="relative z-10 py-8 px-6 text-center">
        <OrchidSprig color={C.navy} className="w-24 mx-auto mb-4 opacity-70" />
        <Reveal>
          <h2 className="font-great" style={{ color: C.navy, fontSize: 'clamp(34px,6vw,52px)' }}>Itinerario</h2>
        </Reveal>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-4 max-w-3xl mx-auto">
          {data.itinerary.map((it, i) => (
            <Reveal key={it.label} delay={i * 120} className="flex flex-col items-center">
              <EventIcon name={it.icon} className="w-10 h-10 mb-3" stroke={C.navy} />
              <div className="w-full h-px my-2" style={{ background: C.line }} />
              <p className="font-cormorant" style={{ color: C.soft, fontSize: '16px' }}>{it.label}</p>
              <p className="font-cinzel tracking-[0.1em] mt-1" style={{ color: C.navy, fontSize: '18px' }}>{it.time}</p>
            </Reveal>
          ))}
        </div>
        <OrchidSprig color={C.navy} className="w-24 mx-auto mt-10 opacity-70" />
      </section>

      {/* ════════ GIFT (navy) ════════ */}
      <section className="relative z-10 mt-6 pb-20 px-6 text-center" style={{ background: C.navy, color: '#fff', clipPath: 'polygon(0 0, 50% 26px, 100% 0, 100% 100%, 0 100%)', paddingTop: '70px' }}>
        <Reveal>
          <h2 className="font-great" style={{ color: '#fff', fontSize: 'clamp(34px,6vw,52px)' }}>Sugerencia de Regalo</h2>
          <p className="font-cormorant mt-4 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '17px' }}>{data.gift.message}</p>
        </Reveal>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
          <Reveal className="rounded-2xl p-6 text-center" style={{ border: '1px solid rgba(255,255,255,0.3)' }}>
            <p className="font-cinzel tracking-[0.16em] text-[13px]" style={{ color: 'rgba(255,255,255,0.85)' }}>Transferencia Bancaria</p>
            <p className="font-cinzel font-bold mt-3 tracking-wide">{data.gift.bank.bank}</p>
            <p className="font-cormorant mt-2 text-[15px]">{data.gift.bank.account} <CopyBtn value={data.gift.bank.account} color="#fff" /></p>
            {data.gift.bank.ci && <p className="font-cormorant text-[15px]"><span className="font-semibold">CC:</span> {data.gift.bank.ci} <CopyBtn value={data.gift.bank.ci} color="#fff" /></p>}
            <p className="font-cinzel text-[12px] tracking-widest mt-2">{data.gift.bank.holder}</p>
          </Reveal>
          {data.gift.qrUrl && (
            <Reveal delay={120} className="rounded-2xl p-6 flex flex-col items-center justify-center" style={{ border: '1px solid rgba(255,255,255,0.3)' }}>
              <p className="font-cinzel tracking-[0.16em] text-[13px] mb-3" style={{ color: 'rgba(255,255,255,0.85)' }}>Transferencia QR</p>
              <img src={data.gift.qrUrl} alt="QR" className="w-40 h-40 rounded-lg bg-white p-1" />
            </Reveal>
          )}
        </div>
      </section>

      {/* ════════ GALLERY ════════ */}
      <section className="relative z-10 py-20 px-6 text-center">
        <Reveal className="flex flex-col items-center">
          <EventIcon name="camera" className="w-12 h-12 mb-4" stroke={C.navy} />
          <p className="font-cormorant max-w-md mx-auto" style={{ color: C.soft, fontSize: '16px' }}>{data.gallery.message}</p>
          <div className="mt-5"><OutlineBtn href={data.gallery.shareUrl}>Compartir fotografías</OutlineBtn></div>
        </Reveal>
        <OrchidSprig color={C.navy} className="w-24 mx-auto my-12 opacity-70" />
        <Reveal className="flex flex-col items-center">
          <CapsTitle className="text-[13px] sm:text-[15px] max-w-md mx-auto leading-relaxed">{data.rsvp.message}</CapsTitle>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.soft} strokeWidth="1.5" className="my-4" style={{ animation: 'azBounce 1.8s ease-in-out infinite' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
          <OutlineBtn href={data.rsvp.whatsappUrl}>Confirmar asistencia</OutlineBtn>
        </Reveal>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="relative z-10 py-8 text-center" style={{ background: C.navyDeep }}>
        <p className="font-great text-2xl" style={{ color: '#fff' }}>Enkarta</p>
        <p className="font-cormorant text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
          ¿Deseas una invitación para tu evento? <span className="font-semibold">Contáctanos</span>
        </p>
      </footer>
    </div>
  );
}
