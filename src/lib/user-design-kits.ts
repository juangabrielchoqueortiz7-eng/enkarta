import type { InvitationParsed } from './types';
import type { DesignKit } from './design-kits';
import { decorForTemplate, tokensForTemplate, themeForTemplate } from './template-themes';

const STORAGE_KEY = 'enkarta_user_design_kits_v1';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function listUserDesignKits(): DesignKit[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed as DesignKit[] : [];
  } catch {
    return [];
  }
}

function persist(kits: DesignKit[]) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(kits)); } catch { /* cuota del navegador */ }
}

export function saveUserDesignKit(name: string, data: InvitationParsed): DesignKit[] {
  const cfg = data.config ?? {};
  const theme = { ...themeForTemplate(data.template), ...(cfg.theme ?? {}) };
  const tokens = { ...tokensForTemplate(data.template), ...(cfg.tokens ?? {}), typeScale: { ...(tokensForTemplate(data.template).typeScale ?? {}), ...(cfg.tokens?.typeScale ?? {}) } };
  const kit: DesignKit = {
    id: `custom-kit-${Date.now().toString(36)}`,
    name: name.trim() || 'Mi estilo',
    vibe: 'Kit personalizado guardado desde esta invitación',
    family: 'Personalizado',
    official: false,
    eventTypes: [data.type],
    templates: [data.template],
    colors: [
      theme.bg || data.color_secondary,
      theme.text || data.color_accent,
      theme.primary || data.color_primary,
      theme.accent || theme.primaryDeep || data.color_primary,
      theme.surface || '#ffffff',
      theme.line || '#ded8cf',
    ],
    theme,
    tokens,
    fonts: { fontScript: cfg.fontScript, fontHeading: cfg.fontHeading, fontBody: cfg.fontBody },
    decor: clone(cfg.decor ?? decorForTemplate(data.template) ?? { background: 'solid', dividers: 'line' }),
    motion: clone(cfg.motion ?? { preset: 'elegant', intensity: 0.7, tempo: 'balanced' }),
    elements: { iconColor: cfg.iconColor || theme.primary || data.color_primary, iconScale: cfg.iconScale ?? 1 },
  };
  const next = [kit, ...listUserDesignKits()].slice(0, 30);
  persist(next);
  return next;
}

export function deleteUserDesignKit(id: string): DesignKit[] {
  const next = listUserDesignKits().filter(kit => kit.id !== id);
  persist(next);
  return next;
}
