import { builderLibraryKey } from './builder-library-key';
import { builderRequest } from './builder-request';
// Plantillas guardadas por el usuario (layout + tema + animación) para reutilizar
// en otras invitaciones. Se guardan en la NUBE (API /api/admin/templates → JSON en
// Supabase Storage), con respaldo en localStorage si la red falla.

import type { PageLayout, TemplateTheme, PageMotion, TemplateTokens } from './types';
import { migratePageLayout } from './layout-migrations';

export interface UserTemplate {
  id: string;
  name: string;
  createdAt: number;
  layout: PageLayout;
  theme?: TemplateTheme;
  motion?: PageMotion;
  tokens?: TemplateTokens;
}

const KEY = 'enkarta_user_templates';
const API = '/api/admin/templates';
// Only pending operations, no shared data cache. Serialize whole-library PUTs
// from one browser so two concurrent saves cannot overwrite each other.
const queues = new Map<string, Promise<unknown>>();
function serialize<T>(scope: string, task: () => Promise<T>): Promise<T> {
  const key = builderLibraryKey(KEY, scope);
  const next = (queues.get(key) ?? Promise.resolve()).catch(() => {}).then(task);
  const tracked = next.finally(() => { if (queues.get(key) === tracked) queues.delete(key); });
  queues.set(key, tracked); return tracked;
}

function readLocal(scope = 'admin'): UserTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const v = JSON.parse(window.localStorage.getItem(builderLibraryKey(KEY, scope)) || '[]');
    return Array.isArray(v) ? (v as UserTemplate[]) : [];
  } catch {
    return [];
  }
}
function writeLocal(all: UserTemplate[], scope = 'admin') {
  try { window.localStorage.setItem(builderLibraryKey(KEY, scope), JSON.stringify(all)); } catch { /* cuota */ }
}

/** Lee las plantillas de la nube (cae a local si falla). */
export async function listUserTemplates(scope = 'admin'): Promise<UserTemplate[]> {
  try {
    const before = JSON.stringify(readLocal(scope));
    const arr = await builderRequest<UserTemplate[]>(API, {}, value => Array.isArray(value) && value.every(item => typeof item?.id === 'string' && Array.isArray(item.layout?.blocks)));
    if (before !== JSON.stringify(readLocal(scope))) return readLocal(scope);
    const list = Array.isArray(arr)
      ? (arr as UserTemplate[]).map(t => ({ ...t, layout: migratePageLayout(t.layout) ?? t.layout }))
      : [];
    writeLocal(list, scope); // espejo local
    return list;
  } catch {
    return readLocal(scope);
  }
}

async function persist(all: UserTemplate[], scope = 'admin') {
  writeLocal(all, scope);
  try {
    await builderRequest<{ success: boolean }>(API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(all) }, value => value?.success === true);
  } catch { /* queda al menos en local */ }
}

export async function saveUserTemplate(
  name: string,
  data: { layout: PageLayout; theme?: TemplateTheme; motion?: PageMotion; tokens?: TemplateTokens },
  scope = 'admin',
): Promise<UserTemplate[]> {
  const snapshot = JSON.parse(JSON.stringify(data)) as typeof data;
  return serialize(scope, async () => {
  const current = await listUserTemplates(scope);
  const tpl: UserTemplate = {
    id: `tpl-${crypto.randomUUID()}`,
    name: name.trim() || 'Plantilla',
    createdAt: Date.now(),
    layout: migratePageLayout(snapshot.layout) ?? snapshot.layout,
    theme: snapshot.theme,
    motion: snapshot.motion,
    tokens: snapshot.tokens,
  };
  const next = [tpl, ...current].slice(0, 50);
  await persist(next, scope);
  return next;
  });
}

export async function deleteUserTemplate(id: string, scope = 'admin'): Promise<UserTemplate[]> {
  return serialize(scope, async () => {
  const next = (await listUserTemplates(scope)).filter(t => t.id !== id);
  await persist(next, scope);
  return next;
  });
}
