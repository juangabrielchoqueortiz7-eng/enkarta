'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import type { LottieRefCurrentProps } from 'lottie-react';
import type { BuilderConfig } from '@/lib/types';
import { CAPITULO_ORIGINALS } from '@/lib/capitulo-assets';
import { colorCapituloIcon } from '@/lib/capitulo-icon-palette';
import { originalInvitationAsset } from '@/lib/invitation-assets';
import { loadLottieByPath } from '@/lib/lottie-utils';
import { useMediaPreferences } from '@/lib/use-media-preferences';
import { usePageMotion } from '@/lib/scroll-motion';
import { paradiseReferenceHref } from './ParadiseReferenceSections';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

/** Original bytes remain archived; palette, scale and playback belong to this instance. */
export default function CapituloOriginalIcon({ role, config, sectionKey = role, src, colors, speed, size = 84, className, style, reverse, active = true }: {
  role: keyof typeof CAPITULO_ORIGINALS;
  config: BuilderConfig;
  sectionKey?: string;
  src?: string;
  colors?: Record<string, string>;
  speed?: number;
  size?: number;
  className?: string;
  style?: CSSProperties;
  reverse?: boolean;
  active?: boolean;
}) {
  const original = CAPITULO_ORIGINALS[role];
  // Nullish selection is deliberate: a host who clears an icon keeps it cleared.
  const selected = src ?? config.sectionIcons?.[sectionKey] ?? original.localPath;
  const source = paradiseReferenceHref(originalInvitationAsset(selected));
  const json = !!source && /\.json(?:[?#]|$)/i.test(source);
  const image = !!source && /\.(?:png|jpe?g|webp|gif|svg)(?:[?#]|$)/i.test(source);
  const alternate = reverse ?? original.reverse;
  const selectedSpeed = speed ?? config.sectionIconSpeeds?.[sectionKey] ?? 1;
  const playbackSpeed = Number.isFinite(selectedSpeed) && selectedSpeed > 0 ? Math.min(4, Math.max(.1, selectedSpeed)) : 1;
  const selectedScale = config.iconScale ?? 1;
  const scale = Number.isFinite(selectedScale) && selectedScale >= 0 ? Math.min(4, selectedScale) : 1;
  const palette = colors ?? config.sectionIconColors?.[sectionKey];
  const container = useRef<HTMLSpanElement>(null);
  const lottie = useRef<LottieRefCurrentProps>(null);
  const direction = useRef<1 | -1>(1);
  const [seen, setSeen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState<{ source: string; value: Awaited<ReturnType<typeof loadLottieByPath>> } | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [imageState, setImageState] = useState<{ source: string; ready: boolean } | null>(null);
  const currentSource = useRef(source); currentSource.current = source;
  const { ready, reducedMotion, saveData, pageVisible } = useMediaPreferences();
  const { armed } = usePageMotion();
  const animation = loaded && loaded.source === source ? loaded.value : null;
  const animate = active && visible && armed && ready && !reducedMotion && !saveData && pageVisible;
  const rendered = useMemo(() => {
    if (!animation) return null;
    return colorCapituloIcon(animation, { iconColor: config.iconColor, colors: palette });
  }, [animation, palette, config.iconColor]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    if (!('IntersectionObserver' in window)) { setSeen(true); setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setSeen(true);
    }, { threshold: .01 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [source]);

  useEffect(() => {
    if (!seen || !source || !json) return;
    let canceled = false;
    setLoaded(null);
    setUnavailable(false);
    loadLottieByPath(source, { fallback: false }).then(value => {
      if (!canceled) { setLoaded({ source, value }); setUnavailable(!value); }
    }).catch(() => { if (!canceled) setUnavailable(true); });
    return () => { canceled = true; };
  }, [seen, source, json]);

  useEffect(() => {
    direction.current = 1;
    lottie.current?.setDirection(1);
    lottie.current?.goToAndStop(0, true);
  }, [source, alternate]);

  const sync = () => {
    lottie.current?.setSpeed(playbackSpeed);
    lottie.current?.setDirection(direction.current);
    if (animate) lottie.current?.play();
    else lottie.current?.pause();
  };
  useEffect(sync, [animate, alternate, rendered, playbackSpeed]);
  useEffect(() => () => { lottie.current?.pause(); }, []);
  const complete = () => {
    if (!alternate) return;
    direction.current = direction.current === 1 ? -1 : 1;
    lottie.current?.setDirection(direction.current);
    if (animate) lottie.current?.play();
    else lottie.current?.pause();
  };
  const onReady = () => {
    if (!animate) {
      const frames = Number(rendered?.op) - Number(rendered?.ip);
      if (Number.isFinite(frames) && frames > 0) lottie.current?.goToAndStop(frames / 2, true);
    }
    sync();
  };
  if (!source || (!json && !image) || scale === 0) return null;
  const state = image ? imageState?.source === source ? imageState.ready ? 'ready' : 'unavailable' : 'pending' : unavailable ? 'unavailable' : rendered ? 'ready' : 'pending';
  return <span ref={container} aria-hidden="true" className={className}
    data-capitulo-original-icon={source} data-capitulo-original-icon-role={role}
    data-capitulo-original-icon-state={state}
    style={{ display: 'inline-flex', width: size * scale, height: size * scale, maxWidth: '100%', pointerEvents: 'none', flexShrink: 0, ...style }}>
    {image ? <img src={source} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      onLoad={() => { if (currentSource.current === source) setImageState({ source, ready: true }); }}
      onError={() => { if (currentSource.current === source) setImageState({ source, ready: false }); }} /> : rendered ? <Lottie lottieRef={lottie} animationData={rendered} loop={!alternate} autoplay={false}
      style={{ width: '100%', height: '100%' }} onDOMLoaded={onReady} onComplete={complete}
      rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }} /> : null}
  </span>;
}
