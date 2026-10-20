export type BuilderListItem = Record<string, unknown>;
export interface BuilderListRow { key: string; item: BuilderListItem }
export type BuilderListAction =
  | { type: 'patch'; key: string; patch: BuilderListItem }
  | { type: 'remove'; key: string }
  | { type: 'move'; key: string; direction: -1 | 1 }
  | { type: 'add' };
export type BuilderListIdentity = (item: BuilderListItem) => string | undefined;

/** Editor-only identities. Neither keys nor tracking metadata enter saved JSON. */
export class BuilderListState {
  private serial = 0;
  private lists = new Map<string, { source: BuilderListItem[]; rows: BuilderListRow[] }>();
  private views = new Map<string, { source: BuilderListItem[]; basis: string[]; snapshot: string | undefined; items: BuilderListItem[] }>();

  clear() { this.lists.clear(); this.views.clear(); }

  derived(scope: string, source: BuilderListItem[], basis: string[], normalize: () => BuilderListItem[]): BuilderListItem[] {
    const previous = this.views.get(scope), snapshot = JSON.stringify(source);
    // Content is only a freshness check for this known derived view. It never
    // supplies identity to arbitrary editable rows or externally replaced arrays.
    if (previous?.source === source && previous.snapshot === snapshot && previous.basis.length === basis.length && previous.basis.every((value, index) => value === basis[index])) return previous.items;
    const items = normalize();
    this.views.set(scope, { source, basis: [...basis], snapshot, items });
    return items;
  }

  adoptDerived(scope: string, source: BuilderListItem[], basis: string[]) {
    this.views.set(scope, { source, basis: [...basis], snapshot: JSON.stringify(source), items: source });
  }

  rows(scope: string, source: BuilderListItem[], identity?: BuilderListIdentity): BuilderListRow[] {
    const previous = this.lists.get(scope);
    if (previous?.source === source && previous.rows.length === source.length && previous.rows.every((row, index) => row.item === source[index])) return previous.rows;
    const before = previous?.rows ?? [];
    const oldRefs = new Map<BuilderListItem, BuilderListRow[]>(), newRefs = new Map<BuilderListItem, number>();
    for (const row of before) oldRefs.set(row.item, [...(oldRefs.get(row.item) ?? []), row]);
    for (const item of source) newRefs.set(item, (newRefs.get(item) ?? 0) + 1);
    const oldIds = new Map<string, BuilderListRow[]>(), newIds = new Map<string, number>();
    if (identity) {
      for (const row of before) { const id = identity(row.item); if (id !== undefined) oldIds.set(id, [...(oldIds.get(id) ?? []), row]); }
      for (const item of source) { const id = identity(item); if (id !== undefined) newIds.set(id, (newIds.get(id) ?? 0) + 1); }
    }
    const used = new Set<string>();
    const rows = source.map(item => {
      const references = oldRefs.get(item);
      let match = references?.length === 1 && newRefs.get(item) === 1 ? references[0] : undefined;
      if (!match && identity) {
        const id = identity(item), candidates = id === undefined ? undefined : oldIds.get(id);
        if (id !== undefined && candidates?.length === 1 && newIds.get(id) === 1) match = candidates[0];
      }
      if (match && !used.has(match.key)) { used.add(match.key); return { key: match.key, item }; }
      return { key: `list-row-${++this.serial}`, item };
    });
    this.lists.set(scope, { source, rows });
    return rows;
  }

  change(scope: string, source: BuilderListItem[], action: BuilderListAction, identity?: BuilderListIdentity): BuilderListItem[] | null {
    const rows = this.rows(scope, source, identity);
    let next: BuilderListRow[];
    if (action.type === 'add') next = [...rows, { key: `list-row-${++this.serial}`, item: {} }];
    else {
      const index = rows.findIndex(row => row.key === action.key);
      if (index < 0) return null;
      if (action.type === 'patch') next = rows.map((row, position) => position === index ? { ...row, item: { ...row.item, ...action.patch } } : row);
      else if (action.type === 'remove') next = rows.filter((_, position) => position !== index);
      else {
        const target = index + action.direction;
        if (target < 0 || target >= rows.length) return null;
        next = [...rows]; [next[index], next[target]] = [next[target], next[index]];
      }
    }
    const values = next.map(row => row.item);
    this.lists.set(scope, { source: values, rows: next });
    return values;
  }
}
