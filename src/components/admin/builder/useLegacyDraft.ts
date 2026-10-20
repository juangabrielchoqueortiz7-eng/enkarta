'use client';

import { useEffect, useRef } from 'react';
import type { BuilderConfig, InvitationParsed } from '@/lib/types';
import { BuilderListState, type BuilderListItem, type BuilderListRow } from '@/lib/builder-list-state';

type Patch<T> = Partial<T> | ((current: T) => Partial<T> | null);
type VariantKey = 'annieMicky' | 'lauraAndres' | 'manuelMaya' | 'mariaMario' | 'nicoleFrancisco'
  | 'rolyYeliana' | 'paulaJuanFelipe' | 'karlaMauricio' | 'marianaJesus' | 'silk' | 'limone' | 'promesa' | 'atelier' | 'travelRoute';
interface DraftList<T> {
  rows: { key: string; item: T }[];
  patch: (key: string, fields: Partial<T>) => void;
  remove: (key: string) => void;
  add: (item: T) => void;
  move: (key: string, direction: -1 | 1) => void;
}
export interface LegacyDraft {
  get: () => InvitationParsed;
  patch: (change: Patch<InvitationParsed>) => void;
  config: (change: Patch<BuilderConfig>) => void;
  variant: <K extends VariantKey>(key: K) => (change: Patch<NonNullable<BuilderConfig[K]>>, fields?: Omit<Partial<InvitationParsed>, 'config'>) => void;
  list: <T extends object>(scope: string, read: (current: InvitationParsed) => T[], write: (current: InvitationParsed, next: T[]) => Partial<InvitationParsed>) => DraftList<T>;
}

/** A shared working draft for one legacy editor and its optional child panels. */
export function useLegacyDraft(data: InvitationParsed, onChange: (patch: Partial<InvitationParsed>) => void, inherited?: LegacyDraft): LegacyDraft {
  const mounted = useRef(true);
  const lists = useRef<BuilderListState | null>(null);
  if (!lists.current) lists.current = new BuilderListState();
  const context = useRef({ id: data.id, template: data.template, designKey: data.config?.designKey, epoch: 0 });
  if (context.current.id !== data.id || context.current.template !== data.template || context.current.designKey !== data.config?.designKey) {
    context.current = { id: data.id, template: data.template, designKey: data.config?.designKey, epoch: context.current.epoch + 1 };
    lists.current.clear();
  }
  const epoch = context.current.epoch;
  const latest = useRef({ data, onChange });
  latest.current = { data, onChange };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; lists.current?.clear(); };
  }, []);
  const get = () => inherited ? inherited.get() : latest.current.data;
  const patch = (change: Patch<InvitationParsed>) => {
    if (!mounted.current || context.current.epoch !== epoch) return;
    const current = get();
    if (current.id !== data.id || current.template !== data.template || current.config?.designKey !== data.config?.designKey) return;
    if (inherited) { inherited.patch(change); return; }
    const fields = typeof change === 'function' ? change(current) : change;
    if (!fields) return;
    const notify = latest.current.onChange;
    latest.current = { data: { ...current, ...fields }, onChange: notify };
    notify(fields);
  };
  const config = (change: Patch<BuilderConfig>) => patch(current => {
    const fields = typeof change === 'function' ? change(current.config) : change;
    return fields ? { config: { ...current.config, ...fields } } : null;
  });
  const variant: LegacyDraft['variant'] = key => (change, fields) => patch(current => {
    const value = (current.config[key] ?? {}) as NonNullable<BuilderConfig[typeof key]>;
    const next = typeof change === 'function' ? change(value) : change;
    return next ? { ...fields, config: { ...current.config, [key]: { ...value, ...next } } } : null;
  });
  const list: LegacyDraft['list'] = <T extends object>(scope: string, read: (current: InvitationParsed) => T[], write: (current: InvitationParsed, next: T[]) => Partial<InvitationParsed>) => {
    const rows = lists.current!.rows(scope, read(get()) as BuilderListItem[]) as BuilderListRow[] as { key: string; item: T }[];
    const change = (action: Parameters<BuilderListState['change']>[2]) => patch(current => {
      const next = lists.current!.change(scope, read(current) as BuilderListItem[], action);
      return next ? write(current, next as T[]) : null;
    });
    return {
      rows,
      patch: (key, fields) => change({ type: 'patch', key, patch: fields as BuilderListItem }),
      remove: key => change({ type: 'remove', key }),
      add: item => change({ type: 'add', item: item as BuilderListItem }),
      move: (key, direction) => change({ type: 'move', key, direction }),
    };
  };
  return { get, patch, config, variant, list };
}
