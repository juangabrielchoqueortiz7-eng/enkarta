// Elementos subidos por el usuario (URLs de Supabase Storage) recordados en
// localStorage para reutilizarlos entre invitaciones ("Mis elementos"). Es solo
// una lista de accesos rápidos; el archivo real ya vive en el bucket.

export interface UserElement {
  url: string;
  createdAt: number;
}

const KEY = 'enkarta_user_elements';

export function listUserElements(): UserElement[] {
  if (typeof window === 'undefined') return [];
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? (v as UserElement[]) : [];
  } catch {
    return [];
  }
}

export function addUserElement(url: string): UserElement[] {
  if (!url) return listUserElements();
  const current = listUserElements().filter(e => e.url !== url);
  const next = [{ url, createdAt: Date.now() }, ...current].slice(0, 60);
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* cuota */ }
  return next;
}

export function removeUserElement(url: string): UserElement[] {
  const next = listUserElements().filter(e => e.url !== url);
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* cuota */ }
  return next;
}
