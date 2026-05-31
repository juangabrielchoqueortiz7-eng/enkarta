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
    case 'church': // gothic arch + couple + cross
      return (
        <svg viewBox="0 0 48 52" className={className} {...common}>
          <path d="M24 3v7M21 6h6" />
          <path d="M12 49V26C12 16 17.5 11 24 11s12 5 12 15v23" />
          <path d="M12 49h24" />
          {/* couple */}
          <circle cx="20.5" cy="29" r="2.3" />
          <path d="M20.5 31.5c-1.6 1.4-2.2 4-2.4 6.6M20.5 31.5c1.4 1.2 2 3 2.4 5" />
          <circle cx="28" cy="29" r="2.3" />
          <path d="M28 31.5c1.5 1.4 2 4 1.6 7M28 31.5 24.8 42h6.4z" />
          <path d="M22.5 34.5h3" />
        </svg>
      );
    case 'cheers': // clinking flutes + sparkle
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <path d="M15 9 21 11.5 19.3 22c-.2 1.1-1.6 1.1-1.8 0L15 9Z" />
          <path d="M33 9 27 11.5 28.7 22c.2 1.1 1.6 1.1 1.8 0L33 9Z" />
          <path d="M18.4 22.2 18.9 33M29.6 22.2 29.1 33" />
          <path d="M15.5 34h6.5M26 34h6.5" />
          {/* sparkle */}
          <path d="M24 4v4M21 6l1.5 1.4M27 6l-1.5 1.4M24 9.5l0 1.5" opacity="0.9" />
        </svg>
      );
    case 'dance': // dancing couple
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          <circle cx="18" cy="12" r="2.6" />
          <path d="M18 14.6 18 27M18 18.5 26 22.5M18 27 14.5 40M18 27 21 39" />
          <circle cx="30.5" cy="11" r="2.6" />
          <path d="M30.5 13.6 30.5 23M30.5 17.5 23 21M30.5 23 24.5 41h12.5z" />
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
    case 'dress': // suit + dress on hangers
      return (
        <svg viewBox="0 0 48 48" className={className} {...common}>
          {/* suit hanger */}
          <path d="M15 9c0-1.6 2.4-1.6 2.4 0" />
          <path d="M10 13 16.2 9.6 22.4 13" />
          <path d="M12 13 12 39 20.4 39 20.4 13" />
          <path d="M16.2 13 13.6 19 16.2 21 18.8 19 16.2 13" />
          {/* dress hanger */}
          <path d="M31 9c0-1.6 2.4-1.6 2.4 0" />
          <path d="M26 13 32.2 9.6 38.4 13" />
          <path d="M32.2 13 32.2 19M28.6 19h7.2" />
          <path d="M32.2 19 27 39 37.4 39 32.2 19" />
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
