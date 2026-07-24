'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, MotionConfig, useMotionValue, useSpring, useInView, useScroll, useTransform, useReducedMotion } from 'framer-motion';

// ── Scroll reveal (entrada elegante al hacer scroll) ─────────────────────────
function Reveal({ children, delay = 0, y = 32, className = '' }: {
  children: React.ReactNode; delay?: number; y?: number; className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Tilt 3D (perspectiva que sigue al cursor) ────────────────────────────────
function Tilt3D({ children, max = 9, scale = 1.015, className = '' }: {
  children: React.ReactNode; max?: number; scale?: number; className?: string;
}) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 160, damping: 20 });
  const sry = useSpring(ry, { stiffness: 160, damping: 20 });
  const [hover, setHover] = useState(false);
  const reduced = useReducedMotion();

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * max * 2);
    rx.set(-py * max * 2);
  };
  const onLeave = () => { rx.set(0); ry.set(0); setHover(false); };

  return (
    <div className={className} style={{ perspective: '1400px' }} onMouseMove={onMove} onMouseEnter={() => setHover(true)} onMouseLeave={onLeave}>
      <motion.div
        style={{ rotateX: srx, rotateY: sry, transformStyle: 'preserve-3d' }}
        animate={{ scale: hover ? scale : 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ── Contador animado (stats del hero) ────────────────────────────────────────
function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const dur = 1400;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);
  return <span ref={ref}>{n}{suffix}</span>;
}

// ── Partículas doradas flotantes (hero) ──────────────────────────────────────
function GoldParticles({ count = 14 }: { count?: number }) {
  const reduced = useReducedMotion();
  // posiciones deterministas (evita mismatch de hidratación)
  const parts = Array.from({ length: count }, (_, i) => {
    const seed = (i * 137.508) % 100;
    return {
      left: `${(seed * 0.97 + 2) % 96}%`,
      top: `${(i * 61.8 + 8) % 88}%`,
      size: 2 + (i % 3) * 1.5,
      dur: 7 + (i % 5) * 2.2,
      delay: (i % 7) * 0.9,
    };
  });
  if (reduced) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {parts.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size, background: 'radial-gradient(circle, rgba(224,192,116,0.9) 0%, rgba(184,151,90,0.25) 70%, transparent 100%)', boxShadow: '0 0 6px rgba(212,178,106,0.55)' }}
          animate={{ y: [0, -26, 0], x: [0, i % 2 === 0 ? 10 : -10, 0], opacity: [0.15, 0.75, 0.15] }}
          transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ── Mariposas doradas (adorno vivo del hero y secciones) ─────────────────────
// Alas que aletean (scaleX hacia el eje del cuerpo, CSS puro) montadas sobre
// vuelos largos en curvas (framer-motion). Rutas que entran y salen de pantalla
// para que el loop reinicie sin saltos visibles. pointer-events-none siempre.
const FLAP_CSS = `
.ek-wing { animation: ekFlap .58s ease-in-out infinite alternate; }
@keyframes ekFlap { from { transform: scaleX(1); } to { transform: scaleX(0.3); } }
`;

function ButterflySvg({ size = 26, tone = '#c9a35f', idx }: { size?: number; tone?: string; idx: string }) {
  const g = `ekbw-${idx}`;
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 40 32" fill="none" aria-hidden
      style={{ overflow: 'visible', filter: 'drop-shadow(0 3px 4px rgba(90,78,52,0.22))' }}>
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0dcab" />
          <stop offset="55%" stopColor={tone} />
          <stop offset="100%" stopColor="#8B7D5F" />
        </linearGradient>
      </defs>
      {/* ala izquierda (lóbulo superior + inferior) */}
      <g className="ek-wing" style={{ transformOrigin: '20px 16px' }}>
        <path d="M20 15 C 12 2, 1 2, 1.6 9 C 2 14, 10 16.5, 20 16 Z" fill={`url(#${g})`} opacity="0.92" />
        <path d="M20 17 C 11 27, 2.5 26, 4 20.5 C 5 17, 12 16.5, 20 17 Z" fill={`url(#${g})`} opacity="0.72" />
      </g>
      {/* ala derecha */}
      <g className="ek-wing" style={{ transformOrigin: '20px 16px' }}>
        <path d="M20 15 C 28 2, 39 2, 38.4 9 C 38 14, 30 16.5, 20 16 Z" fill={`url(#${g})`} opacity="0.92" />
        <path d="M20 17 C 29 27, 37.5 26, 36 20.5 C 35 17, 28 16.5, 20 17 Z" fill={`url(#${g})`} opacity="0.72" />
      </g>
      {/* cuerpo + antenas */}
      <ellipse cx="20" cy="16" rx="1.4" ry="6.2" fill="#6f6046" />
      <path d="M19 10.5 C 17.5 7.5, 15.8 6.2, 14.4 5.8 M21 10.5 C 22.5 7.5, 24.2 6.2, 25.6 5.8"
        stroke="#6f6046" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

interface Flight {
  size: number; tone: string; delay: number; dur: number; op: number;
  x: string[]; y: number[]; r: number[];
}

function Butterflies({ zone = 'hero' }: { zone?: 'hero' | 'section' }) {
  const reduced = useReducedMotion();
  if (reduced) return null;
  const flights: Flight[] =
    zone === 'hero'
      ? [
          { size: 30, tone: '#c9a35f', delay: 0,  dur: 26, op: 0.85, x: ['-6vw', '18vw', '42vw', '68vw', '106vw'],  y: [210, 90, 200, 60, 150],   r: [14, -8, 10, -14, 8] },
          { size: 20, tone: '#b98a86', delay: 5,  dur: 31, op: 0.7,  x: ['104vw', '76vw', '50vw', '22vw', '-8vw'],  y: [120, 230, 100, 260, 170], r: [-12, 10, -8, 12, -10] },
          { size: 16, tone: '#c9a35f', delay: 11, dur: 35, op: 0.6,  x: ['-5vw', '30vw', '60vw', '85vw', '108vw'],  y: [430, 330, 440, 300, 390], r: [10, -12, 8, -8, 12] },
          { size: 24, tone: '#8B7D5F', delay: 16, dur: 29, op: 0.72, x: ['108vw', '70vw', '44vw', '16vw', '-8vw'],  y: [530, 430, 545, 420, 490], r: [-10, 12, -14, 8, -12] },
        ]
      : [
          { size: 20, tone: '#c9a35f', delay: 2,  dur: 34, op: 0.5,  x: ['-6vw', '28vw', '58vw', '84vw', '106vw'],  y: [140, 60, 150, 50, 110],   r: [12, -8, 10, -10, 8] },
          { size: 14, tone: '#b98a86', delay: 14, dur: 38, op: 0.42, x: ['105vw', '72vw', '46vw', '20vw', '-7vw'],  y: [230, 320, 210, 330, 260], r: [-10, 8, -12, 8, -8] },
        ];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      <style>{FLAP_CSS}</style>
      {flights.map((f, i) => (
        <motion.div
          key={i}
          className="absolute left-0 top-0"
          style={{ opacity: f.op }}
          initial={{ x: f.x[0], y: f.y[0], rotate: f.r[0] }}
          animate={{ x: f.x, y: f.y, rotate: f.r }}
          transition={{ duration: f.dur, delay: f.delay, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
        >
          <ButterflySvg size={f.size} tone={f.tone} idx={`${zone}-${i}`} />
        </motion.div>
      ))}
    </div>
  );
}

// ── Phone frame (dark — hero section) ───────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PhoneFrame({ bg, accent: _accent, textColor, children, className = '' }: {
  bg: string; accent: string; textColor: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`relative select-none ${className}`}>
      <div className="relative overflow-hidden shadow-2xl" style={{ borderRadius: '2.8rem', border: '8px solid #1a1a1a', backgroundColor: '#1a1a1a' }}>
        <div className="flex items-center justify-between px-5 pt-2.5 pb-1 text-[10px]" style={{ backgroundColor: bg, color: textColor }}>
          <span className="font-medium opacity-70">9:41</span>
          <div className="w-14 h-[14px] bg-[#1a1a1a] rounded-full" />
          <div className="flex items-center gap-1 opacity-70">
            <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor">
              <rect x="0" y="3" width="2" height="7" rx="0.5" opacity="0.4"/><rect x="3" y="2" width="2" height="8" rx="0.5" opacity="0.6"/>
              <rect x="6" y="0" width="2" height="10" rx="0.5"/><rect x="9" y="0" width="4" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1"/>
              <rect x="13" y="2" width="1" height="3" rx="0.5"/>
            </svg>
          </div>
        </div>
        <div className="overflow-hidden" style={{ backgroundColor: bg }}>{children}</div>
        <div className="flex justify-center py-2" style={{ backgroundColor: bg }}>
          <div className="w-20 h-[4px] rounded-full" style={{ backgroundColor: textColor, opacity: 0.18 }} />
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: '2.8rem', background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)' }} />
      <div className="absolute -left-[10px] top-[80px] w-[6px] h-8 bg-[#1a1a1a] rounded-l-sm" />
      <div className="absolute -left-[10px] top-[124px] w-[6px] h-8 bg-[#1a1a1a] rounded-l-sm" />
      <div className="absolute -right-[10px] top-[100px] w-[6px] h-10 bg-[#1a1a1a] rounded-r-sm" />
    </div>
  );
}

