import type { CSSProperties } from 'react';

export type ImageMask = 'none' | 'circle' | 'arch' | 'postal' | 'ticket' | 'polaroid' | 'organic';
export type ImageOverlayMode = 'solid' | 'gradient';
export type ImageOverlayBlend = 'normal' | 'multiply' | 'soft-light' | 'screen';

export interface ImageEffectSettings {
  aspect?: unknown;
  rounded?: unknown;
  focal?: unknown;
  zoom?: unknown;
  imageRotate?: unknown;
  imageFlipH?: unknown;
  imageFlipV?: unknown;
  brightness?: unknown;
  contrast?: unknown;
  imageSaturation?: unknown;
  grayscale?: unknown;
  sepia?: unknown;
  temperature?: unknown;
  blur?: unknown;
  mask?: unknown;
  overlayColor?: unknown;
  overlayOpacity?: unknown;
  overlayMode?: unknown;
  overlayBlend?: unknown;
}

export const IMAGE_ASPECTS: Record<string, string | undefined> = {
  original: undefined,
  square: '1 / 1',
  portrait: '4 / 5',
  story: '9 / 16',
  landscape: '16 / 9',
  classic: '4 / 3',
};

const finite = (value: unknown, fallback: number) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function imageMask(value: unknown): ImageMask {
  return ['circle', 'arch', 'postal', 'ticket', 'polaroid', 'organic'].includes(String(value))
    ? value as ImageMask
    : 'none';
}

export function imageAspect(settings: ImageEffectSettings): string | undefined {
  const mask = imageMask(settings.mask);
  if (mask === 'circle') return '1 / 1';
  return IMAGE_ASPECTS[String(settings.aspect || 'original')];
}

export function imageFilter(settings: ImageEffectSettings): string {
  return [
    `brightness(${finite(settings.brightness, 1)})`,
    `contrast(${finite(settings.contrast, 1)})`,
    `saturate(${finite(settings.imageSaturation, 1)})`,
    `grayscale(${finite(settings.grayscale, 0)})`,
    `sepia(${finite(settings.sepia, 0)})`,
    `blur(${Math.max(0, finite(settings.blur, 0))}px)`,
  ].join(' ');
}

export function imageTransform(settings: ImageEffectSettings): string {
  return [
    `scale(${Math.max(1, finite(settings.zoom, 1))})`,
    `rotate(${finite(settings.imageRotate, 0)}deg)`,
    `scaleX(${settings.imageFlipH ? -1 : 1})`,
    `scaleY(${settings.imageFlipV ? -1 : 1})`,
  ].join(' ');
}

export function imageFrameStyle(settings: ImageEffectSettings): CSSProperties {
  const mask = imageMask(settings.mask);
  const rounded = Math.max(0, finite(settings.rounded, 16));
  const shared: CSSProperties = {
    display: 'flex',
    overflow: 'hidden',
    background: '#eee8df',
  };

  if (mask === 'circle') return { ...shared, borderRadius: '9999px' };
  if (mask === 'arch') return { ...shared, borderRadius: '999px 999px 26px 26px' };
  if (mask === 'organic') return { ...shared, borderRadius: '42% 58% 62% 38% / 48% 37% 63% 52%' };
  if (mask === 'postal') {
    return {
      ...shared,
      clipPath: 'polygon(3% 0, 8% 2%, 13% 0, 18% 2%, 23% 0, 28% 2%, 33% 0, 38% 2%, 43% 0, 48% 2%, 53% 0, 58% 2%, 63% 0, 68% 2%, 73% 0, 78% 2%, 83% 0, 88% 2%, 93% 0, 97% 3%, 100% 8%, 98% 14%, 100% 20%, 98% 26%, 100% 32%, 98% 38%, 100% 44%, 98% 50%, 100% 56%, 98% 62%, 100% 68%, 98% 74%, 100% 80%, 98% 86%, 100% 92%, 97% 97%, 92% 100%, 87% 98%, 82% 100%, 77% 98%, 72% 100%, 67% 98%, 62% 100%, 57% 98%, 52% 100%, 47% 98%, 42% 100%, 37% 98%, 32% 100%, 27% 98%, 22% 100%, 17% 98%, 12% 100%, 7% 98%, 3% 97%, 0 92%, 2% 86%, 0 80%, 2% 74%, 0 68%, 2% 62%, 0 56%, 2% 50%, 0 44%, 2% 38%, 0 32%, 2% 26%, 0 20%, 2% 14%, 0 8%)',
    };
  }
  if (mask === 'ticket') {
    return {
      ...shared,
      clipPath: 'polygon(0 0, 100% 0, 100% 38%, 96% 42%, 96% 58%, 100% 62%, 100% 100%, 0 100%, 0 62%, 4% 58%, 4% 42%, 0 38%)',
      borderRadius: 8,
    };
  }
  if (mask === 'polaroid') {
    return {
      ...shared,
      overflow: 'visible',
      padding: '10px 10px 30px',
      borderRadius: 4,
      background: '#fffefb',
      boxShadow: '0 16px 40px rgba(43,35,25,.18)',
    };
  }
  return { ...shared, borderRadius: rounded };
}

export function imageViewportStyle(settings: ImageEffectSettings): CSSProperties {
  const mask = imageMask(settings.mask);
  return {
    position: 'relative',
    flex: '1 1 auto',
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
    borderRadius: mask === 'polaroid' ? 2 : 'inherit',
    background: '#e9e3db',
  };
}

export function imageTemperatureStyle(settings: ImageEffectSettings): CSSProperties | undefined {
  const temperature = Math.max(-100, Math.min(100, finite(settings.temperature, 0)));
  if (temperature === 0) return undefined;
  return {
    background: temperature > 0 ? '#ff8a45' : '#4c96ff',
    opacity: Math.abs(temperature) / 260,
    mixBlendMode: 'soft-light',
  };
}

export function imageColorOverlayStyle(settings: ImageEffectSettings): CSSProperties | undefined {
  const opacity = Math.max(0, Math.min(1, finite(settings.overlayOpacity, 0)));
  if (!settings.overlayColor || opacity === 0) return undefined;
  const color = String(settings.overlayColor);
  const mode: ImageOverlayMode = settings.overlayMode === 'gradient' ? 'gradient' : 'solid';
  const blend = ['multiply', 'soft-light', 'screen'].includes(String(settings.overlayBlend))
    ? settings.overlayBlend as ImageOverlayBlend
    : 'normal';
  return {
    background: mode === 'gradient'
      ? `linear-gradient(180deg, transparent 4%, ${color} 100%)`
      : color,
    opacity,
    mixBlendMode: blend,
  };
}
