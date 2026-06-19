// Compresión/redimensión de imágenes en el navegador antes de subir. Reduce el
// peso de los PNG/JPG grandes (p. ej. exportados de Canva) re-encodeando a WEBP
// (que conserva la transparencia). Si no mejora o falla, devuelve el original.

export async function compressImage(file: File, maxEdge = 1600, quality = 0.85): Promise<File> {
  if (typeof window === 'undefined' || typeof createImageBitmap === 'undefined') return file;
  if (!file.type.startsWith('image/')) return file;
  // SVG (vectorial) y GIF (animado) no se tocan.
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    // Ya es pequeña y ligera: no merece la pena recomprimir.
    if (scale === 1 && file.size < 600 * 1024) { bitmap.close?.(); return file; }
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close?.(); return file; }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/webp', quality));
    if (!blob || blob.size >= file.size) return file; // no mejora → original
    const name = file.name.replace(/\.\w+$/, '') + '.webp';
    return new File([blob], name, { type: 'image/webp' });
  } catch {
    return file;
  }
}
