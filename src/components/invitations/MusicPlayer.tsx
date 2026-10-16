'use client';

// Reproductor de música de fondo para invitaciones por bloques: renderiza el
// <audio> (que EntryGate arranca al entrar) + un botón flotante para pausar/seguir.

import { useEffect, useRef, useState } from 'react';

export default function MusicPlayer({ src, color = '#1a1a1a' }: { src: string; color?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);

  // Sincroniza el icono si EntryGate (u otro) arranca/pausa el audio.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => { setPlaying(true); setError(false); };
    const onPause = () => setPlaying(false);
    const onError = () => setError(true);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('error', onError);
    window.addEventListener('enkarta:audio-error', onError);
    return () => { a.removeEventListener('play', onPlay); a.removeEventListener('pause', onPause); a.removeEventListener('error', onError); window.removeEventListener('enkarta:audio-error', onError); };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setError(true));
    else a.pause();
  };

  return (
    <>
      <audio ref={audioRef} data-invitation-music src={src} preload="none" loop />
      {error && <p role="status" className="fixed bottom-20 right-5 z-50 max-w-[240px] rounded-xl bg-white p-3 text-xs text-[#30291f] shadow-lg">La música no pudo iniciarse. Toca el botón para reintentar.</p>}
      <style>{`
        @keyframes ekEqBar { 0%,100% { transform: scaleY(0.35); } 50% { transform: scaleY(1); } }
        @keyframes ekMusicPulse { 0% { box-shadow: 0 0 0 0 ${color}55; } 70% { box-shadow: 0 0 0 12px ${color}00; } 100% { box-shadow: 0 0 0 0 ${color}00; } }
      `}</style>
      <button
        onClick={toggle}
        aria-label={playing ? 'Pausar música' : 'Reproducir música'}
        className="group fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110"
        style={{ background: color, color: '#fff', bottom: 'max(20px, env(safe-area-inset-bottom))', animation: playing ? 'ekMusicPulse 2.4s ease-out infinite' : 'none' }}
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
