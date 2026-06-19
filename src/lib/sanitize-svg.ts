// Saneador de SVG ligero (sin dependencias) para los elementos que sube el
// cliente desde Canva. Los SVG subidos se sirven vía <img> (el navegador NO
// ejecuta scripts en un SVG referenciado así), por lo que esto es defensa en
// profundidad: por si alguien abre el archivo público directamente.
//
// Elimina: <script>, <foreignObject>, manejadores de eventos on*=, y URIs
// peligrosas (javascript:, data:text/html, vbscript:) en cualquier atributo.

const TAG_BLOCKLIST = /<\s*(script|foreignObject|iframe|embed|object|animate|set|handler)\b[\s\S]*?(<\s*\/\s*\1\s*>|\/>)/gi;
const SELF_CLOSING_BLOCKLIST = /<\s*(script|foreignObject|iframe|embed|object)\b[^>]*\/\s*>/gi;
const EVENT_HANDLERS = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const DANGEROUS_URI = /(href|xlink:href|src)\s*=\s*("|')\s*(javascript:|data:text\/html|vbscript:)[^"']*\2/gi;
const STYLE_EXPRESSION = /style\s*=\s*("[^"]*expression[^"]*"|'[^']*expression[^']*')/gi;

/** Devuelve el SVG saneado, o null si no parece un SVG válido. */
export function sanitizeSvg(input: string): string | null {
  if (!input || input.length > 512 * 1024) return null; // límite ~512 KB de markup
  let svg = input.replace(/^﻿/, '').trim();
  // Quita declaraciones DOCTYPE/ENTITY (vector de XXE / billion laughs).
  svg = svg.replace(/<!DOCTYPE[\s\S]*?>/gi, '').replace(/<!ENTITY[\s\S]*?>/gi, '');
  svg = svg.replace(/<\?xml[\s\S]*?\?>/gi, '');
  if (!/<svg[\s>]/i.test(svg)) return null;
  svg = svg
    .replace(TAG_BLOCKLIST, '')
    .replace(SELF_CLOSING_BLOCKLIST, '')
    .replace(EVENT_HANDLERS, '')
    .replace(DANGEROUS_URI, '')
    .replace(STYLE_EXPRESSION, '');
  return svg.trim();
}
