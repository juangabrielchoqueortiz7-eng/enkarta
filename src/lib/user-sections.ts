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

export function listUserSections(): UserSection[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed as UserSection[] : [];
  } catch {
    return [];
  }
}

export function saveUserSection(name: string, blocks: Block[]): UserSection[] {
  const section: UserSection = {
    id: `section-${Date.now().toString(36)}`,
    name: name.trim() || 'Mi sección',
    createdAt: Date.now(),
    blocks: cloneBlocks(blocks),
  };
  const next = [section, ...listUserSections()].slice(0, 40);
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* respaldo best-effort */ }
  void fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section }) }).catch(() => {});
  return next;
}

export function deleteUserSection(id: string): UserSection[] {
  const next = listUserSections().filter(section => section.id !== id);
  try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* respaldo best-effort */ }
  void fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  return next;
}

/** Mezcla la biblioteca de la nube con las secciones existentes del navegador. */
export async function hydrateUserSections(): Promise<{ sections: UserSection[]; cloud: boolean }> {
  const local = listUserSections();
  if (typeof window === 'undefined') return { sections: local, cloud: false };
  try {
    const response = await fetch(API, { cache: 'no-store' });
    if (!response.ok) throw new Error('cloud-unavailable');
    const payload = await response.json();
    const cloud = Array.isArray(payload) ? payload as UserSection[] : [];
    const merged = new Map(local.map(section => [section.id, section]));
    cloud.forEach(section => merged.set(section.id, section));
    const sections = Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 40);
    try { window.localStorage.setItem(KEY, JSON.stringify(sections)); } catch { /* respaldo best-effort */ }
    if (local.length) void fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sections: local }) }).catch(() => {});
    return { sections, cloud: true };
  } catch {
    return { sections: local, cloud: false };
  }
}
