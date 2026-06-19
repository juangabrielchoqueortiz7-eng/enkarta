// Plantillas guardadas por el usuario (layout + tema + animación) para reutilizar
// en otras invitaciones. Se guardan en la NUBE (API /api/admin/templates → JSON en
// Supabase Storage), con respaldo en localStorage si la red falla.

import type { PageLayout, TemplateTheme, PageMotion } from './types';

export interface UserTemplate {
  id: string;
  name: string;
  createdAt: number;
  layout: PageLayout;
  theme?: TemplateTheme;
  motion?: PageMotion;
}

const KEY = 'enkarta_user_templates';
const API = '/api/admin/templates';

function readLocal(): UserTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? (v as UserTemplate[]) : [];
  } catch {
    return [];
  }
}
function writeLocal(all: UserTemplate[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* cuota */ }
}

/** Lee las plantillas de la nube (cae a local si falla). */
export async function listUserTemplates(): Promise<UserTemplate[]> {
  try {
    const res = await fetch(API, { cache: 'no-store' });
    if (!res.ok) throw new Error('fetch');
    const arr = await res.json();
    const list = Array.isArray(arr) ? (arr as UserTemplate[]) : [];
    writeLocal(list); // espejo local
    return list;
  } catch {
    return readLocal();
  }
}

async function persist(all: UserTemplate[]) {
  writeLocal(all);
  try {
    await fetch(API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(all) });
  } catch { /* queda al menos en local */ }
}

export async function saveUserTemplate(
  name: string,
  data: { layout: PageLayout; theme?: TemplateTheme; motion?: PageMotion },
): Promise<UserTemplate[]> {
  const current = await listUserTemplates();
  const tpl: UserTemplate = {
    id: `tpl-${Date.now().toString(36)}`,
    name: name.trim() || 'Plantilla',
    createdAt: Date.now(),
    layout: data.layout,
    theme: data.theme,
    motion: data.motion,
  };
  const next = [tpl, ...current].slice(0, 50);
  await persist(next);
  return next;
}

export async function deleteUserTemplate(id: string): Promise<UserTemplate[]> {
  const next = (await listUserTemplates()).filter(t => t.id !== id);
  await persist(next);
  return next;
}
