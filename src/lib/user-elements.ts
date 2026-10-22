import { builderLibraryKey } from './builder-library-key';
// Elementos subidos por el usuario (URLs de Supabase Storage) recordados en
// localStorage para reutilizarlos entre invitaciones ("Mis elementos"). Es solo
// una lista de accesos rápidos; el archivo real ya vive en el bucket.

export interface UserElement {
  url: string;
  createdAt: number;
}

const KEY = 'enkarta_user_elements';

export function listUserElements(scope = 'admin'): UserElement[] {
  if (typeof window === 'undefined') return [];
  try {
    const v = JSON.parse(window.localStorage.getItem(builderLibraryKey(KEY, scope)) || '[]');
    return Array.isArray(v) ? (v as UserElement[]) : [];
  } catch {
    return [];
  }
}

export function addUserElement(url: string, scope = 'admin'): UserElement[] {
  if (!url) return listUserElements(scope);
  const current = listUserElements(scope).filter(e => e.url !== url);
  const next = [{ url, createdAt: Date.now() }, ...current].slice(0, 60);
  try { window.localStorage.setItem(builderLibraryKey(KEY, scope), JSON.stringify(next)); } catch { /* cuota */ }
  return next;
}

export function removeUserElement(url: string, scope = 'admin'): UserElement[] {
  const next = listUserElements(scope).filter(e => e.url !== url);
  try { window.localStorage.setItem(builderLibraryKey(KEY, scope), JSON.stringify(next)); } catch { /* cuota */ }
  return next;
}
