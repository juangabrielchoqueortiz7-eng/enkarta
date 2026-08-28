import type React from 'react';
import type { TemplateTokens } from '@/lib/types';
import { hasInvitationVisualSystem, resolveInvitationTypography } from '@/lib/marfil-visual-system';
import { useBlockDesign, useBlockTheme, type BlockTheme } from './theme';

export type InvitationMood = 'editorial' | 'balanced' | 'rounded';

export interface InvitationVisualSystem {
  mood: InvitationMood;
  cardRadius: number;
  fieldRadius: number;
  buttonRadius: number;
  mediaRadius: number;
  cardShadow?: string;
  buttonShadow?: string;
  border: string;
  card: React.CSSProperties;
  field: React.CSSProperties;
  media: React.CSSProperties;
  primaryButton: React.CSSProperties;
  secondaryButton: React.CSSProperties;
}

function shadowFor(theme: BlockTheme, value: TemplateTokens['shadow'], kind: 'card' | 'button'): string | undefined {
  if (!value || value === 'none') return undefined;
  if (kind === 'button') {
    if (value === 'strong') return `0 16px 40px color-mix(in srgb, ${theme.primary} 34%, transparent)`;
    if (value === 'medium') return `0 12px 30px color-mix(in srgb, ${theme.primary} 25%, transparent)`;
    return `0 9px 24px color-mix(in srgb, ${theme.primary} 18%, transparent)`;
  }
  if (value === 'strong') return '0 24px 64px rgba(27,21,14,0.18)';
  if (value === 'medium') return '0 17px 46px rgba(31,24,16,0.12)';
  return '0 11px 32px rgba(34,27,18,0.07)';
}

export function resolveInvitationVisualSystem(theme: BlockTheme, tokens: TemplateTokens = {}): InvitationVisualSystem {
  const isMarfil = hasInvitationVisualSystem(tokens);
  const action = resolveInvitationTypography(tokens, 'action');
  const controlBorder = isMarfil && tokens.cardBorder !== 'none' ? `1px solid color-mix(in srgb, ${theme.primary} 55%, ${theme.bg})` : undefined;
  const source = tokens.sectionRadius ?? 18;
  const mood: InvitationMood = source <= 12 ? 'editorial' : source >= 24 ? 'rounded' : 'balanced';
  const cardRadius = tokens.cardRadius ?? (mood === 'editorial' ? Math.max(7, source) : mood === 'rounded' ? Math.min(30, source) : Math.max(14, source));
  const fieldRadius = tokens.fieldRadius ?? (mood === 'editorial' ? 8 : mood === 'rounded' ? 16 : 12);
  const buttonRadius = tokens.buttonRadius ?? (mood === 'editorial' ? 8 : mood === 'rounded' ? 999 : 14);
  const mediaRadius = tokens.mediaRadius ?? (mood === 'editorial' ? Math.max(4, cardRadius - 4) : cardRadius);
  const borderMode = tokens.cardBorder ?? 'hairline';
  const borderColor = borderMode === 'accent'
    ? `color-mix(in srgb, ${theme.primary} 48%, ${theme.line})`
    : theme.line;
  const border = borderMode === 'none' ? '1px solid transparent' : `1px solid ${borderColor}`;
  const cardShadow = shadowFor(theme, tokens.shadow ?? 'soft', 'card');
  const buttonShadow = shadowFor(theme, tokens.shadow ?? 'soft', 'button');
  const buttonStyle = tokens.buttonStyle ?? 'solid';
  const primaryButton: React.CSSProperties = buttonStyle === 'outline'
    ? { color: theme.primary, background: 'transparent', border: `1px solid ${theme.primary}`, boxShadow: undefined }
    : buttonStyle === 'soft'
      ? { color: theme.primary, background: `color-mix(in srgb, ${theme.primary} 12%, ${theme.surface})`, border: `1px solid color-mix(in srgb, ${theme.primary} 26%, transparent)`, boxShadow: undefined }
      : { color: theme.onPrimary, background: theme.primary, border: '1px solid transparent', boxShadow: buttonShadow };

  return {
    mood,
    cardRadius,
    fieldRadius,
    buttonRadius,
    mediaRadius,
    cardShadow,
    buttonShadow,
    border,
    card: {
      border,
      borderRadius: cardRadius,
      background: `color-mix(in srgb, ${theme.surface} 90%, ${theme.bg})`,
      boxShadow: cardShadow,
    },
    field: {
      border: controlBorder ?? border,
      borderRadius: fieldRadius,
      background: `color-mix(in srgb, ${theme.surface} 88%, ${theme.bg})`,
      color: theme.text,
      boxShadow: tokens.shadow === 'none' ? undefined : '0 5px 18px rgba(30,24,16,0.035)',
      ...(isMarfil ? { ...resolveInvitationTypography(tokens, 'field'), minHeight: 48 } : {}),
    },
    media: {
      border,
      borderRadius: mediaRadius,
      background: theme.surface,
      boxShadow: cardShadow,
    },
    primaryButton: { ...primaryButton, borderRadius: buttonRadius, ...action, ...(isMarfil ? { minHeight: 48 } : {}) },
    secondaryButton: {
      color: theme.primary,
      background: `color-mix(in srgb, ${theme.surface} 84%, ${theme.bg})`,
      border: controlBorder ?? border,
      borderRadius: buttonRadius,
      ...action,
      ...(isMarfil ? { minHeight: 48 } : {}),
    },
  };
}

export function useInvitationVisualSystem(): InvitationVisualSystem {
  return resolveInvitationVisualSystem(useBlockTheme(), useBlockDesign());
}
