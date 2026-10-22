import 'server-only';
import { SITE_URL } from './site';

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

/** Archives may have historical extensions/MIME labels; preserve bytes and identify their real encoding. */
function rasterType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | 'image/gif' | null {
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
    && String.fromCharCode(...bytes.subarray(12, 16)) === 'IHDR') return 'image/png';
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 10 && ['GIF87a', 'GIF89a'].includes(String.fromCharCode(...bytes.subarray(0, 6)))) return 'image/gif';
  // Satori in the installed Next.js cannot decode WebP. Use the existing card
  // background if unsupported/corrupt; never relabel, rewrite or replace an original.
  return null;
}

/** Share-card servers only fetch sources already allowed for application images. */
export function shareCardCoverUrl(source: string | null | undefined): URL | null {
  if (!source || /[\\\u0000-\u001f\u007f]/.test(source)) return null;
  try {
    const base = new URL(SITE_URL);
    const url = new URL(source, base.origin);
    if (url.username || url.password || url.hash || url.port || url.protocol !== 'https:') return null;
    const hosts = new Set(['images.unsplash.com', 'invitali.com', ...((process.env.ENKARTA_IMAGE_HOSTS || '').split(',').map(host => host.trim()).filter(host => /^[a-z0-9.-]+$/i.test(host) && host.includes('.')))]);
    try { hosts.add(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname); } catch { /* no storage configured */ }
    if (url.origin === base.origin) {
      // Local assets are public files, never application/API/preview routes.
      if (!/^\/(?:invitations|catalog|images|uploads)\/[^?#]+\.(?:png|jpe?g|webp|gif)$/i.test(url.pathname)) return null;
    } else if (!hosts.has(url.hostname)) return null;
    return url;
  } catch { return null; }
}

/** Covers and fonts cannot keep a WhatsApp image response waiting indefinitely. */
export async function shareCardAsset<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs = 4000): Promise<T | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work(controller.signal), new Promise<null>(resolve => {
      timer = setTimeout(() => { controller.abort(); resolve(null); }, timeoutMs);
    })]);
  } catch { return null; }
  finally { if (timer) clearTimeout(timer); }
}

async function readLimitedBytes(response: Response, maxBytes: number): Promise<Uint8Array | null> {
  if (!response.ok || !response.body || Number(response.headers.get('content-length')) > maxBytes) return null;
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function shareCardCover(source: string | null | undefined): Promise<string | null> {
  const url = shareCardCoverUrl(source);
  if (!url) return null;
  return shareCardAsset(async signal => {
    const response = await fetch(url, { signal, cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer' });
    const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || '';
    if (!IMAGE_TYPES.has(type)) return null;
    const bytes = await readLimitedBytes(response, 8 * 1024 * 1024);
    const encoding = bytes && rasterType(bytes);
    return bytes && encoding ? `data:${encoding};base64,${Buffer.from(bytes).toString('base64')}` : null;
  });
}

/** Fixed family request: event names are never sent to the font provider. */
export async function shareCardFont(family: 'Great Vibes' | 'Cormorant Garamond', weight?: 600): Promise<ArrayBuffer | null> {
  return shareCardAsset(async signal => {
    const familyQuery = family.replace(/ /g, '+') + (weight ? `:wght@${weight}` : '');
    const cssResponse = await fetch(`https://fonts.googleapis.com/css2?family=${familyQuery}`, { signal, cache: 'force-cache', redirect: 'error', referrerPolicy: 'no-referrer' });
    const cssBytes = await readLimitedBytes(cssResponse, 64 * 1024);
    if (!cssBytes) return null;
    const css = new TextDecoder().decode(cssBytes);
    const match = css.match(/src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)\s*format\(['"](?:opentype|truetype)['"]\)/);
    if (!match) return null;
    const fontUrl = new URL(match[1]);
    if (fontUrl.username || fontUrl.password || fontUrl.port || fontUrl.hostname !== 'fonts.gstatic.com') return null;
    const response = await fetch(fontUrl, { signal, cache: 'force-cache', redirect: 'error', referrerPolicy: 'no-referrer' });
    const bytes = await readLimitedBytes(response, 2 * 1024 * 1024);
    return bytes ? bytes.buffer as ArrayBuffer : null;
  });
}
