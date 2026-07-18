/**
 * Dominio canónico del sitio: resuelve URLs relativas en los metadatos
 * (imágenes OG) y alimenta robots.txt/sitemap.xml.
 * Al comprar dominio propio: definir NEXT_PUBLIC_SITE_URL en Vercel.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://enkarta.vercel.app';

/** Keys públicas de /muestra/* (carmesi_v2 se publica como "carmesi"). */
export const MUESTRA_KEYS = [
  'azure', 'primicia', 'passport', 'paradise', 'obsidiana', 'dolcevita',
  'grazia', 'carmesi', 'napoly', 'euforia', 'rosegold', 'allegria',
] as const;
