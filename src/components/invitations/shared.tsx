'use client';

import { useEffect, useRef, useState } from 'react';

// ── Live countdown hook ───────────────────────────────────────────────────────
export function useCountdown(isoDate: string) {
  // Start at zeros so server and client first render match (avoids hydration mismatch),
  // then compute on the client after mount.
  const [t, setT] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  useEffect(() => {
    const target = new Date(isoDate).getTime();
    const calc = () => {
      const diff = Math.max(0, target - Date.now());
      return {
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      };
    };
    setT(calc());
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [isoDate]);
  return t;
}

// ── Scroll reveal wrapper (fade-in-up when in view) ───────────────────────────
export function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: keyof JSX.IntrinsicElements;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const Component = Tag as any;
  return (
    <Component
      ref={ref as any}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(34px)',
        transition: `opacity 1s ease ${delay}ms, transform 1s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </Component>
  );
}

// ── Delicate feather (pluma) ──────────────────────────────────────────────────
function Feather({ color, tip }: { color: string; tip: string }) {
  const barbs = [];
  for (let y = 6; y <= 40; y += 2.4) {
    const t = (y - 6) / 34;            // 0..1 from top to bottom
    const len = 5.5 * Math.sin(t * Math.PI) + 1.2; // widest in the middle
    const lift = 3.2;                  // barbs sweep upward
    barbs.push(
      <line key={`l${y}`} x1="11" y1={y} x2={11 - len} y2={y - lift} stroke={color} strokeWidth="0.55" strokeLinecap="round" />,
      <line key={`r${y}`} x1="11" y1={y} x2={11 + len} y2={y - lift} stroke={color} strokeWidth="0.55" strokeLinecap="round" />
    );
  }
  return (
    <svg width="22" height="48" viewBox="0 0 22 48" fill="none">
      {/* rachis */}
      <path d="M11 4 C 11.6 16, 11 32, 9.5 44" stroke={color} strokeWidth="0.9" strokeLinecap="round" />
      {barbs}
      {/* soft colored tip */}
      <path d="M11 4 C 12.4 7, 12.2 11, 10.8 14 C 9.6 11, 9.8 7, 11 4 Z" fill={tip} opacity="0.5" />
    </svg>
  );
}

// ── Floating feather particles (subtle, spread everywhere) ────────────────────
export function Particles({ color = '#3a5a82', tip = '#9aa9d6', count = 6 }: { color?: string; tip?: string; count?: number }) {
  // evenly spread across the full width with light jitter
  const feathers = Array.from({ length: count }, (_, i) => {
    const base = (i + 0.5) * (100 / count);
    const jitter = ((i * 37) % 14) - 7;
    return {
      left: `${Math.max(2, Math.min(96, base + jitter))}%`,
      delay: `${(i * 4.3) % 22}s`,
      duration: `${20 + ((i * 5) % 12)}s`,
      scale: 0.6 + ((i * 7) % 8) / 16,
      drift: `${(i % 2 === 0 ? 1 : -1) * (28 + (i * 11) % 46)}px`,
      spin: `${(i % 2 === 0 ? 1 : -1) * (18 + (i * 7) % 22)}deg`,
    };
  });
  return (
    <div className="pointer-events-none fixed inset-0 z-[6] overflow-hidden" aria-hidden>
      {feathers.map((f, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: f.left,
            top: '-60px',
            // @ts-expect-error custom props
            '--drift': f.drift,
            '--spin': f.spin,
            '--s': String(f.scale),
            animation: `featherFall ${f.duration} ease-in-out ${f.delay} infinite`,
            opacity: 0.32,
          }}
        >
          <Feather color={color} tip={tip} />
        </span>
      ))}
    </div>
  );
}

// ── Copy-to-clipboard button ──────────────────────────────────────────────────
export function CopyBtn({ value, color = 'currentColor' }: { value: string; color?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center justify-center align-middle transition-transform active:scale-90"
      style={{ color }}
      aria-label="Copiar"
    >
      {done ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V5a2 2 0 012-2h10" />
        </svg>
      )}
    </button>
  );
}

// ── Shared line-art icon set (refined, Invitali-style) ────────────────────────
export function EventIcon({ name, className = '', stroke = 'currentColor' }: { name: string; className?: string; stroke?: string }) {
  const common = { fill: 'none', stroke, strokeWidth: 1.25, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'church': // gothic arch + bride & groom + cross
      return (
        <svg viewBox="0 0 48 52" className={className} {...common}>
          {/* cross */}
          <path d="M24 2.5V9M21 5.2h6" />
          {/* pointed arch */}
          <path d="M11.5 49.5V25.5C11.5 14 17.5 9 24 9s12.5 5 12.5 16.5v24" />
          <path d="M11 49.5h26" />
          {/* bride (left): head, veil, A-line dress */}
          <circle cx="20" cy="26" r="2.4" />
          <path d="M17.9 25.2C15.4 29 15.6 38 16.6 45" />
          <path d="M20 28.4 16.6 45h6.8z" />
          {/* groom (right): head, torso, arm to bride, legs */}
          <circle cx="28.4" cy="26.4" r="2.4" />
          <path d="M28.4 28.8v9.4M28.4 31.5 23.6 33M28.4 38.2 26 45M28.4 38.2 30.8 45" />
        </svg>
      );
    case 'cheers': // clinking champagne flutes + sparkle
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          {/* left flute (rim tilts toward center) */}
          <path d="M15.5 9 21.5 11 19 21 Z" />
          <path d="M19 21v9.5M16 31h6" />
          {/* right flute */}
          <path d="M32.5 9 26.5 11 29 21 Z" />
          <path d="M29 21v9.5M26 31h6" />
          {/* sparkle at the clink */}
          <path d="M24 3.5v3.8M21.4 5.4 22.9 6.7M26.6 5.4 25.1 6.7" opacity="0.9" />
        </svg>
      );
    case 'dance': // dancing couple — groom + bride with flared dress
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          {/* groom */}
          <circle cx="18" cy="12" r="2.6" />
          <path d="M18 14.6V27M18 18.5 26.5 22.5M18 27 14.5 40M18 27 21 39" />
          {/* bride */}
          <circle cx="30.5" cy="11" r="2.6" />
          <path d="M30.5 13.6V23M30.5 17.5 22.5 21M30.5 23 24.5 41h12.4z" />
        </svg>
      );
    case 'rings':
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <circle cx="19" cy="29" r="9" />
          <circle cx="30" cy="29" r="9" />
          <path d="M16 18l3-6h6l3 6M19 12l5 6 5-6" />
        </svg>
      );
    case 'dinner':
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <circle cx="24" cy="26" r="11" />
          <circle cx="24" cy="26" r="5" />
          <path d="M9 10v8M9 18a3 3 0 006 0M12 10v8M39 10c-3 0-4 4-4 8h4z" />
        </svg>
      );
    case 'dress': // flared dress + suit jacket with bowtie, on hangers
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          {/* ── dress (left) ── */}
          <path d="M15.5 8.2c0-1.4 2-1.4 2 0" />
          <path d="M11.2 12.4 16.5 9.4 21.8 12.4" />
          {/* fitted bodice */}
          <path d="M13.8 12.8 16.5 11.6 19.2 12.8" />
          <path d="M14.4 13.2 15.6 21M18.6 13.2 17.4 21M15.6 21h1.8" />
          {/* flared A-line skirt */}
          <path d="M15.6 21 11 39h11l-4.6-18" />
          {/* ── suit (right) ── */}
          <path d="M30.5 8.2c0-1.4 2-1.4 2 0" />
          <path d="M26.2 12.4 31.5 9.4 36.8 12.4" />
          {/* jacket body */}
          <path d="M28 12.8 28.3 39h6.4l.3-26.2" />
          {/* lapels V */}
          <path d="M29 13 31.5 20 34 13" />
          <path d="M31.5 20V39" />
          {/* bowtie */}
          <path d="M30.2 13.6 31.5 14.5 30.2 15.4ZM32.8 13.6 31.5 14.5 32.8 15.4Z" />
        </svg>
      );
    case 'camera':
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <rect x="6" y="14" width="36" height="26" rx="4" />
          <path d="M16 14l3-5h10l3 5" />
          <circle cx="24" cy="27" r="7" />
          <circle cx="35" cy="19" r="1" />
        </svg>
      );
    case 'gift':
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <rect x="9" y="18" width="30" height="22" rx="2" />
          <path d="M7 18h34M24 18v22M24 18c-4-1-9-3-9-7s5-4 9 1c4-5 9-5 9-1s-5 6-9 7z" />
        </svg>
      );
    default:
      return null;
  }
}

// ── Heart loader: solid heart breaks into 3 orbiting hearts, then fuses back ───
const HEART_VB = 'M12 20.6 C2.8 13.6 3.4 5.4 8 5.4 C10.4 5.4 12 7.9 12 7.9 C12 7.9 13.6 5.4 16 5.4 C20.6 5.4 21.2 13.6 12 20.6 Z';
export function HeartLoader({ color = '#1e3a5f', size = 96, className = '' }: { color?: string; size?: number; className?: string }) {
  const Heart = (cls: string, solid: boolean) => (
    <svg viewBox="0 0 24 24" className={cls} aria-hidden>
      <path d={HEART_VB} fill={solid ? color : 'none'} stroke={solid ? 'none' : color} strokeWidth={solid ? 0 : 2} strokeLinejoin="round" />
    </svg>
  );
  return (
    <div className={`hl ${className}`} style={{ width: size, height: size }} aria-hidden>
      <style>{`
        .hl { position: relative; }
        .hl svg { position: absolute; left: 50%; top: 50%; transform-origin: center; }
        .hl .hl-big   { width: 46%; margin-left: -23%; margin-top: -21%; }
        .hl .hl-small { width: 17%; margin-left: -8.5%;  margin-top: -8%;  }
        .hl .hl-sol { animation: hlSolid 2.6s infinite; }
        .hl .hl-s1 { animation: hlFly1 2.6s ease-in-out infinite; }
        .hl .hl-s2 { animation: hlFly2 2.6s ease-in-out infinite; }
        .hl .hl-s3 { animation: hlFly3 2.6s ease-in-out infinite; }

        @keyframes hlSolid {
          0%, 6%  { transform: scale(1); animation-timing-function: cubic-bezier(.6,.04,.98,.34); }
          13%     { transform: scale(0); }
          82%     { transform: scale(0); animation-timing-function: cubic-bezier(.34,1.56,.64,1); }
          100%    { transform: scale(1); }
        }
        /* heart 1 — bursts up, arcs over to the right, flips, returns */
        @keyframes hlFly1 {
          0%,10% { transform: translate(0,0) scale(0) rotate(0deg);       opacity: 0; }
          16%    { transform: translate(0,0) scale(.9) rotate(0deg);      opacity: 1; }
          37%    { transform: translate(-55%,-250%) scale(.9) rotate(-180deg); opacity: 1; }
          57%    { transform: translate(225%,-205%) scale(.9) rotate(-300deg); opacity: 1; }
          75%    { transform: translate(110%,-45%) scale(.8) rotate(-360deg); opacity: 1; }
          80%    { transform: translate(0,0) scale(.45) rotate(-360deg);  opacity: 0; }
          100%   { transform: translate(0,0) scale(0) rotate(-360deg);    opacity: 0; }
        }
        /* heart 2 — bursts left, arcs down, flips, returns */
        @keyframes hlFly2 {
          0%,12% { transform: translate(0,0) scale(0) rotate(0deg);       opacity: 0; }
          18%    { transform: translate(0,0) scale(.9) rotate(0deg);      opacity: 1; }
          39%    { transform: translate(-260%,-60%) scale(.9) rotate(170deg); opacity: 1; }
          59%    { transform: translate(-200%,190%) scale(.9) rotate(320deg); opacity: 1; }
          77%    { transform: translate(-70%,70%) scale(.8) rotate(360deg); opacity: 1; }
          82%    { transform: translate(0,0) scale(.45) rotate(360deg);   opacity: 0; }
          100%   { transform: translate(0,0) scale(0) rotate(360deg);     opacity: 0; }
        }
        /* heart 3 — bursts right, arcs down, flips, returns */
        @keyframes hlFly3 {
          0%,14% { transform: translate(0,0) scale(0) rotate(0deg);       opacity: 0; }
          20%    { transform: translate(0,0) scale(.9) rotate(0deg);      opacity: 1; }
          41%    { transform: translate(250%,-35%) scale(.9) rotate(-170deg); opacity: 1; }
          61%    { transform: translate(185%,205%) scale(.9) rotate(-320deg); opacity: 1; }
          79%    { transform: translate(60%,75%) scale(.8) rotate(-360deg); opacity: 1; }
          84%    { transform: translate(0,0) scale(.45) rotate(-360deg);  opacity: 0; }
          100%   { transform: translate(0,0) scale(0) rotate(-360deg);    opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hl .hl-sol, .hl .hl-s1, .hl .hl-s2, .hl .hl-s3 { animation: none; }
          .hl .hl-s1, .hl .hl-s2, .hl .hl-s3 { opacity: 0; }
        }
      `}</style>
      {Heart('hl-big hl-out', false)}
      {Heart('hl-big hl-sol', true)}
      {Heart('hl-small hl-s1', true)}
      {Heart('hl-small hl-s2', true)}
      {Heart('hl-small hl-s3', true)}
    </div>
  );
}

// ── Orchid sprig divider (refined botanical) ──────────────────────────────────
export function OrchidSprig({ color = '#2c4d77', className = '', flip = false }: { color?: string; className?: string; flip?: boolean }) {
  const leaf = (x: number, y: number, rx: number, ry: number, rot: number, o = 1) => (
    <g transform={`rotate(${rot} ${x} ${y})`} opacity={o}>
      <ellipse cx={x} cy={y} rx={rx} ry={ry} />
      <line x1={x - rx} y1={y} x2={x + rx} y2={y} strokeWidth="0.5" />
    </g>
  );
  const orchid = (x: number, y: number, s: number) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="-6" rx="3.2" ry="6" />
      <ellipse cx="-6.5" cy="-1.5" rx="6" ry="3" transform="rotate(-32)" />
      <ellipse cx="6.5" cy="-1.5" rx="6" ry="3" transform="rotate(32)" />
      <ellipse cx="-4" cy="4.5" rx="4.5" ry="2.6" transform="rotate(-18)" />
      <ellipse cx="4" cy="4.5" rx="4.5" ry="2.6" transform="rotate(18)" />
      <circle cx="0" cy="0.5" r="1.8" />
      <circle cx="0" cy="0.5" r="0.6" fill={color} />
    </g>
  );
  return (
    <svg viewBox="0 0 160 48" className={className} fill="none" stroke={color} strokeWidth="0.9" style={{ transform: flip ? 'scaleX(-1)' : undefined }}>
      {/* main curved stems */}
      <path d="M80 34 C 60 33, 40 30, 20 18" strokeLinecap="round" />
      <path d="M80 34 C 100 33, 120 30, 140 18" strokeLinecap="round" />
      <path d="M80 34 C 79 24, 80 16, 83 9" strokeLinecap="round" />
      {/* leaves along stems */}
      {leaf(54, 30, 6, 2.2, -16, 0.9)}
      {leaf(106, 30, 6, 2.2, 16, 0.9)}
      {leaf(40, 26, 5, 1.9, -22, 0.75)}
      {leaf(120, 26, 5, 1.9, 22, 0.75)}
      {leaf(28, 21, 4.4, 1.6, -30, 0.6)}
      {leaf(132, 21, 4.4, 1.6, 30, 0.6)}
      {leaf(83, 14, 3.6, 1.5, -8, 0.7)}
      {/* little buds */}
      <circle cx="20" cy="18" r="1.4" opacity="0.7" />
      <circle cx="140" cy="18" r="1.4" opacity="0.7" />
      <circle cx="84" cy="8" r="1.3" opacity="0.7" />
      {/* central orchid blossoms */}
      {orchid(72, 31, 0.62)}
      {orchid(88, 31, 0.78)}
    </svg>
  );
}
