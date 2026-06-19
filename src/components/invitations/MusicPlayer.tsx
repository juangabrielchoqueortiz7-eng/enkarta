'use client';

// Reproductor de música de fondo para invitaciones por bloques: renderiza el
// <audio> (que EntryGate arranca al entrar) + un botón flotante para pausar/seguir.

import { useEffect, useRef, useState } from 'react';

export default function MusicPlayer({ src, color = '#1a1a1a' }: { src: string; color?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // Sincroniza el icono si EntryGate (u otro) arranca/pausa el audio.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    return () => { a.removeEventListener('play', onPlay); a.removeEventListener('pause', onPause); };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  return (
    <>
      <audio ref={audioRef} src={src} loop />
      <style>{`
        @keyframes ekEqBar { 0%,100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
        @keyframes ekMusicPulse { 0% { box-shadow: 0 0 0 0 ${color}55; } 70% { box-shadow: 0 0 0 12px ${color}00; } 100% { box-shadow: 0 0 0 0 ${color}00; } }
      `}</style>
      <button
        onClick={toggle}
        aria-label={playing ? 'Pausar música' : 'Reproducir música'}
        className="group fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
        style={{ background: color, color: '#fff', animation: playing ? 'ekMusicPulse 2.4s ease-out infinite' : 'none' }}
      >
        {/* Aro giratorio sutil cuando suena */}
        <span className="pointer-events-none absolute inset-0 rounded-full border border-white/25" style={{ animation: playing ? 'spin 7s linear infinite' : 'none' }} />
        {playing ? (
          // Mini-ecualizador animado
          <span className="flex items-end gap-[3px]" style={{ height: 18 }} aria-hidden>
            {[0, 1, 2, 3].map(i => (
              <span key={i} className="w-[3px] rounded-full bg-white" style={{ height: 18, transformOrigin: 'bottom', animation: `ekEqBar ${0.7 + i * 0.18}s ease-in-out ${i * 0.12}s infinite` }} />
            ))}
          </span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M9 17a3 3 0 11-2-2.83V5l11-2v10.17A3 3 0 1116 14V7L9 8.4V17z" />
          </svg>
        )}
      </button>
    </>
  );
}
