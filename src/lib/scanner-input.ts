/** PNG/JPEG/WebP screenshots only. Decoding happens locally; no upload endpoint. */
export function validateQrImage(file: Pick<File, 'type' | 'size'>) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Selecciona una imagen PNG, JPG o WebP del pase.');
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('La imagen debe tener contenido y pesar como máximo 10 MB.');
}
export function qrLookup(text: string) {
  const value = text.trim();
  if (!value || value.length > 256 || /[\s\u0000-\u001f]/.test(value)) throw new Error('El QR no contiene un acceso válido de Enkarta.');
  return `token=${encodeURIComponent(value)}`;
}