// ── White phone frame (catalog cards) ───────────────────────────────────────
function CatalogPhone({ bg, textColor = '#333', children, className = '' }: {
  bg: string; textColor?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`relative select-none ${className}`}>
      <div className="relative overflow-hidden" style={{ borderRadius: '1.9rem', border: '8px solid #e0e0e0', backgroundColor: '#e0e0e0', boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
        <div className="flex items-center justify-between px-4 pt-2 pb-1 text-[8px]" style={{ backgroundColor: bg, color: textColor }}>
          <span className="opacity-55 font-medium">9:41</span>
          <div className="w-11 h-[11px] rounded-full bg-black/80" />
          <div className="flex gap-[2px] opacity-50">
            <svg width="11" height="7" viewBox="0 0 11 7" fill="currentColor">
              <rect x="0" y="3" width="2" height="4" rx="0.4" opacity="0.4"/><rect x="3" y="1.5" width="2" height="5.5" rx="0.4" opacity="0.7"/>
              <rect x="6" y="0" width="2" height="7" rx="0.4"/><rect x="9" y="0.5" width="2" height="4.5" rx="0.7" fill="none" stroke="currentColor" strokeWidth="0.8"/>
            </svg>
          </div>
        </div>
        <div className="overflow-hidden" style={{ backgroundColor: bg }}>{children}</div>
        <div className="flex justify-center py-1.5" style={{ backgroundColor: bg }}>
          <div className="w-14 h-[3px] rounded-full" style={{ backgroundColor: textColor === '#ffffff' || textColor === 'white' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.18)' }} />
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: '1.9rem', background: 'linear-gradient(145deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.05) 35%, transparent 55%)' }} />
      <div className="absolute -right-[8px] top-[88px] w-[5px] h-9 rounded-r-md" style={{ backgroundColor: '#cecece' }} />
      <div className="absolute -left-[8px] top-[72px] w-[5px] h-7 rounded-l-md" style={{ backgroundColor: '#cecece' }} />
      <div className="absolute -left-[8px] top-[108px] w-[5px] h-7 rounded-l-md" style={{ backgroundColor: '#cecece' }} />
    </div>
  );
}

// ── Cover screen (photo full-bleed, no monogram) ─────────────────────────────
function CoverScreen({ t }: { t: (typeof templates)[0] }) {
  return (
    <div className="relative overflow-hidden" style={{ minHeight: '230px' }}>
      {t.img ? (
        <Image src={t.img} alt={t.name} fill className="object-cover" style={{ objectPosition: 'center 15%' }} sizes="(max-width: 1024px) 30vw, 180px" draggable={false} />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(175deg, ${t.coverEnd} 0%, ${t.coverStart} 55%, rgba(0,0,0,0.55) 100%)` }} />
      )}
      {/* Subtle bottom vignette only — no circle blocking faces */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: '45%', background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }} />
      {/* Names at bottom */}
      <div className="absolute bottom-3 left-0 right-0 text-center px-3">
        <p className="font-great text-white leading-tight drop-shadow-lg" style={{ fontSize: '15px' }}>{t.n1}</p>
        <p className="font-outfit text-white/60 text-[6px] my-px drop-shadow-md">&</p>
        <p className="font-great text-white leading-tight drop-shadow-lg" style={{ fontSize: '15px' }}>{t.n2}</p>
      </div>
    </div>
  );
}

// ── Detail screen (invitation design — enriched) ──────────────────────────────
function DetailScreen({ t }: { t: (typeof templates)[0] }) {
  const hex = t.coverStart.replace('#', '');
  const lum = parseInt(hex.substring(0,2),16)*0.299 + parseInt(hex.substring(2,4),16)*0.587 + parseInt(hex.substring(4,6),16)*0.114;
  const headerText = lum > 120 ? t.text : '#ffffff';

  return (
    <div className="overflow-hidden" style={{ backgroundColor: t.bg, minHeight: '290px' }}>

      {/* Gradient header with couple names */}
      <div className="relative text-center" style={{
        background: `linear-gradient(175deg, ${t.coverStart} 0%, ${t.coverStart}cc 62%, ${t.bg} 100%)`,
        padding: '10px 8px 18px',
      }}>
        {t.floral ? (
          <svg viewBox="0 0 100 18" className="w-full opacity-25 mb-0.5" fill="none">
            <ellipse cx="50" cy="2" rx="1" ry="5" fill={headerText} />
            <ellipse cx="40" cy="8" rx="7" ry="2.5" fill={headerText} transform="rotate(-35 40 8)" opacity="0.7" />
            <ellipse cx="60" cy="8" rx="7" ry="2.5" fill={headerText} transform="rotate(35 60 8)" opacity="0.7" />
          </svg>
        ) : (
          <div className="flex justify-center items-center gap-1 opacity-25 mb-1">
            <div className="h-px w-8" style={{ backgroundColor: headerText }} />
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: t.accent }} />
            <div className="h-px w-8" style={{ backgroundColor: headerText }} />
          </div>
        )}
        <p className="font-outfit" style={{ fontSize: '5px', textTransform: 'uppercase', letterSpacing: '0.22em', color: `${headerText}80`, marginBottom: '1px' }}>Boda · 2025</p>
        <p className="font-great leading-tight" style={{ fontSize: '16px', color: headerText }}>{t.n1}</p>
        <p className="font-outfit" style={{ fontSize: '7px', color: t.accent }}>&</p>
        <p className="font-great leading-tight" style={{ fontSize: '16px', color: headerText }}>{t.n2}</p>
      </div>

      <div className="px-2 pt-1.5 pb-2">
        {/* Date + Countdown side by side */}
        <div className="flex items-start gap-1.5 mb-1.5">
          <div className="text-center px-2 py-1 rounded-lg" style={{ backgroundColor: t.card, border: `1px solid ${t.accent}25`, flexShrink: 0 }}>
            <p className="font-outfit leading-none" style={{ fontSize: '4.5px', color: t.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sáb</p>
            <p className="font-playfair font-bold leading-none" style={{ fontSize: '17px', color: t.text }}>14</p>
            <p className="font-outfit leading-none" style={{ fontSize: '4.5px', color: t.text, opacity: 0.6 }}>Jun 2025</p>
          </div>
          <div className="flex flex-col gap-0.5 flex-1">
            {[['02','días'],['14','hrs'],['32','min']].map(([n, l]) => (
              <div key={l} className="flex items-center justify-between px-1.5 py-0.5 rounded" style={{ backgroundColor: t.accent + '18' }}>
                <span className="font-playfair font-bold" style={{ fontSize: '9px', color: t.text }}>{n}</span>
                <span className="font-outfit" style={{ fontSize: '4px', color: t.text, opacity: 0.55 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ceremony + Reception cards */}
        <div className="flex gap-1 mb-1.5">
          {[['Ceremonia','5:00 PM'],['Recepción','8:00 PM']].map(([label,time]) => (
            <div key={label} className="flex-1 text-center rounded-lg py-1.5" style={{ backgroundColor: t.card, border: `1px solid ${t.accent}20` }}>
              <p className="font-outfit" style={{ fontSize: '4px', color: t.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
              <p className="font-playfair font-bold" style={{ fontSize: '9px', color: t.text }}>{time}</p>
            </div>
          ))}
        </div>

        {/* Feature chips */}
        <div className="flex items-center gap-1 mb-1.5 flex-wrap">
          {['Formal','♪ Música','Maps'].map(chip => (
            <div key={chip} className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${t.accent}14`, border: `1px solid ${t.accent}22` }}>
              <span className="font-outfit" style={{ fontSize: '4px', color: t.accent }}>{chip}</span>
            </div>
          ))}
        </div>

        {/* RSVP */}
        <div className="py-1 rounded-lg flex items-center justify-center" style={{ backgroundColor: t.accent }}>
          <p className="font-outfit font-semibold text-white" style={{ fontSize: '6px' }}>Confirmar asistencia ✓</p>
        </div>
      </div>
    </div>
  );
}

// ── Dual phone card — photo FRONT, invitation BACK ────────────────────────────
function DualPhoneCard({ t }: { t: (typeof templates)[0] }) {
  const detailTextColor = t.text.startsWith('#') && parseInt(t.text.replace('#',''), 16) < 0x888888 ? t.text : '#333';
  return (
    <div className="flex flex-col items-center transition-all duration-500 group-hover:-translate-y-2">
      <div className="relative w-full" style={{ height: '350px' }}>

        {/* BACK phone — invitation design, tilted right, dimmed */}
        <div className="transition-transform duration-500 group-hover:rotate-[12deg]" style={{ position: 'absolute', right: '-2%', top: '20px', width: '57%', transformOrigin: 'top center', transform: 'rotate(9deg)', zIndex: 1, filter: 'brightness(0.92) saturate(0.95) drop-shadow(0 14px 26px rgba(90,78,52,0.18))' }}>
          <CatalogPhone bg={t.bg} textColor={detailTextColor} className="w-full">
            <DetailScreen t={t} />
          </CatalogPhone>
        </div>

        {/* FRONT phone — couple photo, tilted left, in full focus */}
        <div className="transition-transform duration-500 group-hover:rotate-[-13deg]" style={{ position: 'absolute', left: '-2%', top: '8px', width: '57%', transformOrigin: 'top center', transform: 'rotate(-10deg)', zIndex: 2, filter: 'drop-shadow(0 22px 38px rgba(90,78,52,0.30))' }}>
          <CatalogPhone bg={t.coverStart} textColor="#ffffff" className="w-full">
            <CoverScreen t={t} />
          </CatalogPhone>
        </div>
      </div>

      {/* Name only — Playfair serif, warm gold */}
      <p className="font-playfair font-semibold text-xl sm:text-2xl mt-5 transition-colors duration-300" style={{ color: '#8B7D5F' }}>{t.name}</p>
    </div>
  );
}

