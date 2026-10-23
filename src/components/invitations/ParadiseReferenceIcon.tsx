'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import type { LottieRefCurrentProps } from 'lottie-react';
import { loadLottieByPath, tintLottie } from '@/lib/lottie-utils';
import { useMediaPreferences } from '@/lib/use-media-preferences';
import { usePageMotion } from '@/lib/scroll-motion';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

/** Original JSON with the reference's alternating forward/backward playback. */
export default function ParadiseReferenceIcon({ src, reverse = false, size = 80, className, style, active = true, color }: {
  src: string;
  reverse?: boolean;
  size?: number;
  className?: string;
  style?: CSSProperties;
  active?: boolean;
  color?: string;
}) {
  const container = useRef<HTMLSpanElement>(null);
  const lottie = useRef<LottieRefCurrentProps>(null);
  const direction = useRef<1 | -1>(1);
  const [seen, setSeen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState<{ source: string; value: Awaited<ReturnType<typeof loadLottieByPath>> } | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const { ready, reducedMotion, saveData, pageVisible } = useMediaPreferences();
  const { armed } = usePageMotion();
  const animation = loaded?.source === src ? loaded.value : null;
  const animate = active && visible && armed && ready && !reducedMotion && !saveData && pageVisible;
  const rendered = useMemo(() => animation && color ? tintLottie(animation, color) : animation, [animation, color]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    if (!('IntersectionObserver' in window)) { setSeen(true); setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setSeen(true);
    }, { threshold: 0.01 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!seen || !src) return;
    let canceled = false;
    setLoaded(null);
    setUnavailable(false);
    loadLottieByPath(src, { fallback: false }).then(value => {
      if (!canceled) { setLoaded({ source: src, value }); setUnavailable(!value); }
    }).catch(() => { if (!canceled) setUnavailable(true); });
    return () => { canceled = true; };
  }, [seen, src]);

  useEffect(() => {
    direction.current = 1;
    lottie.current?.setDirection(1);
    lottie.current?.goToAndStop(0, true);
  }, [src, reverse]);

  const sync = () => {
    lottie.current?.setSpeed(1);
    lottie.current?.setDirection(direction.current);
    if (animate) lottie.current?.play();
    else lottie.current?.pause();
  };
  useEffect(sync, [animate, reverse, rendered]);
  useEffect(() => () => { lottie.current?.pause(); }, []);

  const complete = () => {
    if (!reverse) return;
    direction.current = direction.current === 1 ? -1 : 1;
    lottie.current?.setDirection(direction.current);
    if (animate) lottie.current?.play();
    else lottie.current?.pause();
  };

  const onReady = () => {
    // Some originals begin with almost no visible strokes. When motion is
    // disabled, retain a real frame from that original instead of a substitute.
    // This runs only for a newly mounted animation, never when pausing playback.
    if (!animate) {
      const frames = Number(rendered?.op) - Number(rendered?.ip);
      if (Number.isFinite(frames) && frames > 0) lottie.current?.goToAndStop(frames / 2, true);
    }
    sync();
  };

  return <span ref={container} aria-hidden="true" className={className} data-paradise-original-icon={src}
    data-paradise-original-icon-state={unavailable ? 'unavailable' : rendered ? 'ready' : 'pending'}
    style={{ display: 'inline-flex', width: size, height: size, pointerEvents: 'none', flexShrink: 0, ...style }}>
    {rendered ? <Lottie lottieRef={lottie} animationData={rendered} loop={!reverse} autoplay={false}
      style={{ width: '100%', height: '100%' }} onDOMLoaded={onReady} onComplete={complete} rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }} /> : null}
  </span>;
}
