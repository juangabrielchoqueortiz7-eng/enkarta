'use client';

import { useEffect, useState, useRef } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import { loadLottieById, loadLottieByPath, applyIconColors, tintLottie } from '@/lib/lottie-utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface LottieIconProps {
  /**
   * Icon id from the registry (e.g. "marriage", "balloons")
   * OR ruta completa: "/lottie/boda/marriage.json"
   */
  icon: string;

  /** Width & height in pixels (square). Default: 64 */
  size?: number;

  /**
   * Color overrides: { '#color_original': '#color_nuevo' }
   * Ejemplo: { '#000000': '#B8975A' }
   */
  colors?: Record<string, string>;

  /** Tinta todo el icono a un solo color (combina con la paleta de la plantilla). Se ignora si `colors` tiene entradas. */
  tint?: string;

  /** Velocidad de reproducción (1 = normal, 0.5 = mitad, 2 = doble). */
  speed?: number;

  /** Loop the animation. Default: true */
  loop?: boolean;

  /** Autoplay on mount. Default: true */
  autoplay?: boolean;

  /** Play animation on hover only. Default: false */
  playOnHover?: boolean;

  /** Lazy load — solo carga cuando es visible en pantalla. Default: true */
  lazy?: boolean;

  /** Additional CSS classes */
  className?: string;

  /** Called when animation data is loaded */
  onLoad?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LottieIcon({
  icon,
  size = 64,
  colors,
  tint,
  speed,
  loop = true,
  autoplay = true,
  playOnHover = false,
  lazy = true,
  className = '',
  onLoad,
}: LottieIconProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [animationData, setAnimationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(!lazy);
  const containerRef = useRef<HTMLDivElement>(null);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  // Lazy load: observar cuando el ícono entra en el viewport
  useEffect(() => {
    if (!lazy || isVisible) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { rootMargin: '100px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [lazy, isVisible]);

  // Cargar JSON solo cuando es visible
  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;
    setIsLoading(true);

    const load = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let json: any = null;

      if (icon.startsWith('/')) {
        json = await loadLottieByPath(icon);
      } else {
        json = await loadLottieById(icon);
      }

      if (!cancelled) {
        if (json && colors && Object.keys(colors).length > 0) {
          json = applyIconColors(json, colors);
        } else if (json && tint) {
          json = tintLottie(json, tint);
        }
        setAnimationData(json);
        setIsLoading(false);
        onLoad?.();
      }
    };

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [icon, isVisible, JSON.stringify(colors), tint]);

  // Velocidad de reproducción
  useEffect(() => {
    if (lottieRef.current && typeof speed === 'number') {
      lottieRef.current.setSpeed(speed);
    }
  }, [speed, animationData]);

  // Manejar playOnHover
  useEffect(() => {
    if (!playOnHover || !lottieRef.current) return;
    lottieRef.current.pause();
  }, [playOnHover, animationData]);

  const handleMouseEnter = () => { if (playOnHover) lottieRef.current?.play(); };
  const handleMouseLeave = () => { if (playOnHover) lottieRef.current?.stop(); };

  // Placeholder mientras carga
  if (isLoading || !animationData) {
    return (
      <div
        ref={containerRef}
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <div
          className="rounded-full border-2 border-gray-300 opacity-40 animate-pulse"
          style={{ width: size * 0.6, height: size * 0.6 }}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={playOnHover ? false : loop}
        autoplay={playOnHover ? false : autoplay}
        style={{ width: size, height: size }}
        rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
        onDOMLoaded={() => { if (typeof speed === 'number') lottieRef.current?.setSpeed(speed); }}
      />
    </div>
  );
}
