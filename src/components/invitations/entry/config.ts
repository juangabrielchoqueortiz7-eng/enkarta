// Per-template entrance ("sobre") configuration.
//
// Each premium invitation gets its own entrance scene + palette so the gate
// feels bespoke for that design (Azure → orchid envelope, Passport → passport
// booklet, Primicia → newspaper, Paradise → tropical arch, Obsidiana → dark
// luxe seal, etc.). The mechanics (open animation, music, scroll lock) live in
// EntryGate; this file only describes *what* each entrance looks like and how
// to pull the couple/date out of each template's data shape.

export type SceneKind = 'envelope' | 'passport' | 'newspaper' | 'arch' | 'luxe' | 'botanical' | 'curtain' | 'petals' | 'giftbox';
export type Ornament = 'orchid' | 'rose' | 'pampas' | 'leaf' | 'sage' | 'palm' | 'none';

export interface EntryTheme {
  scene: SceneKind;
  veil: string;        // gate background
  veil2?: string;      // optional second gradient stop (vignette)
  panel: string;       // envelope / card body
  panelEdge: string;   // overlay used for flap / inner shade (rgba over panel)
  ink: string;         // primary text on the panel
  soft: string;        // secondary text
  accent: string;      // seal, hairlines, button border
  accentText: string;  // text/initials on the accent (seal)
  script: string;      // couple names (script) color
  ornament: Ornament;
  tagline?: string;    // small word above the names
}

// Shared defaults keep every theme complete without repeating every field.
const ENVELOPE_BASE: Omit<EntryTheme, 'veil' | 'panel' | 'ink' | 'accent' | 'accentText' | 'script'> = {
  scene: 'envelope',
  panelEdge: 'rgba(0,0,0,0.06)',
  soft: 'rgba(0,0,0,0.45)',
  ornament: 'leaf',
  tagline: 'Estás invitado',
};

export const ENTRY_THEMES: Record<string, EntryTheme> = {
  azure: {
    ...ENVELOPE_BASE,
    scene: 'botanical',
    veil: '#eef4fb', veil2: '#e3edf8',
    panel: '#f4f8fd', ink: '#1e3a5f', soft: '#6982a3',
    accent: '#1e3a5f', accentText: '#f4f8fd', script: '#1e3a5f',
    ornament: 'orchid', tagline: 'Nos vamos a casar',
  },
  dolcevita: {
    ...ENVELOPE_BASE,
    veil: '#e9ece1', veil2: '#dfe4d6',
    panel: '#f6f4ea', ink: '#33563a', soft: '#4f7a52',
    accent: '#33563a', accentText: '#f1eedf', script: '#33563a',
    ornament: 'leaf',
  },
  grazia: {
    ...ENVELOPE_BASE,
    veil: '#f0e9da', veil2: '#e7dcc6',
    panel: '#fdfcf8', ink: '#2c2c27', soft: '#7c715a',
    accent: '#b6985f', accentText: '#f7f2e7', script: '#b6985f',
    ornament: 'pampas', tagline: 'La boda de',
  },
  euforia: {
    ...ENVELOPE_BASE,
    scene: 'giftbox',
    veil: '#ece2cf', veil2: '#e2d4ba',
    panel: '#f7f1e5', ink: '#5d5040', soft: '#8a7257',
    accent: '#8a7257', accentText: '#f4ecdd', script: '#b89a6a',
    ornament: 'sage', tagline: 'Una sorpresa para ti',
  },
  napoly: {
    ...ENVELOPE_BASE,
    veil: '#ece0d6', veil2: '#e1d1c4',
    panel: '#fbf8f3', ink: '#5a4d44', soft: '#8a766a',
    accent: '#6f6052', accentText: '#f3ece1', script: '#b98a86',
    ornament: 'rose',
  },
  allegria: {
    ...ENVELOPE_BASE,
    veil: '#e9ece5', veil2: '#dde2d6',
    panel: '#fbfbf8', ink: '#3a3a34', soft: '#7a7a72',
    accent: '#8c9a86', accentText: '#f2f4ee', script: '#6f7d69',
    ornament: 'sage',
  },
  provenza: {
    ...ENVELOPE_BASE,
    scene: 'curtain',
    veil: '#f3ece0', veil2: '#e7dbc8',
    // Los cortinajes son de olivo profundo: el texto va en crema/dorado para que
    // el monograma y los nombres se lean sobre la tela.
    panel: '#fbf6ee', ink: '#f7ebdf', soft: 'rgba(247,235,223,0.75)',
    accent: '#4b4c2d', accentText: '#f7ebdf', script: '#e0d3ae',
    ornament: 'leaf', tagline: 'Nuestra boda',
  },
  rosegold: {
    ...ENVELOPE_BASE,
    scene: 'petals',
    veil: '#f6e6dc', veil2: '#f0d4c5',
    panel: '#fdf6f1', ink: '#7a6157', soft: '#9a6e72',
    accent: '#b97f86', accentText: '#fff7f3', script: '#b97f86',
    ornament: 'pampas', tagline: 'Con todo nuestro amor',
  },
  carmesi: {
    ...ENVELOPE_BASE,
    scene: 'curtain',
    veil: '#ecdcc9', veil2: '#e3cdb2',
    panel: '#f6efe3', ink: '#4a3733', soft: '#8a6f57',
    accent: '#871a2f', accentText: '#f6efe3', script: '#b3924f',
    ornament: 'rose', tagline: 'Que comience la función',
  },
  // ── Distinct scenes ──
  passport: {
    scene: 'passport', ornament: 'palm',
    veil: '#34321f', veil2: '#26250f',
    panel: '#6e795b', panelEdge: 'rgba(0,0,0,0.14)',
    ink: '#ece6d6', soft: 'rgba(236,230,214,0.7)',
    accent: '#d9cdb5', accentText: '#403d2d', script: '#ece6d6',
    tagline: 'Boarding pass',
  },
  primicia: {
    scene: 'newspaper', ornament: 'none',
    veil: '#e6e3da', veil2: '#d8d4c8',
    panel: '#fdfcfa', panelEdge: 'rgba(0,0,0,0.08)',
    ink: '#1a1714', soft: '#3c372f',
    accent: '#1a1714', accentText: '#fdfcfa', script: '#1a1714',
    tagline: 'Última edición',
  },
  paradise: {
    scene: 'arch', ornament: 'palm',
    veil: '#34401f', veil2: '#222c12',
    panel: '#eef0e0', panelEdge: 'rgba(0,0,0,0.12)',
    ink: '#eef0e0', soft: 'rgba(238,240,224,0.72)',
    accent: '#c7b181', accentText: '#222c12', script: '#c7b181',
    tagline: 'Nuestra boda',
  },
  obsidiana: {
    scene: 'luxe', ornament: 'none',
    veil: '#0c0b09', veil2: '#161410',
    panel: '#16140f', panelEdge: 'rgba(255,255,255,0.05)',
    ink: '#ece6d6', soft: 'rgba(236,230,214,0.7)',
    accent: '#c6a86a', accentText: '#100f0c', script: '#e7d39b',
    tagline: 'Nos casamos',
  },
};

