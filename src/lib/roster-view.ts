import type { HostGuest } from './host-dashboard';

export const ROSTER_PAGE_SIZE = 25;

/** Only presentation is paginated. Exports and WhatsApp use the full filtered list. */
export function rosterPage<T>(items: T[], requestedPage: number) {
  const pages = Math.max(1, Math.ceil(items.length / ROSTER_PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1));
  const offset = (page - 1) * ROSTER_PAGE_SIZE;
  return { items: items.slice(offset, offset + ROSTER_PAGE_SIZE), page, pages,
    from: items.length ? offset + 1 : 0, to: Math.min(offset + ROSTER_PAGE_SIZE, items.length), total: items.length };
}

/** One pass for the table summary, instead of scanning all guests for each table. */
export function rosterTables(guests: HostGuest[]) {
  const counts = new Map<string, number>();
  for (const guest of guests) {
    const table = guest.tableNo?.trim();
    if (!table) continue;
    counts.set(table, (counts.get(table) ?? 0) + (guest.status === 'confirmed' ? guest.confirmedPasses ?? guest.passes : 0));
  }
  return Array.from(counts, ([name, confirmed]) => ({ name, confirmed }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
}
