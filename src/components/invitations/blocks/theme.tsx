'use client';

// Paleta semántica del sistema de bloques. A diferencia de las plantillas legacy
// (cada una con su `resolveXTheme`), los bloques son agnósticos de plantilla y se
// tematizan con `TemplateTheme` (config.theme). Los componentes leen estos colores
// vía `useBlockTheme()`.

import { createContext, useContext } from 'react';
import type { TemplateTheme } from '@/lib/types';

export interface BlockTheme {
  primary: string;     // títulos, trazos, botones
  primaryDeep: string; // bloques/paneles oscuros, pie
  text: string;        // texto principal
  muted: string;       // texto secundario
  line: string;        // líneas divisorias
  bg: string;          // fondo de página
  onPrimary: string;   // texto sobre bloques primarios
}

export const DEFAULT_BLOCK_THEME: BlockTheme = {
  primary: '#b8975a',
  primaryDeep: '#2c2519',
  text: '#3a342b',
  muted: '#8a7d6a',
  line: 'rgba(60,50,35,0.22)',
  bg: '#faf7f2',
  onPrimary: '#ffffff',
};

export function resolveBlockTheme(t?: TemplateTheme): BlockTheme {
  return {
    primary: t?.primary || DEFAULT_BLOCK_THEME.primary,
    primaryDeep: t?.primaryDeep || DEFAULT_BLOCK_THEME.primaryDeep,
    text: t?.text || DEFAULT_BLOCK_THEME.text,
    muted: t?.muted || DEFAULT_BLOCK_THEME.muted,
    line: t?.line || DEFAULT_BLOCK_THEME.line,
    bg: t?.bg || DEFAULT_BLOCK_THEME.bg,
    onPrimary: t?.onPrimary || DEFAULT_BLOCK_THEME.onPrimary,
  };
}

const Ctx = createContext<BlockTheme>(DEFAULT_BLOCK_THEME);
export const useBlockTheme = () => useContext(Ctx);
export const BlockThemeProvider = Ctx.Provider;
