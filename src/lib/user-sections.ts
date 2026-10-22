import { builderLibraryKey } from './builder-library-key';
import { builderRequest } from './builder-request';
import type { Block } from './types';

export interface UserSection {
  id: string;
  name: string;
  createdAt: number;
  blocks: Block[];
}

const KEY = 'enkarta_user_sections_v1';
const API = '/api/admin/sections';

function cloneBlocks(blocks: Block[]): Block[] {
  return JSON.parse(JSON.stringify(blocks)) as Block[];
}

export function listUserSections(scope = 'admin'): UserSection[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(builderLibraryKey(KEY, scope)) || '[]');
    return Array.isArray(parsed) ? parsed as UserSection[] : [];
  } catch {
    return [];
  }
}

export function saveUserSection(name: string, blocks: Block[], scope = 'admin'): UserSection[] {
  const section: UserSection = {
    id: `section-${crypto.randomUUID()}`,
    name: name.trim() || 'Mi sección',
    createdAt: Date.now(),
    blocks: cloneBlocks(blocks),
  };
  const next = [section, ...listUserSections(scope)].slice(0, 40);
  try { window.localStorage.setItem(builderLibraryKey(KEY, scope), JSON.stringify(next)); } catch { /* respaldo best-effort */ }
  void builderRequest<{ success: boolean }>(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section }) }, value => value?.success === true).catch(() => {});
  return next;
}

export function deleteUserSection(id: string, scope = 'admin'): UserSection[] {
  const next = listUserSections(scope).filter(section => section.id !== id);
  try { window.localStorage.setItem(builderLibraryKey(KEY, scope), JSON.stringify(next)); } catch { /* respaldo best-effort */ }
  void builderRequest<{ success: boolean }>(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' }, value => value?.success === true).catch(() => {});
  return next;
}

export async function persistUserSection(name: string, blocks: Block[], scope = 'admin'): Promise<UserSection[]> {
  const section: UserSection = { id: `section-${crypto.randomUUID()}`, name: name.trim() || 'Mi sección', createdAt: Date.now(), blocks: cloneBlocks(blocks) };
  await builderRequest<{ success: boolean }>(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section }) }, value => value?.success === true);
  const next = [section, ...listUserSections(scope)].slice(0, 40);
  try { window.localStorage.setItem(builderLibraryKey(KEY, scope), JSON.stringify(next)); } catch { /* The confirmed cloud row is still available. */ }
  return next;
}

export async function persistDeleteUserSection(id: string, scope = 'admin'): Promise<UserSection[]> {
  await builderRequest<{ success: boolean }>(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' }, value => value?.success === true);
  const next = listUserSections(scope).filter(section => section.id !== id);
  try { window.localStorage.setItem(builderLibraryKey(KEY, scope), JSON.stringify(next)); } catch { /* The cloud deletion was confirmed. */ }
  return next;
}

/** Mezcla la biblioteca de la nube con las secciones existentes del navegador. */
export async function hydrateUserSections(scope = 'admin'): Promise<{ sections: UserSection[]; cloud: boolean }> {
  const local = listUserSections(scope);
  if (typeof window === 'undefined') return { sections: local, cloud: false };
  try {
    const payload = await builderRequest<UserSection[]>(API, {}, value => Array.isArray(value) && value.every(item => typeof item?.id === 'string' && typeof item.name === 'string' && Array.isArray(item.blocks) && Number.isFinite(item.createdAt)));
    if (JSON.stringify(listUserSections(scope)) !== JSON.stringify(local)) return { sections: listUserSections(scope), cloud: false };
    const cloud = Array.isArray(payload) ? payload as UserSection[] : [];
    const merged = new Map(local.map(section => [section.id, section]));
    cloud.forEach(section => merged.set(section.id, section));
    const sections = Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 40);
    try { window.localStorage.setItem(builderLibraryKey(KEY, scope), JSON.stringify(sections)); } catch { /* respaldo best-effort */ }
    // Reads never migrate stale local rows over another browser deletion.
    return { sections, cloud: true };
  } catch {
    return { sections: listUserSections(scope), cloud: false };
  }
}