export const DEFAULT_THEME: EntryTheme = {
  ...ENVELOPE_BASE,
  veil: '#f1ece3', veil2: '#e7dfd2',
  panel: '#faf7f2', ink: '#2c2519', soft: '#8a7d6a',
  accent: '#b8975a', accentText: '#faf7f2', script: '#b8975a',
};

export function themeFor(template?: string): EntryTheme {
  return (template && ENTRY_THEMES[template]) || DEFAULT_THEME;
}

// ── Extract couple / date / cover from each template's data shape ─────────────
export interface EntryProps {
  names: string;
  initials: string;   // "L & M"
  dateLine?: string;
  coverImage?: string;
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function fmtIso(iso?: string): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return '';
  return `${dt.getDate()} de ${MESES[dt.getMonth()]}, ${dt.getFullYear()}`;
}

function namesOf(a?: string, b?: string): string {
  return [a, b].map((s) => (s ?? '').trim()).filter(Boolean).join(' & ');
}

function initialsOf(a?: string, b?: string, given?: [string, string]): string {
  if (given?.[0] && given?.[1]) return `${given[0]} & ${given[1]}`;
  const x = a?.trim()?.[0]?.toUpperCase() ?? '';
  const y = b?.trim()?.[0]?.toUpperCase() ?? '';
  return x && y ? `${x} & ${y}` : x || y;
}

/** Build gate props from any premium template's sample/data object. */
export function entryPropsFor(template: string, data: unknown): EntryProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = (data ?? {}) as any;
  const names = namesOf(d.groom, d.bride);
  const initials = initialsOf(d.groom, d.bride, d.initials);
  const coverImage = typeof d.coverImage === 'string' ? d.coverImage : undefined;

  let dateLine = '';
  switch (template) {
    case 'azure':
      dateLine = [d.month, d.day].filter(Boolean).join(' ') + (d.year ? ` · ${d.year}` : '');
      break;
    case 'primicia':
      dateLine = d.dateLine || '';
      break;
    case 'passport':
      dateLine = fmtIso(d.isoDate);
      break;
    case 'paradise':
      dateLine = d.dateLabel || fmtIso(d.isoDate);
      break;
    case 'obsidiana':
      dateLine = [d.dateDay, d.dateMonth].filter(Boolean).join(' de ');
      break;
    case 'grazia':
      dateLine = d.dateText || '';
      break;
    default: // dolcevita + clones (napoly, allegria, rosegold, euforia, carmesi, provenza)
      dateLine = [d.dateMonth, d.dateDay].filter(Boolean).join(' ') + (d.dateYear ? ` · ${d.dateYear}` : '');
  }

  return { names, initials, dateLine: dateLine.trim() || undefined, coverImage };
}