// ── Tablet carousel (hero) ───────────────────────────────────────────────────
function TabletCarousel() {
  const [current, setCurrent] = useState(0);
  const slides = [
    { img: '/catalog/azure.jpg',     n1: 'Laura',   n2: 'Kevin',    date: '15 · Nov · 2025' },
    { img: '/catalog/primicia.jpg',  n1: 'Jhoana',  n2: 'Nikol',    date: '22 · Oct · 2025' },
    { img: '/catalog/passport.jpg',  n1: 'Robert',  n2: 'Isabella', date: '08 · Abr · 2025' },
    { img: '/catalog/paradise.jpg',  n1: 'Laura',   n2: 'Elvis',    date: '30 · May · 2025' },
    { img: '/catalog/obsidiana.jpg', n1: 'Karlene', n2: 'María',    date: '30 · Ene · 2026' },
    { img: '/catalog/grazia.jpg',    n1: 'Lorenzo', n2: 'Isabella', date: '19 · Jul · 2025' },
    { img: '/catalog/carmesi.jpg',   n1: 'José',    n2: 'María',    date: '11 · Ago · 2025' },
    { img: '/catalog/perla.jpg',     n1: 'Camila',  n2: 'Alejandro',date: '14 · Jun · 2025' },
  ];

  useEffect(() => {
    const t = setInterval(() => setCurrent(p => (p + 1) % slides.length), 3800);
    return () => clearInterval(t);
  }, [slides.length]);

  const s = slides[current];

  return (
    <div className="relative" style={{ width: '100%', maxWidth: '620px', aspectRatio: '620/420' }}>
      {/* iPad frame */}
      <div className="absolute inset-0" style={{ borderRadius: '2.8rem', background: 'linear-gradient(145deg, #2e2e2e 0%, #1a1a1a 100%)', boxShadow: '0 50px 90px rgba(90,78,52,0.28), 0 20px 40px rgba(139,125,95,0.18), 0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.12)' }}>
        {/* Camera */}
        <div className="absolute left-5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full" style={{ background: '#222', boxShadow: 'inset 0 0 4px rgba(0,0,0,0.8), 0 0 0 1px #333' }} />
        {/* Screen */}
        <div className="absolute overflow-hidden" style={{ top: '16px', left: '36px', right: '16px', bottom: '16px', borderRadius: '1.8rem' }}>
          {/* Photos carousel */}
          {slides.map((sl, i) => (
            <Image key={i} src={sl.img} alt="" fill priority={i === 0} className="object-cover"
              sizes="(max-width: 768px) 80vw, 570px"
              style={{ opacity: i === current ? 1 : 0, transition: 'opacity 1.2s ease-in-out', objectPosition: 'center 15%' }} />
          ))}
          {/* Invitation panel — right side overlay */}
          <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-center items-center p-5"
            style={{ width: '36%', background: 'rgba(250,247,242,0.93)', backdropFilter: 'blur(16px)' }}>
            <p className="font-outfit text-[7px] uppercase tracking-[0.2em] text-[#B8975A] mb-1">Te invitamos</p>
            <p className="font-great text-[#5a6e5a] leading-tight" style={{ fontSize: '17px' }}>{s.n1}</p>
            <p className="font-outfit text-[9px] text-[#B8975A] my-0.5">&</p>
            <p className="font-great text-[#5a6e5a] leading-tight" style={{ fontSize: '17px' }}>{s.n2}</p>
            <div className="flex items-center gap-1 my-2 w-full" style={{ opacity: 0.2 }}>
              <div className="flex-1 h-px bg-[#B8975A]" /><div className="w-1 h-1 rounded-full bg-[#B8975A]" /><div className="flex-1 h-px bg-[#B8975A]" />
            </div>
            <div className="text-center px-2 py-1.5 rounded-lg w-full" style={{ border: '1px solid rgba(184,151,90,0.2)', background: 'rgba(240,235,226,0.9)' }}>
              <p className="font-outfit text-[6px] uppercase tracking-wide text-[#B8975A]">Fecha</p>
              <p className="font-playfair font-bold text-xl text-[#5a6e5a]">14</p>
              <p className="font-outfit text-[7px] text-[#5a6e5a]/70">Jun · 2025</p>
            </div>
            <div className="mt-2 w-full">
              <div className="py-1.5 rounded-lg text-center" style={{ background: '#B8975A' }}>
                <p className="font-outfit text-[7px] font-semibold text-white">Confirmar ✓</p>
              </div>
            </div>
          </div>
        </div>
        {/* Home bar */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-white/15" />
      </div>
      {/* Dots */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} className="rounded-full transition-all duration-400"
            style={{ width: i === current ? '22px' : '6px', height: '6px', background: i === current ? '#B8975A' : 'rgba(255,255,255,0.25)' }} />
        ))}
      </div>
    </div>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────
const templates = [
  { name: 'Azure',      tag: 'Clásico',   desc: 'Azul · Elegante & Clásico',    bg: '#f8fbff', card: '#deeaf8', text: '#1a3a5c', accent: '#3a7ab5', coverStart: '#1a3a5c', coverEnd: '#2e6da4',    n1: 'Laura',   n2: 'Kevin',     dateStr: '15 · Nov · 2025', floral: false, img: '/catalog/azure.jpg', demoPath: '/muestra/azure?m=Daniel%20Martinez&n=2%20pases' },
  { name: 'Primicia',   tag: 'Moderno',   desc: 'Oscuro · Drama & Oro',          bg: '#0e0e0e', card: '#1c1c1c', text: '#d4a030', accent: '#c89828', coverStart: '#1a0f02', coverEnd: '#3a2508',    n1: 'Jhoana',  n2: 'Nikol',     dateStr: '22 · Oct · 2025', floral: false, img: '/catalog/primicia.jpg', demoPath: '/muestra/primicia?m=Daniel%20Martinez&n=2%20pases' },
  { name: 'Passport',   tag: 'Viajero',   desc: 'Salvia · Aventura & Mapa',      bg: '#f5f3ed', card: '#e8e2d0', text: '#3a4a28', accent: '#6a8a45', coverStart: '#2a3a18', coverEnd: '#4a6a28',    n1: 'Robert',  n2: 'Isabella',  dateStr: '08 · Abr · 2025', floral: false, img: '/catalog/passport.jpg', demoPath: '/muestra/passport?m=Daniel%20Martinez&n=2%20pases' },
  { name: 'Paradise',   tag: 'Bohemio',   desc: 'Salvia · Boho & Natural',        bg: '#eceedd', card: '#dde2c8', text: '#3c4a2a', accent: '#5f6b47', coverStart: '#3c4a2a', coverEnd: '#5f6b47',    n1: 'Laura',   n2: 'Elvis',     dateStr: '30 · May · 2025', floral: true,  img: '/catalog/paradise.jpg', demoPath: '/muestra/paradise?m=Daniel%20Martinez&n=2%20pases' },
  { name: 'Obsidiana',  tag: 'Nocturno',  desc: 'Negro · Oro & Mármol',           bg: '#100f0c', card: '#1c1b14', text: '#ece6d6', accent: '#c6a86a', coverStart: '#100f0c', coverEnd: '#3a3d28',    n1: 'Karlene', n2: 'María',     dateStr: '30 · Ene · 2026', floral: false, img: '/catalog/obsidiana.jpg', demoPath: '/muestra/obsidiana?m=Daniel%20Martinez&n=2%20pases' },
  { name: 'Dolce Vita', tag: 'Romántico', desc: 'Marfil · Botánico & Script',     bg: '#fbfaf3', card: '#eef0dd', text: '#3b3b35', accent: '#4f7a52', coverStart: '#c2a368', coverEnd: '#e0d2a8',    n1: 'José',    n2: 'Nikol',     dateStr: '14 · Jun · 2025', floral: true,  img: '/catalog/dolcevita.jpg', demoPath: '/muestra/dolcevita?m=Daniel%20Martinez&n=2%20pases' },
  { name: 'Grazia',     tag: 'Minimal',   desc: 'Champagne · Fino & Chic',        bg: '#fdfcf8', card: '#f1e9d8', text: '#2c2c27', accent: '#bca478', coverStart: '#a8916a', coverEnd: '#d8c9a8',    n1: 'Lorenzo', n2: 'Isabella',  dateStr: '19 · Jul · 2025', floral: false, img: '/catalog/grazia.jpg', demoPath: '/muestra/grazia?m=Daniel%20Martinez&n=2%20pases' },
  { name: 'Carmesí',    tag: 'Dramático', desc: 'Vino · Rosas & Oro',             bg: '#f6efe3', card: '#f0e3cf', text: '#4a3733', accent: '#871a2f', coverStart: '#871a2f', coverEnd: '#6d1424',    n1: 'José',    n2: 'María',     dateStr: '11 · Ago · 2025', floral: true,  img: '/catalog/carmesi.jpg', demoPath: '/muestra/carmesi?m=Daniel%20Martinez&n=2%20pases' },
  { name: 'Napoly',     tag: 'Clásico',   desc: 'Taupe · Rosa empolvado',         bg: '#fbf8f3', card: '#f3e8e0', text: '#5a4d44', accent: '#b98a86', coverStart: '#6f6052', coverEnd: '#b98a86',    n1: 'Nestor',  n2: 'Sandra',    dateStr: '07 · Sep · 2026', floral: true,  img: '/catalog/perla.jpg', demoPath: '/muestra/napoly?m=Daniel%20Martinez&n=2%20pases' },
  { name: 'Euforia',    tag: 'Floral',    desc: 'Mocha · Cálido & Acuarela',      bg: '#f7f1e5', card: '#efe3cd', text: '#5d5040', accent: '#8a7257', coverStart: '#6b563f', coverEnd: '#a08458',    n1: 'Andrea',  n2: 'Marget',    dateStr: '03 · Sep · 2025', floral: true,  img: '/catalog/euforia.jpg', demoPath: '/muestra/euforia?m=Daniel%20Martinez&n=2%20pases' },
  { name: 'Rose Gold',  tag: 'Romántico', desc: 'Blush · Suave & Floral',         bg: '#fdf6f1', card: '#f8e3da', text: '#7a6157', accent: '#b97f86', coverStart: '#b97f86', coverEnd: '#d8a8a0',    n1: 'Lucía',   n2: 'Pablo',     dateStr: '28 · Sep · 2025', floral: true,  img: '/catalog/rosegold.jpg', demoPath: '/muestra/rosegold?m=Daniel%20Martinez&n=2%20pases' },
  { name: 'Allegria',   tag: 'Minimal',   desc: 'Salvia · Limpio & Fresco',       bg: '#fbfbf8', card: '#e9ede5', text: '#3a3a34', accent: '#8c9a86', coverStart: '#6f7d69', coverEnd: '#8c9a86',    n1: 'María',   n2: 'Vincent',   dateStr: '15 · Oct · 2025', floral: false, img: '/catalog/allegria.jpg', demoPath: '/muestra/allegria?m=Daniel%20Martinez&n=2%20pases' },
  { name: 'Provenza',   tag: 'Editorial', desc: 'Olivo · Jardín & Serenidad',       bg: '#fbf6ee', card: '#f7ebdf', text: '#544e39', accent: '#68693f', coverStart: '#68693f', coverEnd: '#7a7c57',    n1: 'Annie',   n2: 'Miguel',    dateStr: '19 · Sep · 2026', floral: true,  img: '', demoPath: '/muestra/provenza?m=Daniel%20Martinez&n=2%20pases' },
];

