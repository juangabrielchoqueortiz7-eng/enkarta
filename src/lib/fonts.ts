import type { BuilderConfig } from '@/lib/types';

/**
 * Tipografía editable por invitación.
 *
 * Las clases globales (font-great, font-cinzel, font-playfair, font-cormorant,
 * font-lora, font-nunito) leen variables CSS con fallback a la fuente original
 * (ver tailwind.config.ts). `FontScope` define esas variables y carga la fuente
 * de Google Fonts elegida, por lo que el cambio aplica a las 12 plantillas y al
 * sistema de bloques sin tocar cada componente.
 *
 * Roles:
 *  --ek-font-script  → font-great            (nombres de la pareja)
 *  --ek-font-heading → font-cinzel/playfair  (títulos, fechas, números)
 *  --ek-font-body    → font-cormorant/lora/nunito (cuerpo de texto)
 */

export type FontRole = 'script' | 'heading' | 'body';

export interface FontOption {
  /** Nombre de familia tal como lo entiende CSS y Google Fonts */
  family: string;
  /** Parámetro de la API css2 de Google Fonts (familia + pesos) */
  gf: string;
  /** Fallback genérico */
  fallback: 'cursive' | 'serif' | 'sans-serif';
}

export const FONT_CATALOG: Record<FontRole, FontOption[]> = {
  script: [
    { family: 'Great Vibes',          gf: 'Great+Vibes',                        fallback: 'cursive' },
    { family: 'Dancing Script',       gf: 'Dancing+Script:wght@400;600',        fallback: 'cursive' },
    { family: 'Allura',               gf: 'Allura',                             fallback: 'cursive' },
    { family: 'Parisienne',           gf: 'Parisienne',                         fallback: 'cursive' },
    { family: 'Sacramento',           gf: 'Sacramento',                         fallback: 'cursive' },
    { family: 'Alex Brush',           gf: 'Alex+Brush',                         fallback: 'cursive' },
    { family: 'Pinyon Script',        gf: 'Pinyon+Script',                      fallback: 'cursive' },
    { family: 'Tangerine',            gf: 'Tangerine:wght@400;700',             fallback: 'cursive' },
    { family: 'Italianno',            gf: 'Italianno',                          fallback: 'cursive' },
    { family: 'Mrs Saint Delafield',  gf: 'Mrs+Saint+Delafield',                fallback: 'cursive' },
    { family: 'Rouge Script',         gf: 'Rouge+Script',                       fallback: 'cursive' },
    { family: 'Ephesis',              gf: 'Ephesis',                            fallback: 'cursive' },
    { family: 'Petit Formal Script',  gf: 'Petit+Formal+Script',                fallback: 'cursive' },
    { family: 'Herr Von Muellerhoff', gf: 'Herr+Von+Muellerhoff',               fallback: 'cursive' },
  ],
  heading: [
    { family: 'Cinzel',             gf: 'Cinzel:wght@400;500;600;700',                       fallback: 'serif' },
    { family: 'Playfair Display',   gf: 'Playfair+Display:ital,wght@0,400;0,600;0,700;1,400', fallback: 'serif' },
    { family: 'Cormorant Garamond', gf: 'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400', fallback: 'serif' },
    { family: 'Marcellus',          gf: 'Marcellus',                                          fallback: 'serif' },
    { family: 'Italiana',           gf: 'Italiana',                                           fallback: 'serif' },
    { family: 'Bodoni Moda',        gf: 'Bodoni+Moda:ital,wght@0,400;0,600;1,400',            fallback: 'serif' },
    { family: 'EB Garamond',        gf: 'EB+Garamond:ital,wght@0,400;0,600;1,400',            fallback: 'serif' },
    { family: 'Forum',              gf: 'Forum',                                              fallback: 'serif' },
    { family: 'Prata',              gf: 'Prata',                                              fallback: 'serif' },
    { family: 'Gilda Display',      gf: 'Gilda+Display',                                      fallback: 'serif' },
    { family: 'Libre Bodoni',       gf: 'Libre+Bodoni:ital,wght@0,400;0,600;1,400',           fallback: 'serif' },
    { family: 'Julius Sans One',    gf: 'Julius+Sans+One',                                    fallback: 'sans-serif' },
    { family: 'Cardo',              gf: 'Cardo:ital,wght@0,400;0,700;1,400',                  fallback: 'serif' },
  ],
  body: [
    { family: 'Cormorant Garamond', gf: 'Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400', fallback: 'serif' },
    { family: 'Lora',               gf: 'Lora:ital,wght@0,400;0,500;0,600;1,400',               fallback: 'serif' },
    { family: 'EB Garamond',        gf: 'EB+Garamond:ital,wght@0,400;0,600;1,400',              fallback: 'serif' },
    { family: 'Crimson Pro',        gf: 'Crimson+Pro:ital,wght@0,400;0,600;1,400',              fallback: 'serif' },
    { family: 'Nunito',             gf: 'Nunito:wght@300;400;500;600;700',                      fallback: 'sans-serif' },
    { family: 'Jost',               gf: 'Jost:ital,wght@0,300;0,400;0,500;1,400',               fallback: 'sans-serif' },
    { family: 'Montserrat',         gf: 'Montserrat:wght@300;400;500;600',                      fallback: 'sans-serif' },
    { family: 'Libre Baskerville',  gf: 'Libre+Baskerville:ital,wght@0,400;0,700;1,400',        fallback: 'serif' },
    { family: 'Spectral',           gf: 'Spectral:ital,wght@0,300;0,400;0,500;1,400',           fallback: 'serif' },
    { family: 'Raleway',            gf: 'Raleway:ital,wght@0,300;0,400;0,500;1,400',            fallback: 'sans-serif' },
    { family: 'Karla',              gf: 'Karla:ital,wght@0,300;0,400;0,500;1,400',              fallback: 'sans-serif' },
  ],
};

