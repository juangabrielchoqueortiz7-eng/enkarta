import { builderLibraryKey } from './builder-library-key';
// "Packs de decoración" guardados por el usuario: un conjunto de elementos
// flotantes (esquineros/adornos) ya colocados, para reutilizarlo en otras
// invitaciones con un clic. Se guarda en localStorage (solo bloques 'element').

import type { Block } from './types';

export interface UserDecorPack {
  id: string;
  name: string;
  createdAt: number;
  blocks: Block[];
}

const KEY = 'enkarta_user_decor_packs';

export function listUserPacks(scope = 'admin'): UserDecorPack[] {
  if (typeof window === 'undefined') return [];
  try {
    const v = JSON.parse(window.localStorage.getItem(builderLibraryKey(KEY, scope)) || '[]');
    return Array.isArray(v) ? (v as UserDecorPack[]) : [];
  } catch {
    return [];
  }
}

export function saveUserPack(name: string, blocks: Block[], scope = 'admin'): UserDecorPack[] {
  const pack: UserDecorPack = {
    id: `pack-${crypto.randomUUID()}`,
    name: name.trim() || 'Mi decoración',
    createdAt: Date.now(),
    blocks: JSON.parse(JSON.stringify(blocks)),
  };
  const next = [pack, ...listUserPacks(scope)].slice(0, 40);
  try { window.localStorage.setItem(builderLibraryKey(KEY, scope), JSON.stringify(next)); } catch { /* cuota */ }
  return next;
}

export function deleteUserPack(id: string, scope = 'admin'): UserDecorPack[] {
  const next = listUserPacks(scope).filter(p => p.id !== id);
  try { window.localStorage.setItem(builderLibraryKey(KEY, scope), JSON.stringify(next)); } catch { /* cuota */ }
  return next;
}
