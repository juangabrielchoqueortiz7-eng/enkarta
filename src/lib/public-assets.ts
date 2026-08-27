import { realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.avif': 'image/avif', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.json': 'application/json',
};

/** Stat-only audit: never reads file contents or permits paths outside public/. */
export async function probeLocalPublicAsset(url: string) {
  if (!/^\/(?!\/)/.test(url) || /[\\\0]/.test(url)) throw new Error('Ruta pública inválida');
  const pathname = decodeURIComponent(url.split(/[?#]/)[0]);
  const contentType = TYPES[extname(pathname).toLowerCase()];
  if (!contentType || /[\\\0]/.test(pathname)) throw new Error('Tipo de recurso local no permitido');
  const root = await realpath(resolve(process.cwd(), 'public'));
  const target = resolve(root, `.${pathname}`);
  if (!target.startsWith(`${root}${sep}`)) throw new Error('Ruta fuera del directorio público');
  const canonical = await realpath(target);
  if (!canonical.startsWith(`${root}${sep}`)) throw new Error('Destino fuera del directorio público');
  const file = await stat(canonical);
  if (!file.isFile()) throw new Error('El recurso no es un archivo');
  return { ok: true, status: 200, bytes: file.size, contentType, durationMs: 0 };
}
