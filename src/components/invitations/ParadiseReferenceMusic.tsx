'use client';

import { useEffect, useRef, useState } from 'react';
import { PARADISE_REFERENCE_LOTTIE_INSTANCES } from '@/lib/paradise-reference-assets';
import ParadiseReferenceIcon from './ParadiseReferenceIcon';

const REQUEST = 'enkarta:paradise-music-request';
const musicInstance = PARADISE_REFERENCE_LOTTIE_INSTANCES.music;

/** Invoke synchronously in the entry gesture, before timers or state updates. */
export function startParadiseReferenceMusic(root: HTMLElement | null): void {
  const audio = root?.querySelector<HTMLAudioElement>('audio[data-invitation-music]');
  if (!audio) return;
  const request = new CustomEvent(REQUEST, { cancelable: true, detail: { audio } });
  // The mounted player owns pending attempts and can acknowledge this gesture.
  if (!window.dispatchEvent(request)) return;
  if (!audio.paused) return;
  const source = audio.getAttribute('src');
  const failed = () => {
    if (root?.contains(audio) && audio.getAttribute('src') === source) {
      window.dispatchEvent(new CustomEvent('enkarta:audio-error', { detail: { audio } }));
    }
  };
  try { Promise.resolve(audio.play()).catch(failed); } catch { failed(); }
}

/** Isolated playback lifecycle for Paradise; never auto-starts on mounting. */
export default function ParadiseReferenceMusic({ src, preview = false, color = '#c9c67f', iconSize = 30, className, statusClassName }: {
  src: string;
  preview?: boolean;
  color?: string;
  iconSize?: number;
  className?: string;
  statusClassName?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const active = useRef(false);
  const generation = useRef(0);
  const wanted = useRef(false);
  const attempt = useRef<{ timer: ReturnType<typeof setTimeout> | null } | null>(null);
  const startRef = useRef<() => void>(() => {});
  const pauseRef = useRef<() => void>(() => {});

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || preview || !src) return;
    const current = ++generation.current;
    let disposed = false;
    let acceptsExternalStart = true;
    active.current = true;
    wanted.current = false;
    setPlaying(false); setError(false);
    const hidden = () => document.visibilityState === 'hidden' || document.hidden === true;
    const cancelAttempt = () => {
      if (attempt.current?.timer) clearTimeout(attempt.current.timer);
      attempt.current = null;
    };
    const pause = () => {
      acceptsExternalStart = false;
      wanted.current = false; cancelAttempt(); audio.pause();
      if (active.current && generation.current === current) setPlaying(false);
    };
    const failed = (token?: { timer: ReturnType<typeof setTimeout> | null }) => {
      if (!active.current || generation.current !== current || (token && attempt.current !== token)) return;
      pause(); setError(true);
    };
    const start = () => {
      if (!active.current || generation.current !== current || hidden()) return;
      if (attempt.current || !audio.paused) return;
      wanted.current = true;
      const token = { timer: null as ReturnType<typeof setTimeout> | null };
      attempt.current = token;
      token.timer = setTimeout(() => failed(token), 25000);
      try {
        Promise.resolve(audio.play()).then(() => {
          if (disposed) { if (audioRef.current !== audio || !active.current) audio.pause(); return; }
          if (!active.current || generation.current !== current) return;
          // A late play() fulfillment cannot undo a later pause request.
          if (attempt.current !== token) { if (!wanted.current) audio.pause(); return; }
          cancelAttempt();
          if (!wanted.current || hidden()) { pause(); return; }
          setPlaying(!audio.paused); setError(false);
        }, () => failed(token));
      } catch { failed(token); }
    };
    const onPlay = () => {
      if (hidden() || (!wanted.current && !acceptsExternalStart)) { pause(); return; }
      // Also observes a synchronous start from a generic cinematic EntryGate.
      acceptsExternalStart = false; wanted.current = true; setPlaying(true); setError(false);
    };
    const onPause = () => { acceptsExternalStart = false; wanted.current = false; cancelAttempt(); setPlaying(false); };
    const onError = () => failed();
    const onEntryError = (event: Event) => { if ((event as CustomEvent<{ audio?: HTMLAudioElement }>).detail?.audio === audio) failed(); };
    const onRequest = (event: Event) => {
      if ((event as CustomEvent<{ audio?: HTMLAudioElement }>).detail?.audio !== audio) return;
      event.preventDefault(); start();
    };
    const onVisibility = () => { if (hidden()) pause(); };
    startRef.current = start; pauseRef.current = pause;
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    window.addEventListener(REQUEST, onRequest);
    window.addEventListener('enkarta:audio-error', onEntryError);
    window.addEventListener('pagehide', pause);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      active.current = false; generation.current = current + 1; wanted.current = false; cancelAttempt();
      startRef.current = () => {}; pauseRef.current = () => {};
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      window.removeEventListener(REQUEST, onRequest);
      window.removeEventListener('enkarta:audio-error', onEntryError);
      window.removeEventListener('pagehide', pause);
      document.removeEventListener('visibilitychange', onVisibility);
      audio.pause();
    };
  }, [src, preview]);

  if (preview || !src) return null;
  const toggle = () => {
    if (attempt.current || !audioRef.current?.paused) pauseRef.current();
    else startRef.current();
  };
  return <>
    <audio key={src} ref={audioRef} src={src} data-invitation-music preload="none" loop />
    {error ? <p role="status" className={statusClassName}>La música no pudo iniciarse. Toca el botón para reintentar.</p> : null}
    <button type="button" className={className} onClick={toggle} aria-label={playing ? 'Pausar música' : 'Reproducir música'}
      aria-pressed={playing} data-paradise-reference-music={playing ? 'playing' : 'paused'}>
      <ParadiseReferenceIcon src={musicInstance.localPath} reverse={musicInstance.reverse} active={playing} size={iconSize} color={color} />
    </button>
  </>;
}