const features = [
  { title: 'Ubicación Maps',                desc: 'Botón directo a Google Maps incluido en cada invitación.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg> },
  { title: 'Cuenta Regresiva',              desc: 'Contador en tiempo real hasta el día del evento.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><circle cx="12" cy="12" r="9"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2"/></svg> },
  { title: 'Itinerario del Evento',         desc: 'Cronograma detallado de cada momento especial.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 5.25A.75.75 0 017.5 4.5h9a.75.75 0 01.75.75v14.25a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25z"/><path strokeLinecap="round" strokeLinejoin="round" d="M9 9h6M9 12h6M9 15h4"/></svg> },
  { title: 'Dress Code',                    desc: 'Código de vestimenta elegante para tus invitados.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5.25A2.25 2.25 0 003 5.25v13.5A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V5.25A2.25 2.25 0 0018.75 3H15M9 3v2.25a3 3 0 006 0V3M9 3h6"/></svg> },
  { title: 'Galería de Fotos',              desc: 'Álbum visual con las mejores imágenes de tu historia.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 12V6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V12z"/></svg> },
  { title: 'Confirmación RSVP',             desc: 'Sistema de confirmación inteligente en tiempo real.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
  { title: 'Música de Fondo',               desc: 'Melodía personalizada que ambienta tu invitación.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"/></svg> },
  { title: 'Sugerencia de Regalos',         desc: 'Información de cuenta bancaria y lista de deseos.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1014.5 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 109.5 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/></svg> },
  { title: 'Nombres de Invitados',          desc: 'Pase personalizado con el nombre de cada invitado.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg> },
  { title: 'Tickets & Pases',               desc: 'Control de acceso con número de pases por invitado.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"/></svg> },
  { title: 'Apertura tipo Sobre',           desc: 'Animación exclusiva de apertura de sobre al ingresar.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.981l7.5-4.039a2.25 2.25 0 012.134 0l7.5 4.039a2.25 2.25 0 011.183 1.98V19.5z"/></svg> },
  { title: 'QR de Acceso',                  desc: 'Código QR único para verificar asistencia al evento.',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"/><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"/></svg> },
];

const steps = [
  { num: '01', title: 'Elige tu modelo',    desc: 'Escoge la plantilla que más te guste de nuestro catálogo.' },
  { num: '02', title: 'Envíanos los datos', desc: 'Compártenos la información de tu evento por WhatsApp.' },
  { num: '03', title: 'Revisamos juntos',   desc: 'Te enviamos la invitación para que la apruebes.' },
  { num: '04', title: 'Lista para enviar',  desc: 'Recibe tu invitación personalizada para compartir.' },
];

// Comparison table — [ feature, description, exclusive, premium, plus ]
// Las celdas aceptan boolean (✓/✗) o texto corto ("90 días", "Planilla"…).
const comparisonRows: [string, string, boolean | string, boolean | string, boolean | string][] = [
  ['Confirmación de Asistencia', 'Exclusive incluye el Sistema Inteligente: gestiona quién confirma, rechaza o queda pendiente en tiempo real.', 'Sistema Inteligente', 'Planilla', 'WhatsApp'],
  ['Panel privado del Anfitrión', 'Tablero en tiempo real con tus invitados y sus confirmaciones.', true, false, false],
  ['Escáner QR de acceso al evento', '', true, false, false],
  ['Personalización de Color', '', true, true, false],
  ['Ubicación Maps', '', true, true, true],
  ['Cuenta Regresiva', '', true, true, true],
  ['Itinerario', '', true, true, true],
  ['Dress Code', '', true, true, true],
  ['Sugerencia de Regalos', '', true, true, true],
  ['Envíos Ilimitados', '', true, true, true],
  ['En línea después del evento', '', '90 días', '60 días', '30 días'],
  ['Música de fondo', '', true, true, true],
  ['Apertura tipo sobre', '', true, true, true],
  ['Nombres de los Invitados', '', true, true, false],
  ['Tickets / Pases', '', true, true, false],
  ['Número de mesa', '', true, false, false],
  ['Galería de fotos', '', '20 fotos', '8 fotos', false],
  ['Agendar evento (Google Calendar)', '', true, false, false],
  ['Sugerencia de Hospedaje', '', true, false, false],
  ['Botón para compartir fotos', '', true, false, false],
];

const additionalServices = [
  { name: 'Personalización Total',      bs: 1200, usd: 171, desc: '¿Tienen una idea clara o referencias que les encantan? Diseñamos su invitación web desde una hoja en blanco, asegurando que cada detalle, desde la tipografía hasta la disposición, sea un reflejo fiel de su evento soñado.' },
  { name: 'Entrega Express',             bs: 270,  usd: 39,  desc: 'Recibe tu invitación web completa en un plazo garantizado de 48 horas.' },
  { name: 'Versión Adicional de la Web', bs: 405,  usd: 58,  desc: 'Ideal para crear una versión en otro idioma, una invitación exclusiva «Sólo Recepción Social» o cualquier otra adaptación que necesites.' },
  { name: 'Menú de Navegación',          bs: 135,  usd: 19,  desc: 'Organiza tu invitación en secciones claras (ej: Inicio, Evento, Galería, RSVP) para que tus invitados encuentren fácilmente toda la información.' },
  { name: 'Save the date web',           bs: 270,  usd: 39,  desc: 'Un mini sitio exclusivo para anunciar la gran fecha. Incluye contador regresivo, formulario de pre-confirmación (RSVP) y botón para agendar en Google Calendar.' },
  { name: 'Dominio propio',              bs: 1200, usd: 171, desc: 'Tu invitación en una dirección web única y fácil de recordar (ej: www.nombrenovios.com). Incluye el registro del dominio y el hosting por un año.' },
  { name: 'Visibilidad Extendida',       bs: 270,  usd: 39,  desc: 'Mantén tu invitación web activa y en línea durante 3 meses adicionales.' },
  { name: 'Ajustes Post-Entrega',        bs: 90,   usd: 13,  desc: 'Cubre una solicitud de cambios menores (como textos, fechas o imágenes) realizados después de la aprobación y entrega final.' },
];

const testimonials = [
  { name: 'Valentina R.',  event: 'Boda · Plantilla Perla',     text: 'Quedé completamente enamorada de mi invitación. Todos mis invitados me preguntaron dónde la había hecho. ¡Super recomendado!', stars: 5, initial: 'V' },
  { name: 'Mariana S.',    event: 'XV Años · Plantilla Euforia', text: 'El proceso fue facilísimo y el resultado fue hermoso. La invitación de mis XV quedó mejor de lo que imaginé.',              stars: 5, initial: 'M' },
  { name: 'Lucía & Andrés',event: 'Boda · Plantilla Carmesí',   text: 'Elegimos Carmesí para nuestra boda y fue perfecta. Dramática, única y elegante. Nuestros invitados quedaron impresionados.',  stars: 5, initial: 'L' },
  { name: 'Carolina T.',   event: 'Boda · Plantilla Azure',      text: 'Rápidos, atentos y el diseño quedó hermoso. Me cambiaron detalles sin problema hasta que quedó perfecta.',                    stars: 5, initial: 'C' },
];

const faqs = [
  { q: '¿Cuánto tiempo tarda la entrega?',                   a: 'Tu invitación estará lista en 3-5 días hábiles según el paquete que elijas.' },
  { q: '¿Puedo personalizar los colores y el diseño?',       a: 'Sí, puedes ajustar los colores de la plantilla. También ofrecemos diseños totalmente personalizados (ver Servicios Adicionales).' },
  { q: '¿Cuáles son los métodos de pago?',                   a: 'Reservas con 200 Bs y el saldo se cancela cuando apruebes tu invitación terminada.' },
  { q: '¿Puedo realizar cambios después de la entrega?',     a: 'Sí. El paquete Exclusive incluye rondas ilimitadas. Para los demás, ofrecemos el servicio "Ajustes Post-Entrega".' },
  { q: '¿Cómo gestiono los pases de mis invitados?',         a: 'Cada invitado recibe su link personalizado con su nombre y número de pases. El paquete Exclusive incluye el sistema de confirmación inteligente.' },
];

// Número de contacto de la landing: se configura con NEXT_PUBLIC_WA_PHONE en
// .env.local (formato internacional sin +, p. ej. 59171234567).
const WA_PHONE = process.env.NEXT_PUBLIC_WA_PHONE || '0000000000';
const WA = `https://wa.me/${WA_PHONE}?text=Hola%20Enkarta%21%20Me%20gustaría%20reservar%20una%20invitación%20digital.`;

const smartConfirmationCards = [
  {
    title: 'Confirmaciones unicas',
    desc: 'Cada invitado recibe su acceso personal y responde una sola vez.',
    badge: 'RSVP',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-12 h-12">
        <path d="M10 22h44v26a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6V22Z" />
        <path d="m12 24 20 15 20-15" />
        <path d="M24 17h16" />
        <path d="M28 11h8" />
        <circle cx="46" cy="42" r="7" />
        <path d="m43.5 42 1.8 1.8 3.6-4" />
      </svg>
    ),
  },
  {
    title: 'Tickets y mesas',
    desc: 'Pases, cantidad de cupos y numero de mesa visibles desde el enlace personal.',
    badge: 'ACCESO',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-12 h-12">
        <path d="M13 22h38a4 4 0 0 1 4 4v6a5 5 0 0 0-5 5 5 5 0 0 0 5 5v6a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4v-6a5 5 0 0 0 5-5 5 5 0 0 0-5-5v-6a4 4 0 0 1 4-4Z" />
        <path d="M25 22v30" strokeDasharray="4 4" />
        <path d="M32 30h12" />
        <path d="M32 38h8" />
        <path d="M16 33h4" />
      </svg>
    ),
  },
  {
    title: 'QR personal',
    desc: 'Codigo listo para validar ingreso y evitar reenvios no autorizados.',
    badge: 'QR',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-12 h-12">
        <rect x="18" y="9" width="28" height="46" rx="5" />
        <rect x="25" y="18" width="4" height="4" />
        <rect x="33" y="18" width="4" height="4" />
        <rect x="25" y="26" width="4" height="4" />
        <rect x="33" y="26" width="4" height="4" />
        <rect x="29" y="34" width="4" height="4" />
        <circle cx="45" cy="42" r="8" />
        <path d="m42.4 42 1.8 1.8 3.8-4.2" />
      </svg>
    ),
  },
  {
    title: 'Panel en tiempo real',
    desc: 'Visualiza quien confirma, rechaza o queda pendiente en un mismo tablero.',
    badge: 'LIVE',
    icon: (
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-12 h-12">
        <rect x="10" y="12" width="44" height="40" rx="5" />
        <path d="M10 22h44" />
        <circle cx="17" cy="17" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="23" cy="17" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="29" cy="17" r="1.5" fill="currentColor" stroke="none" />
        <path d="M18 40c3-5 7-8 12-8s8 2 11 7 6 5 9 1" />
        <circle cx="20" cy="40" r="2.5" />
        <circle cx="32" cy="32" r="2.5" />
        <circle cx="42" cy="39" r="2.5" />
      </svg>
    ),
  },
];

// ── Check / X icons ───────────────────────────────────────────────────────────
function Check({ dark }: { dark?: boolean }) {
  return (
    <svg className="w-5 h-5 mx-auto" viewBox="0 0 20 20" fill={dark ? '#fff' : '#B8975A'}>
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}
function Cross() {
  return (
    <svg className="w-4 h-4 mx-auto opacity-25" viewBox="0 0 20 20" fill="#888">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}
/** Celda de la tabla comparativa: ✓/✗ para boolean, texto corto para string
 *  (p. ej. "90 días", "Planilla"). */
function CellValue({ v, dark }: { v: boolean | string; dark?: boolean }) {
  if (typeof v === 'string') {
    return <span className="font-outfit text-[8.5px] sm:text-[11px] font-semibold leading-tight text-center" style={{ color: '#8B7D5F' }}>{v}</span>;
  }
  return v ? <Check dark={dark} /> : <Cross />;
}

function SmartConfirmationShowcase() {
  return (
    <div className="relative mt-14">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-[8%] top-10 h-40 w-40 rounded-full blur-3xl" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="absolute right-[10%] bottom-0 h-48 w-48 rounded-full blur-3xl" style={{ background: 'rgba(62,41,8,0.22)' }} />
        <div className="absolute left-1/2 top-4 h-[82%] w-px -translate-x-1/2" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.3), rgba(255,255,255,0.05))' }} />
      </div>

      <div className="relative flex flex-col items-center gap-4 mb-10">
        <div className="inline-flex items-center gap-3 rounded-full px-5 py-2 text-white/90 backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)' }}>
          <span className="font-cormorant text-2xl sm:text-3xl">Paquete</span>
          <span className="rounded-full px-4 py-2 font-outfit text-xs sm:text-sm tracking-[0.25em] uppercase" style={{ background: '#5b4317', boxShadow: '0 12px 28px rgba(45,30,6,0.28)' }}>
            Exclusive
          </span>
        </div>
        <div className="h-px w-36" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)' }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {smartConfirmationCards.map((card, index) => (
          <div
            key={card.title}
            className="group relative overflow-hidden rounded-[30px] px-7 py-8 text-left text-white"
            style={{
              background: 'linear-gradient(180deg, rgba(205,188,151,0.26) 0%, rgba(196,176,137,0.2) 100%)',
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 18px 44px rgba(68,50,20,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
              animation: `smartCardFloat ${6 + index * 0.7}s ease-in-out ${index * 0.4}s infinite`,
            }}
          >
            <div
              className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.16), transparent 55%)' }}
            />
            <div className="absolute right-4 top-4 rounded-full px-3 py-1 text-[10px] font-outfit tracking-[0.22em] uppercase" style={{ background: 'rgba(71,48,11,0.45)', border: '1px solid rgba(255,255,255,0.12)' }}>
              {card.badge}
            </div>
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
              <div style={{ animation: `smartIconPulse ${4.5 + index * 0.4}s ease-in-out infinite` }}>
                {card.icon}
              </div>
            </div>
            <h4 className="font-cormorant text-3xl leading-none mb-3">{card.title}</h4>
            <p className="font-outfit text-[15px] leading-7 text-white/78">{card.desc}</p>
            <div className="mt-6 flex items-center gap-2 text-white/70">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#fff', animation: `smartDotBlink ${1.9 + index * 0.2}s ease-in-out infinite` }} />
              <span className="font-outfit text-xs tracking-[0.18em] uppercase">Monitoreo activo</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [openFaq, setOpenFaq]   = useState<number | null>(null);
  const [currency, setCurrency] = useState<'bs' | 'usd'>('bs');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Parallax suave del hero al hacer scroll
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroGlowY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroTabletY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  const pkgs = [
    { key: 'exclusive', label: 'EXCLUSIVE', bs: 1100, usd: 157, tag: 'El más completo',
      feats: ['Confirmación inteligente + Panel del anfitrión', 'Escáner QR de acceso al evento', 'Galería de 20 fotos y 90 días en línea', 'Hospedaje, calendario y nº de mesa'] },
    { key: 'premium',   label: 'PREMIUM',   bs: 930,  usd: 133, tag: 'El favorito',
      feats: ['Música de fondo personalizada', 'Nombres de invitados y pases', 'Galería de 8 fotos y 60 días en línea', 'Confirmación por planilla'] },
    { key: 'plus',      label: 'PLUS',      bs: 750,  usd: 107, tag: 'Esencial',
      feats: ['Confirmación por WhatsApp', 'Música y apertura tipo sobre', 'Ubicación Maps y cuenta regresiva', 'Itinerario, dress code y regalos'] },
  ];

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#FAF7F2' }}>
    {/* ── Global premium animations ── */}
    <style>{`
      html { scroll-behavior: smooth; }
      @keyframes shimmerSlide {
        0%   { transform: translateX(-200%) skewX(-20deg); }
        100% { transform: translateX(400%)  skewX(-20deg); }
      }
      @keyframes goldPulse {
        0%, 100% { filter: drop-shadow(0 0 3px rgba(184,151,90,0.25)); }
        50%       { filter: drop-shadow(0 0 14px rgba(184,151,90,0.75)) drop-shadow(0 0 30px rgba(184,151,90,0.35)); }
      }
      @keyframes exclusiveBorder {
        0%, 100% { box-shadow: 0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(184,151,90,0.25); }
        50%       { box-shadow: 0 12px 48px rgba(0,0,0,0.5), 0 0 0 1.5px rgba(240,200,100,0.7), 0 0 28px rgba(184,151,90,0.28); }
      }
      @keyframes logoShimmer {
        0%   { background-position: -250% center; }
        100% { background-position: 250% center; }
      }
      @keyframes goldTextShimmer {
        0%   { background-position: -300% center; }
        100% { background-position: 300% center; }
      }
      @keyframes sparkleFloat {
        0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
        50%       { opacity: 1; transform: scale(1) rotate(180deg); }
      }
      @keyframes smartCardFloat {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-12px); }
      }
      @keyframes smartIconPulse {
        0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.92; }
        50% { transform: scale(1.06) rotate(-2deg); opacity: 1; }
      }
      @keyframes smartDotBlink {
        0%, 100% { opacity: 0.35; transform: scale(0.9); }
        50% { opacity: 1; transform: scale(1.15); }
      }
    `}</style>

      {/* ── Nav (light, airy) ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b transition-all duration-500"
        style={{
          backgroundColor: scrolled ? 'rgba(250,247,242,0.94)' : 'rgba(250,247,242,0.82)',
          borderColor: 'rgba(139,125,95,0.15)',
          boxShadow: scrolled ? '0 10px 36px rgba(90,78,52,0.12)' : 'none',
        }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <h1 className="font-cinzel text-xl tracking-wide" style={{
            backgroundImage: 'linear-gradient(90deg, #8B7D5F 0%, #B8975A 30%, #e0c074 50%, #B8975A 70%, #8B7D5F 100%)',
            backgroundSize: '260% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'logoShimmer 6s linear infinite',
          }}>
            <span className="font-great text-3xl">E</span>nkarta
          </h1>
          <div className="hidden md:flex items-center gap-7 font-outfit text-sm" style={{ color: 'rgba(44,37,25,0.55)' }}>
            {[['Bodas','#catalogo'],['XV Años','#catalogo'],['Graduaciones','#catalogo'],['Bautizos','#catalogo'],['Precios','#precios']].map(([l, href]) => (
              <a key={l} href={href} className="relative group transition-colors hover:text-enkarta-dark py-1">
                {l}
                <span className="absolute left-0 -bottom-0.5 h-px w-0 group-hover:w-full transition-all duration-300" style={{ backgroundColor: '#B8975A' }} />
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <a href="/panel" className="hidden md:inline-block px-4 py-2 border rounded-lg font-outfit text-sm font-medium transition-all duration-300 hover:-translate-y-px"
               style={{ borderColor: 'rgba(139,125,95,0.35)', color: 'rgba(44,37,25,0.7)' }}
               onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#B8975A'; (e.currentTarget as HTMLElement).style.color = '#8B7D5F'; }}
               onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,125,95,0.35)'; (e.currentTarget as HTMLElement).style.color = 'rgba(44,37,25,0.7)'; }}>
              Iniciar Sesión
            </a>
            <a href={WA} target="_blank" rel="noopener noreferrer"
               className="px-4 py-2 rounded-lg font-outfit text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-px hover:shadow-lg"
               style={{ backgroundColor: '#8B7D5F', boxShadow: '0 4px 16px rgba(139,125,95,0.25)' }}>
              Contactar
            </a>
            {/* Hamburguesa (solo móvil) */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
              className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-[5px] rounded-lg transition-colors"
              style={{ color: '#8B7D5F' }}
            >
              <span className="block h-[2px] w-5 rounded-full bg-current transition-all duration-300" style={{ transform: menuOpen ? 'translateY(7px) rotate(45deg)' : 'none' }} />
              <span className="block h-[2px] w-5 rounded-full bg-current transition-all duration-300" style={{ opacity: menuOpen ? 0 : 1 }} />
              <span className="block h-[2px] w-5 rounded-full bg-current transition-all duration-300" style={{ transform: menuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Panel móvil desplegable */}
        <motion.div
          initial={false}
          animate={{ height: menuOpen ? 'auto' : 0, opacity: menuOpen ? 1 : 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="md:hidden overflow-hidden border-t"
          style={{ backgroundColor: 'rgba(250,247,242,0.97)', borderColor: 'rgba(139,125,95,0.12)' }}
        >
          <div className="px-6 py-4 flex flex-col gap-1 font-outfit text-sm">
            {[['Bodas','#catalogo'],['XV Años','#catalogo'],['Graduaciones','#catalogo'],['Bautizos','#catalogo'],['Precios','#precios'],['Preguntas','#faq']].map(([l, href]) => (
              <a key={l} href={href} onClick={() => setMenuOpen(false)}
                 className="py-2.5 px-3 rounded-lg transition-colors hover:bg-enkarta-gold/10"
                 style={{ color: 'rgba(44,37,25,0.7)' }}>
                {l}
              </a>
            ))}
            <div className="h-px my-2" style={{ backgroundColor: 'rgba(139,125,95,0.15)' }} />
            <a href="/panel" onClick={() => setMenuOpen(false)}
               className="py-2.5 px-3 rounded-lg transition-colors hover:bg-enkarta-gold/10"
               style={{ color: '#8B7D5F' }}>
              Iniciar Sesión
            </a>
          </div>
        </motion.div>
      </nav>

      {/* ── Hero (light, airy, editorial) ── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col" style={{
        background: 'radial-gradient(ellipse at 50% 12%, #fdfbf7 0%, #f6f0e7 45%, #ece2d4 100%)',
      }}>
        {/* Soft warm light glows (parallax) */}
        <motion.div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ y: heroGlowY }}>
          <div className="absolute top-[-10%] left-[10%] w-[480px] h-[480px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(212,184,120,0.18) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[5%] right-[8%] w-[420px] h-[420px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(139,125,95,0.14) 0%, transparent 70%)' }} />
        </motion.div>
        <GoldParticles />
        <Butterflies zone="hero" />

        {/* Centered brand emblem + tagline */}
        <motion.div
          className="relative z-10 flex flex-col items-center pt-28 px-6"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } } }}
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } } }} className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full border flex items-center justify-center" style={{ borderColor: 'rgba(139,125,95,0.4)', background: 'rgba(212,184,120,0.1)', animation: 'goldPulse 2.8s ease-in-out infinite' }}>
              <span className="font-great text-2xl" style={{ color: '#8B7D5F' }}>E</span>
            </div>
            <span className="font-cinzel text-3xl tracking-wide" style={{
              backgroundImage: 'linear-gradient(90deg, #8B7D5F 0%, #B8975A 30%, #e0c074 50%, #B8975A 70%, #8B7D5F 100%)',
              backgroundSize: '260% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'logoShimmer 6s linear infinite',
            }}>Enkarta</span>
          </motion.div>

          <motion.p variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } } }}
            className="font-cormorant text-center tracking-[0.18em]" style={{ color: 'rgba(44,37,25,0.55)', fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 500 }}>
            Celebra con elegancia
          </motion.p>
          <motion.h1 variants={{ hidden: { opacity: 0, y: 28, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 1, ease: [0.22, 1, 0.36, 1] } } }}
            className="font-great text-center" style={{ color: '#8B7D5F', fontSize: 'clamp(44px, 6.5vw, 76px)', lineHeight: 1.05 }}>
            invita con estilo
          </motion.h1>

          <motion.div variants={{ hidden: { opacity: 0, scaleX: 0.4 }, show: { opacity: 1, scaleX: 1, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } } }}
            className="flex items-center gap-4 mt-4 mb-2">
            <div className="h-px w-16" style={{ backgroundColor: 'rgba(139,125,95,0.45)' }} />
            <span className="font-outfit text-sm tracking-[0.4em]" style={{ color: 'rgba(139,125,95,0.7)' }}>2026</span>
            <div className="h-px w-16" style={{ backgroundColor: 'rgba(139,125,95,0.45)' }} />
          </motion.div>
        </motion.div>

        {/* Tablet carousel — centered, floating, 3D tilt */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-10">
          <motion.div
            className="w-full max-w-2xl"
            style={{ y: heroTabletY }}
            initial={{ opacity: 0, y: 60, rotateX: 14 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1.1, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <Tilt3D max={7} scale={1.012}>
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}>
                <TabletCarousel />
              </motion.div>
            </Tilt3D>
          </motion.div>
        </div>

        {/* CTAs + stats */}
        <motion.div
          className="relative z-10 flex flex-col items-center pb-16 px-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
            <a href="#catalogo" className="relative overflow-hidden px-9 py-3.5 rounded-full font-outfit font-semibold text-white transition-all duration-300 text-sm hover:-translate-y-0.5 hover:shadow-xl group" style={{ backgroundColor: '#8B7D5F', boxShadow: '0 8px 28px rgba(139,125,95,0.3)' }}>
              <span className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
                <span className="absolute top-0 bottom-0 w-1/3 opacity-0 group-hover:opacity-100" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)', animation: 'shimmerSlide 1.6s ease-in-out infinite' }} />
              </span>
              Ver Catálogo
            </a>
            <a href={WA} target="_blank" rel="noopener noreferrer"
               className="px-9 py-3.5 rounded-full font-outfit font-semibold text-sm transition-all border"
               style={{ borderColor: 'rgba(139,125,95,0.4)', color: 'rgba(44,37,25,0.75)' }}>
              Contactar Asesor
            </a>
          </div>

          <div className="flex gap-10 sm:gap-14">
            {[[200, '+', 'Invitaciones'], [12, '', 'Diseños'], [100, '%', 'Satisfacción']].map(([n, suffix, l]) => (
              <div key={l as string} className="text-center">
                <p className="font-cinzel text-2xl font-semibold" style={{ color: '#5a4e34' }}>
                  <CountUp value={n as number} suffix={suffix as string} />
                </p>
                <p className="font-outfit text-[11px] mt-1" style={{ color: 'rgba(44,37,25,0.4)' }}>{l}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 1 }}
        >
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(139,125,95,0.55)" strokeWidth="1.6"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Event type pills ── */}
      <section className="py-6 px-4 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-3">
          {['Bodas','XV Años','Cumpleaños','Baby Shower','Bautizos','Graduaciones'].map((t) => (
            <span key={t} className="px-5 py-2 rounded-full border font-outfit text-sm transition-all cursor-pointer"
              style={{ borderColor: 'rgba(184,151,90,0.25)', color: 'rgba(30,27,22,0.55)' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.borderColor='#B8975A'; (e.target as HTMLElement).style.color='#B8975A'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor='rgba(184,151,90,0.25)'; (e.target as HTMLElement).style.color='rgba(30,27,22,0.55)'; }}>
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── Catalog ── */}
      <section id="catalogo" className="relative overflow-hidden py-28 px-4 bg-white">
        <Butterflies zone="section" />
        <div className="relative max-w-6xl mx-auto">
          <Reveal className="text-center mb-20">
            <p className="font-great text-4xl mb-2" style={{ color: '#B8975A' }}>Catálogo</p>
            <h3 className="font-cinzel text-3xl sm:text-4xl tracking-[0.08em]" style={{ color: '#5a4e34' }}>INVITACIONES ÚNICAS</h3>
            <p className="font-cormorant mt-4 max-w-xl mx-auto" style={{ color: 'rgba(44,37,25,0.55)', fontSize: '20px', fontWeight: 500 }}>
              Descubre diseños únicos creados por nuestro equipo de expertos para tus momentos más especiales.
            </p>
          </Reveal>
          {/* 1 col en móvil: con 2 cols los mockups quedan flacos/alargados y
              desbordan su alto fijo tapando el nombre de la plantilla. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-14 sm:gap-y-24">
            {templates.map((t, i) => {
              const isDemo = 'demoPath' in t;
              return (
              <Reveal key={t.name} delay={(i % 4) * 0.1} y={44}>
                <a
                  href={isDemo ? t.demoPath : WA}
                  target={isDemo ? undefined : '_blank'}
                  rel={isDemo ? undefined : 'noopener noreferrer'}
                  className="group block w-full max-w-[280px] mx-auto"
                >
                  <Tilt3D max={6} scale={1.02}>
                    <DualPhoneCard t={t} />
                  </Tilt3D>
                  <div className="mt-3 text-center">
                    <span className="font-outfit text-[11px] uppercase tracking-[0.22em]" style={{ color: isDemo ? '#B8975A' : 'rgba(44,37,25,0.38)' }}>
                      {isDemo ? 'Abrir invitación' : 'Disponible a pedido'}
                    </span>
                  </div>
                </a>
              </Reveal>
              );
            })}
          </div>
          <Reveal className="text-center mt-20">
            <a href={WA} target="_blank" rel="noopener noreferrer"
               className="inline-block px-9 py-3.5 border rounded-full font-outfit font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
               style={{ borderColor: 'rgba(139,125,95,0.5)', color: '#8B7D5F' }}>
              Pedir mi invitación
            </a>
          </Reveal>
        </div>
      </section>

      {/* ── Editorial transition: primer detalle ── */}
      <section className="py-28 px-6" style={{ backgroundColor: '#F4EEE5' }}>
        <Reveal className="max-w-2xl mx-auto text-center">
          <h2 className="font-great mb-8" style={{ color: '#8B7D5F', fontSize: 'clamp(44px, 6vw, 72px)', lineHeight: 1 }}>
            primer detalle
          </h2>
          <p className="font-cormorant" style={{ color: 'rgba(44,37,25,0.7)', fontSize: '22px', lineHeight: 1.7, fontWeight: 500 }}>
            Nuestro equipo de <strong style={{ color: '#5a4e34' }}>diseñadores y programadores</strong> sabe que cada
            invitación es el primer detalle de un momento inolvidable. Para un toque aún más personal,
            nuestra tecnología permite <strong style={{ color: '#5a4e34' }}>personalizar la invitación con el nombre de cada invitado</strong>,
            haciendo que cada destinatario se sienta parte especial de su historia.
          </p>
        </Reveal>
      </section>

      {/* ── Olive block: confirmación inteligente ── */}
      <section className="relative overflow-hidden py-24 px-6 text-center" style={{ background: 'linear-gradient(180deg, #a99465 0%, #9f8a5d 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
          <div className="absolute left-[8%] top-[18%] h-56 w-56 rounded-full blur-3xl" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="absolute right-[7%] bottom-[10%] h-72 w-72 rounded-full blur-3xl" style={{ background: 'rgba(78,52,12,0.18)' }} />
        </div>
        <div className="relative max-w-6xl mx-auto">
          <Reveal>
          <p className="font-cormorant tracking-[0.15em] mb-1" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 500 }}>
            Sistema de confirmación
          </p>
          <h2 className="font-great" style={{ color: '#ffffff', fontSize: 'clamp(48px, 7vw, 84px)', lineHeight: 1 }}>
            inteligente
          </h2>
          <p className="font-cormorant mt-6 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '19px', lineHeight: 1.6, fontWeight: 500 }}>
            Gestiona tus invitaciones en tiempo real: conoce quién confirma, rechaza o queda pendiente
            de forma segura, todo desde un panel exclusivo.
          </p>
          </Reveal>
          <SmartConfirmationShowcase />
        </div>
      </section>

      {/* ── Features (premium) ── */}
      <section className="py-28 px-4" style={{ backgroundColor: '#FAF7F2' }}>
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-20">
            <p className="font-great text-4xl mb-2" style={{ color: '#B8975A' }}>Incluye</p>
            <h3 className="font-cinzel text-3xl sm:text-4xl tracking-[0.08em]" style={{ color: '#5a4e34' }}>TODO LO QUE NECESITAS</h3>
            <p className="font-cormorant mt-4 max-w-lg mx-auto" style={{ color: 'rgba(44,37,25,0.55)', fontSize: '20px', fontWeight: 500 }}>
              Cada invitación Enkarta viene cargada con funciones que sorprenderán a tus invitados.
            </p>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 4) * 0.07} y={26}>
              <div
                className="h-full bg-white rounded-2xl p-5 flex flex-col items-center text-center gap-3 border border-transparent hover:border-enkarta-gold/25 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:bg-enkarta-gold/10 group-hover:scale-110 group-hover:rotate-3"
                  style={{ backgroundColor: 'rgba(184,151,90,0.07)', color: '#B8975A' }}>
                  {f.icon}
                </div>
                <div>
                  <h4 className="font-outfit font-semibold text-sm text-enkarta-dark leading-tight">{f.title}</h4>
                  <p className="font-outfit text-xs text-gray-400 mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="precios" className="py-28 px-4 bg-white">
        <div className="max-w-5xl mx-auto">

          {/* Heading */}
          <Reveal className="text-center mb-10">
            <h3 className="font-cinzel text-4xl sm:text-5xl" style={{ color: '#5a4e34', letterSpacing: '0.12em' }}>
              3 PAQUETES
            </h3>
            <div className="w-20 h-px mx-auto mt-5 mb-8" style={{ backgroundColor: '#8B7D5F' }} />

            {/* Currency toggle */}
            <div className="inline-flex rounded-full p-1 border" style={{ borderColor: 'rgba(184,151,90,0.3)', backgroundColor: '#faf7f2' }}>
              {(['bs','usd'] as const).map(c => (
                <button key={c} onClick={() => setCurrency(c)}
                  className="px-6 py-2 rounded-full font-outfit text-sm font-semibold transition-all"
                  style={{ backgroundColor: currency === c ? '#B8975A' : 'transparent', color: currency === c ? '#fff' : 'rgba(30,27,22,0.55)' }}>
                  {c === 'bs' ? 'Bolivianos' : 'Dólares'}
                </button>
              ))}
            </div>
          </Reveal>

          {/* Price cards — EXCLUSIVE destacada, PREMIUM/PLUS elegantes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-4 mb-8 items-stretch max-w-3xl mx-auto">
            {pkgs.map((pkg, pi) => {
              const isExclusive = pkg.key === 'exclusive';
              const isPremium = pkg.key === 'premium';
              return (
              <Reveal key={pkg.key} delay={pi * 0.12} y={40} className="flex">
              <div
                className={`relative w-full flex flex-col rounded-3xl overflow-hidden transition-transform duration-300 hover:-translate-y-1.5 ${isExclusive ? 'sm:scale-[1.06] sm:z-10' : ''}`}
                style={isExclusive ? {
                  background: 'linear-gradient(168deg, #20314a 0%, #15202f 48%, #0c141e 100%)',
                  animation: 'exclusiveBorder 3.8s ease-in-out infinite',
                } : {
                  background: '#ffffff',
                  border: `1px solid ${isPremium ? 'rgba(171,153,118,0.45)' : 'rgba(139,125,95,0.22)'}`,
                  boxShadow: '0 14px 36px rgba(90,78,52,0.12)',
                }}>

                {isExclusive && (<>
                  {/* Hilo dorado superior + brillo suave */}
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #e8c870 30%, #fff6e0 50%, #e8c870 70%, transparent)' }} />
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(200,170,100,0.16) 0%, transparent 55%)' }} />
                  <div className="absolute top-4 right-5 w-1 h-1 rounded-full pointer-events-none" style={{ backgroundColor: '#f0d080', animation: 'sparkleFloat 3.2s ease-in-out infinite', opacity: 0.8 }} />
                  <div className="absolute bottom-6 left-5 w-1 h-1 rounded-full pointer-events-none" style={{ backgroundColor: '#f0d080', animation: 'sparkleFloat 3.8s ease-in-out infinite 1.2s', opacity: 0.6 }} />
                </>)}

                {/* Cinta superior */}
                <div className="pt-5 pb-1 text-center relative">
                  <span className="inline-block px-4 py-1 rounded-full font-outfit text-[9px] tracking-[0.24em] uppercase"
                    style={isExclusive
                      ? { background: 'rgba(232,200,112,0.14)', border: '1px solid rgba(232,200,112,0.4)', color: '#e8c870' }
                      : { background: 'rgba(139,125,95,0.07)', border: '1px solid rgba(139,125,95,0.2)', color: '#8B7D5F' }}>
                    {pkg.tag}
                  </span>
                </div>

                {/* Nombre del paquete */}
                <div className="relative text-center pt-2 pb-1">
                  {isExclusive && (
                    <svg className="mx-auto mb-1.5" width="26" height="18" viewBox="0 0 26 18" fill="none">
                      <path d="M2 15.5 L1 5 L7.5 9.5 L13 2 L18.5 9.5 L25 5 L24 15.5 Z" stroke="#e8c870" strokeWidth="1.3" strokeLinejoin="round" fill="rgba(232,200,112,0.12)" />
                      <circle cx="13" cy="2" r="1.3" fill="#e8c870" /><circle cx="1.5" cy="4.6" r="1.1" fill="#e8c870" /><circle cx="24.5" cy="4.6" r="1.1" fill="#e8c870" />
                    </svg>
                  )}
                  <p className="relative font-outfit font-bold text-sm tracking-[0.22em]" style={isExclusive ? {
                    backgroundImage: 'linear-gradient(90deg, #B8975A 0%, #e8c870 28%, #fff6e0 50%, #e8c870 72%, #B8975A 100%)',
                    backgroundSize: '250% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'goldTextShimmer 7s linear infinite',
                  } : { color: '#5a4e34' }}>{pkg.label}</p>
                </div>

                {/* Precio */}
                <div className="text-center py-3">
                  <div className="flex items-start justify-center gap-1">
                    <span className="font-outfit text-sm mt-2" style={{ color: isExclusive ? 'rgba(232,200,112,0.7)' : 'rgba(139,125,95,0.7)' }}>
                      {currency === 'bs' ? 'Bs' : 'USD'}
                    </span>
                    <span className="font-playfair text-[42px] leading-none font-bold" style={{ color: isExclusive ? '#e8c870' : '#8B7D5F' }}>
                      {currency === 'bs' ? pkg.bs : pkg.usd}
                    </span>
                  </div>
                </div>

                {/* Divisor */}
                <div className="mx-7 h-px" style={{ background: isExclusive
                  ? 'linear-gradient(90deg, transparent, rgba(232,200,112,0.5), transparent)'
                  : 'linear-gradient(90deg, transparent, rgba(139,125,95,0.3), transparent)' }} />

                {/* Funciones destacadas */}
                <ul className="flex-1 px-6 py-4 space-y-2.5">
                  {pkg.feats.map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill={isExclusive ? '#e8c870' : '#B8975A'}>
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="font-outfit text-[12px] leading-snug" style={{ color: isExclusive ? 'rgba(255,255,255,0.82)' : 'rgba(44,37,25,0.65)' }}>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA del paquete */}
                <div className="px-6 pb-6">
                  <a href={WA} target="_blank" rel="noopener noreferrer"
                    className="block text-center py-2.5 rounded-full font-outfit text-xs font-semibold tracking-wide transition-all"
                    style={isExclusive
                      ? { background: 'linear-gradient(90deg, #B8975A, #d8b876)', color: '#10131a', boxShadow: '0 6px 22px rgba(184,151,90,0.4)' }
                      : { border: '1.5px solid rgba(139,125,95,0.45)', color: '#8B7D5F' }}>
                    Reservar {pkg.label.charAt(0) + pkg.label.slice(1).toLowerCase()}
                  </a>
                </div>
              </div>
              </Reveal>
              );
            })}
          </div>

          {/* Reservation note */}
          <div className="text-center mb-10">
            <p className="font-outfit font-bold text-enkarta-dark text-sm uppercase tracking-widest mb-1">
              Reserva con {currency === 'bs' ? '200 Bs' : '$29'}
            </p>
            <p className="font-outfit text-enkarta-dark/50 text-xs">Paga el resto cuando tu invitación esté finalizada</p>
            <a href={WA} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 mt-5 px-8 py-3.5 rounded-full font-outfit font-semibold text-white transition-all shadow-lg"
               style={{ backgroundColor: '#25D366', boxShadow: '0 4px 20px rgba(37,211,102,0.35)' }}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Quiero Reservar
            </a>
          </div>

          {/* Comparison table — las 3 columnas siempre visibles (sin scroll
              horizontal): la columna de la función es más ancha y el resto se
              reparte, con paddings/tipografía compactos en móvil. */}
          <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div>
              {/* Table header */}
              <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] sm:grid-cols-4 text-center" style={{ backgroundColor: '#1e1b16' }}>
                <div className="p-2 sm:p-4" />
                {pkgs.map(pkg => (
                  <div key={pkg.key} className="p-2 sm:p-4 flex items-center justify-center">
                    <p className="font-outfit font-bold text-[8.5px] sm:text-xs tracking-[0.08em] sm:tracking-widest text-white">{pkg.label}</p>
                  </div>
                ))}
              </div>

              {/* Rows — order: EXCLUSIVE | PREMIUM | PLUS */}
              {comparisonRows.map(([feature, desc, excl, prem, plus], i) => (
                <div key={i}
                  className="grid grid-cols-[1.6fr_1fr_1fr_1fr] sm:grid-cols-4 text-center items-stretch border-b border-gray-100"
                  style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : '#faf8f5' }}>
                  <div className={`p-2 sm:p-4 text-left flex flex-col justify-center ${i === 0 ? 'bg-enkarta-dark/5' : ''}`}>
                    <p className={`font-outfit text-[10px] sm:text-xs font-medium ${i === 0 ? 'text-enkarta-dark font-semibold' : 'text-enkarta-dark/70'}`}>{feature}</p>
                    {desc && <p className="font-outfit text-[8px] sm:text-[10px] text-enkarta-gold mt-0.5 italic">{desc}</p>}
                  </div>
                  {/* EXCLUSIVE column */}
                  <div className="p-2 sm:p-4 flex items-center justify-center" style={{ backgroundColor: i === 0 ? 'rgba(68,51,19,0.06)' : '' }}>
                    <CellValue v={excl} dark={false} />
                  </div>
                  {/* PREMIUM column */}
                  <div className="p-2 sm:p-4 flex items-center justify-center">
                    <CellValue v={prem} />
                  </div>
                  {/* PLUS column */}
                  <div className="p-2 sm:p-4 flex items-center justify-center">
                    <CellValue v={plus} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Servicios Adicionales ── */}
      <section className="py-28 px-4" style={{ backgroundColor: '#FAF7F2' }}>
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <h3 className="font-cinzel text-3xl sm:text-4xl" style={{ color: '#5a4e34', letterSpacing: '0.1em' }}>
              SERVICIOS ADICIONALES
            </h3>
            <div className="w-16 h-px mx-auto mt-5" style={{ backgroundColor: '#8B7D5F' }} />
          </Reveal>
          <div className="space-y-0">
            {additionalServices.map((s, i) => (
              <Reveal key={i} delay={Math.min(i * 0.05, 0.3)} y={20} className={`py-6 ${i < additionalServices.length - 1 ? 'border-b border-[#B8975A]/15' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-2">
                  <h4 className="font-playfair text-base sm:text-lg font-semibold text-enkarta-dark">{s.name}</h4>
                  <p className="font-outfit font-bold text-enkarta-dark whitespace-nowrap flex-shrink-0 ml-auto" style={{ fontSize: '1rem' }}>
                    + {currency === 'bs' ? `Bs ${s.bs}` : `$${s.usd}`}
                  </p>
                </div>
                <p className="font-outfit text-sm leading-relaxed" style={{ color: '#B8975A' }}>{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="como-funciona" className="py-28 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="font-great text-4xl mb-2" style={{ color: '#B8975A' }}>Proceso</p>
            <h3 className="font-cinzel text-3xl sm:text-4xl tracking-[0.06em]" style={{ color: '#5a4e34' }}>¿CÓMO FUNCIONA?</h3>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <Reveal key={s.num} delay={i * 0.12} y={30}>
              <div className="h-full bg-gray-50 p-6 rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(184,151,90,0.1)' }}>
                  <span className="font-playfair text-sm font-bold" style={{ color: '#B8975A' }}>{s.num}</span>
                </div>
                <h4 className="font-outfit font-semibold text-enkarta-dark mb-2">{s.title}</h4>
                <p className="font-outfit text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-28 px-4" style={{ backgroundColor: '#f0ebe4' }}>
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="font-great text-4xl mb-2" style={{ color: '#B8975A' }}>Opiniones</p>
            <h3 className="font-cinzel text-3xl sm:text-4xl tracking-[0.06em]" style={{ color: '#5a4e34' }}>LO QUE DICEN NUESTROS CLIENTES</h3>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {testimonials.map((t, i) => (
              <Reveal key={i} delay={(i % 2) * 0.12} y={30}>
              <div className="h-full bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <svg key={s} className="w-4 h-4" viewBox="0 0 20 20" fill="#B8975A">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="font-cormorant leading-relaxed mb-5 italic" style={{ color: 'rgba(44,37,25,0.7)', fontSize: '18px', fontWeight: 500 }}>&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#B8975A' }}>
                    <span className="font-playfair text-sm font-bold text-white">{t.initial}</span>
                  </div>
                  <div>
                    <p className="font-outfit font-semibold text-sm text-enkarta-dark">{t.name}</p>
                    <p className="font-outfit text-xs text-gray-400">{t.event}</p>
                  </div>
                </div>
              </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-28 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="font-great text-4xl mb-2" style={{ color: '#B8975A' }}>Preguntas</p>
            <h3 className="font-cinzel text-3xl sm:text-4xl tracking-[0.06em]" style={{ color: '#5a4e34' }}>FRECUENTES</h3>
          </Reveal>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <Reveal key={i} delay={Math.min(i * 0.06, 0.3)} y={18}>
              <div className="border border-gray-100 rounded-2xl overflow-hidden hover:border-enkarta-gold/30 transition-colors duration-300">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
                  <span className="font-outfit font-medium text-enkarta-dark text-sm pr-4">{faq.q}</span>
                  <svg className={`w-5 h-5 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#B8975A' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: openFaq === i ? 'auto' : 0, opacity: openFaq === i ? 1 : 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-4 border-t border-gray-50">
                    <p className="font-outfit text-sm text-gray-500 leading-relaxed pt-3">{faq.a}</p>
                  </div>
                </motion.div>
              </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="contacto" className="py-24 px-4 text-white text-center relative overflow-hidden" style={{ backgroundColor: '#1a1512' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(184,151,90,0.06)' }} />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(184,151,90,0.06)' }} />
        </div>
        <Reveal className="max-w-2xl mx-auto relative z-10">
          <p className="font-great text-4xl mb-4" style={{ color: '#B8975A' }}>¿Lista para empezar?</p>
          <h3 className="font-playfair text-3xl sm:text-4xl mb-4 leading-tight">
            Cuéntanos los detalles de tu evento y empieza tu invitación{' '}
            <span style={{ color: '#B8975A' }}>hoy mismo</span>
          </h3>
          <p className="font-outfit text-white/50 mb-10 text-sm">Elige el modelo y paquete que prefieras. Nosotros nos encargamos del resto.</p>
          <a href={WA} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-outfit font-semibold text-lg text-white transition-all"
             style={{ backgroundColor: '#B8975A', boxShadow: '0 8px 40px rgba(184,151,90,0.3)' }}>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Reserva tu Invitación
          </a>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-4 border-t border-white/5" style={{ backgroundColor: '#120f0c' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-outfit text-sm text-white/25">© 2026 Enkarta. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6">
            {['Catálogo','Precios','FAQ'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} className="font-outfit text-xs text-white/25 hover:text-white/50 transition-colors">{l}</a>
            ))}
          </div>
          <p className="font-great text-xl" style={{ color: 'rgba(184,151,90,0.35)' }}>Enkarta</p>
        </div>
      </footer>
    </div>
    </MotionConfig>
  );
}
