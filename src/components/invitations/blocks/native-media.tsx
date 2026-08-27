'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useBlockEdit } from './editable';
import { useMediaPreferences } from '@/lib/use-media-preferences';
import { usePageMotion } from '@/lib/scroll-motion';

export function isEmbeddedVideoUrl(value: string) {
  return /(?:youtube\.com|youtu\.be|vimeo\.com)/i.test(value);
}

export function isAnimatedMediaUrl(value: string) {
  return /\.(?:gif|webp)(?:[?#]|$)/i.test(value) || /^data:image\/(?:gif|webp)/i.test(value);
}

interface Props {
  source: string;
  poster?: string;
  alt: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  speed?: number;
  preload?: 'none' | 'metadata' | 'auto';
  fit?: 'cover' | 'contain';
  focal?: string;
  loading?: 'eager' | 'lazy';
  showToggle?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Reproductor compartido por el bloque de video y las portadas inmersivas.
 * Reproduce solo cuando está visible, se detiene fuera del viewport y respeta
 * `prefers-reduced-motion`. GIF/WebP se muestran como imagen preservando frames.
 */
export default function NativeMedia({
  source, poster, alt, autoplay = true, loop = true, muted = true,
  controls = false, speed = 1, preload = 'metadata', fit = 'cover',
  focal = '50% 50%', loading = 'lazy', showToggle = true, className = '', style,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const automaticPause = useRef(false);
  const { reducedMotion, saveData, pageVisible, ready } = useMediaPreferences();
  const { armed } = usePageMotion();
  const { editing } = useBlockEdit();
  const effectiveControls = editing || controls;
  const effectiveMuted = autoplay || muted;
  const playbackRate = Math.max(0.25, Math.min(2, speed));
  const [paused, setPaused] = useState(true);
  const [near, setNear] = useState(false);
  const [intent, setIntent] = useState<'auto' | 'play' | 'pause'>('auto');
  const [loadedSource, setLoadedSource] = useState('');
  const [failedSource, setFailedSource] = useState('');
  const animated = isAnimatedMediaUrl(source);
  const failed = failedSource === source;
  const automatic = autoplay && !editing && !reducedMotion && !saveData;
  const shouldPlay = ready && near && pageVisible && armed && !failed && intent !== 'pause' && (intent === 'play' || automatic);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    if (!('IntersectionObserver' in window)) { setNear(true); return; }
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { threshold: 0.01 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIntent('auto');
    setPaused(true);
    setFailedSource('');
  }, [source]);

  useEffect(() => {
    if (shouldPlay || (ready && near && pageVisible && armed && effectiveControls && !saveData && !reducedMotion)) setLoadedSource(source);
  }, [shouldPlay, ready, near, pageVisible, armed, effectiveControls, saveData, reducedMotion, source]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate, source]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!shouldPlay) {
      automaticPause.current = !video.paused;
      video.pause();
      return;
    }
    if (loadedSource === source) video.play().catch(() => setPaused(true));
  }, [shouldPlay, loadedSource, source]);

  const togglePlayback = () => {
    if (failed) { setFailedSource(''); setIntent('play'); setLoadedSource(source); videoRef.current?.load(); return; }
    if (animated) { setIntent(shouldPlay ? 'pause' : 'play'); return; }
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { setIntent('play'); setLoadedSource(source); if (loadedSource === source) video.play().catch(() => setPaused(true)); }
    else { setIntent('pause'); video.pause(); }
  };
  const playing = animated ? shouldPlay : !paused;
  const mediaStyle: React.CSSProperties = { objectFit: fit, objectPosition: focal };
  const still = poster && !isAnimatedMediaUrl(poster) ? poster : undefined;

  return (
    <div ref={containerRef} className={`relative ${className}`} style={style}>
      {animated ? (
        shouldPlay || still ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shouldPlay ? source : still} alt={alt} loading={loading} decoding="async" className="h-full w-full" style={mediaStyle} onError={() => setFailedSource(source)} />
        ) : <div role="img" aria-label={alt} className="flex h-full min-h-32 w-full items-center justify-center bg-black/10 p-6 text-center text-xs">{failed ? 'No se pudo cargar la animación' : 'Animación en pausa'}</div>
      ) : <video
        ref={videoRef}
        src={loadedSource === source && !failed ? source : undefined}
        poster={near || loading === 'eager' ? poster || undefined : undefined}
        loop={loop}
        muted={effectiveMuted}
        controls={effectiveControls}
        playsInline
        preload={near && !saveData && !reducedMotion && armed ? preload : 'none'}
        aria-label={alt}
        onPlay={() => { automaticPause.current = false; setPaused(false); if (effectiveControls) setIntent('play'); }}
        onPause={() => { setPaused(true); if (effectiveControls && !automaticPause.current) setIntent('pause'); automaticPause.current = false; }}
        onError={() => { setFailedSource(source); setPaused(true); }}
        className="h-full w-full"
        style={mediaStyle}
      />}
      {failed && !animated && <p role="status" className="absolute inset-x-3 top-3 rounded-lg bg-black/60 p-2 text-center font-outfit text-xs text-white">No se pudo cargar el video. Puedes reintentarlo.</p>}
      {showToggle && (!effectiveControls || animated || failed || loadedSource !== source) && (
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={failed ? 'Reintentar multimedia' : playing ? 'Pausar animación' : 'Reproducir animación'}
          className="absolute bottom-3 right-3 z-[3] flex h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-black/45 text-white shadow-lg backdrop-blur-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          {!playing
            ? <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M4 2.7v10.6c0 .8.9 1.3 1.6.8l7.2-5.3a1 1 0 000-1.6L5.6 1.9A1 1 0 004 2.7z" /></svg>
            : <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden><path d="M3.5 2.5h3v11h-3zm6 0h3v11h-3z" /></svg>}
        </button>
      )}
    </div>
  );
}
