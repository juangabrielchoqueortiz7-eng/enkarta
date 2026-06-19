'use client';

// Efectos decorativos compartidos (clientes): confeti de pétalos para momentos
// de celebración (RSVP confirmado) y estela de cursor en escritorio. Ambos
// respetan `prefers-reduced-motion` y se renderizan vía portal a <body>.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'framer-motion';

// ── Confeti de pétalos (one-shot) ─────────────────────────────────────────────
// Lluvia breve de pétalos que caen desde arriba. Se monta cuando ocurre el
// momento (p. ej. confirmar asistencia) y se desvanece solo.
export function PetalBurst({ color = '#b8975a', count = 26, duration = 3200 }: {
  color?: string;
  count?: number;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setTimeout(() => setGone(true), duration);
    return () => clearTimeout(id);
  }, [duration]);

  if (reduced || gone || !mounted) return null;

  // Tonos derivados del color base para dar variedad.
  const tones = [color, `${color}cc`, '#ffffff', `${color}99`];
  const petals = Array.from({ length: count }, (_, i) => ({
    left: `${(i * 53 + (i % 7) * 6) % 100}%`,
    delay: (i % 10) * 0.12,
    dur: 2.2 + (i % 6) * 0.45,
    size: 8 + (i % 5) * 4,
    drift: (i % 2 ? 1 : -1) * (40 + (i % 4) * 26),
    rot: (i % 2 ? 1 : -1) * (220 + (i % 3) * 140),
    color: tones[i % tones.length],
    round: i % 3 === 0 ? '50%' : '50% 0 50% 50%',
  }));

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden" aria-hidden>
      <style>{`@keyframes ekBurstFall {
        0% { transform: translateY(-12vh) translateX(0) rotate(0deg) scale(1); opacity: 0; }
        10% { opacity: 1; }
        100% { transform: translateY(112vh) translateX(var(--dx)) rotate(var(--rot)) scale(.85); opacity: 0; }
      }`}</style>
      {petals.map((p, i) => (
        <span key={i} style={{
          position: 'absolute', left: p.left, top: 0, width: p.size, height: p.size * 1.25,
          background: p.color, borderRadius: p.round,
          ['--dx' as string]: `${p.drift}px`, ['--rot' as string]: `${p.rot}deg`,
          animation: `ekBurstFall ${p.dur}s ${p.delay}s cubic-bezier(0.3,0.1,0.5,1) forwards`,
          opacity: 0, boxShadow: `0 1px 3px ${color}44`,
        }} />
      ))}
    </div>,
    document.body,
  );
}

// ── Estela de cursor (solo escritorio con puntero fino) ───────────────────────
// Pequeños destellos/pétalos que siguen al cursor. Opt-in desde la decoración.
export function CursorTrail({ color = '#b8975a', shape = 'sparkle' }: {
  color?: string;
  shape?: 'sparkle' | 'petal' | 'heart';
}) {
  const reduced = useReducedMotion();
  const layer = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Solo en dispositivos con puntero fino (mouse/trackpad).
    if (reduced) return;
    if (!window.matchMedia?.('(pointer: fine)').matches) return;
    setEnabled(true);
  }, [reduced]);

  useEffect(() => {
    if (!enabled) return;
    let last = 0;
    const spawn = (x: number, y: number) => {
      const el = layer.current;
      if (!el) return;
      const dot = document.createElement('span');
      const size = 8 + Math.random() * 8;
      dot.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${size}px;height:${size}px;pointer-events:none;will-change:transform,opacity;transform:translate(-50%,-50%);`;
      dot.innerHTML = shape === 'heart'
        ? `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}"><path d="M12 21C6 17 3 13 3 8.5 3 5.4 5.4 3 8.5 3c1.7 0 3.2.8 4.5 2 1.3-1.2 2.8-2 4.5-2C20.6 3 23 5.4 23 8.5 23 13 18 17 12 21z"/></svg>`
        : shape === 'petal'
          ? `<span style="display:block;width:100%;height:100%;background:${color};border-radius:50% 0 50% 50%"></span>`
          : `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}"><path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2z"/></svg>`;
      el.appendChild(dot);
      const dx = (Math.random() - 0.5) * 30;
      dot.animate(
        [
          { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 0.9 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + 26px)) scale(0.2) rotate(80deg)`, opacity: 0 },
        ],
        { duration: 850, easing: 'cubic-bezier(0.4,0,0.6,1)' },
      ).onfinish = () => dot.remove();
    };
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - last < 45) return; // limita la frecuencia
      last = now;
      spawn(e.clientX, e.clientY);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [enabled, color, shape]);

  if (!enabled) return null;
  return createPortal(<div ref={layer} className="pointer-events-none fixed inset-0 z-[90]" aria-hidden />, document.body);
}