/** Fuente por defecto de cada rol (la que usan las plantillas de fábrica). */
export const DEFAULT_FAMILY: Record<FontRole, string> = {
  script: 'Great Vibes',
  heading: 'Cinzel',
  body: 'Cormorant Garamond',
};

const ALL_OPTIONS = [...FONT_CATALOG.script, ...FONT_CATALOG.heading, ...FONT_CATALOG.body];

export function findFont(family?: string): FontOption | undefined {
  if (!family) return undefined;
  return ALL_OPTIONS.find(f => f.family === family);
}

/** URL css2 de Google Fonts para un conjunto de familias del catálogo. */
export function googleFontsUrl(families: string[]): string | null {
  const gfs = Array.from(new Set(families))
    .map(f => findFont(f)?.gf)
    .filter((x): x is string => !!x);
  if (!gfs.length) return null;
  return `https://fonts.googleapis.com/css2?${gfs.map(g => `family=${g}`).join('&')}&display=swap`;
}

export interface ResolvedFonts {
  /** Variables CSS a aplicar en el contenedor de la invitación */
  vars: Record<string, string>;
  /** URL de Google Fonts a cargar (null si todo es default) */
  url: string | null;
}

/** Resuelve config.fontScript/fontHeading/fontBody a variables CSS + URL de carga. */
export function resolveFonts(config?: Pick<BuilderConfig, 'fontScript' | 'fontHeading' | 'fontBody'> | null): ResolvedFonts {
  const vars: Record<string, string> = {};
  const toLoad: string[] = [];
  const roles: [FontRole, string | undefined, string][] = [
    ['script', config?.fontScript, '--ek-font-script'],
    ['heading', config?.fontHeading, '--ek-font-heading'],
    ['body', config?.fontBody, '--ek-font-body'],
  ];
  for (const [role, family, cssVar] of roles) {
    const opt = findFont(family);
    if (!opt || opt.family === DEFAULT_FAMILY[role]) continue;
    vars[cssVar] = `'${opt.family}', ${opt.fallback}`;
    toLoad.push(opt.family);
  }
  return { vars, url: googleFontsUrl(toLoad) };
}
