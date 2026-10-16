import type { RosterFilter } from './host-dashboard';
import { isUuid } from './rsvp-contract';

export const DEFAULT_ROSTER_FILTER: RosterFilter = { search: '', status: 'all', delivery: 'all', table: 'all', access: 'all', sort: 'name', group: 'all' };
export interface RosterQuery { filter: RosterFilter; page: number; selected: string[] }
export interface RosterController { query: RosterQuery; change: (query: RosterQuery) => void; pending: boolean; selectionPending: boolean }
/** A focused contact refresh must not remove the row that owns dialog focus. */
export function rosterListingKey(endpoint: string): string {
  const url = new URL(endpoint, 'https://enkarta.invalid');
  url.searchParams.delete('selected'); url.searchParams.sort();
  return url.pathname + '?' + url.searchParams;
}
export const defaultRosterQuery = (): RosterQuery => ({ filter: { ...DEFAULT_ROSTER_FILTER }, page: 1, selected: [] });
export function parseRosterQuery(params: URLSearchParams): RosterQuery {
  const filter = { ...DEFAULT_ROSTER_FILTER };
  for (const key of Object.keys(filter) as (keyof RosterFilter)[]) {
    const value = params.get(key);
    if (value === null) continue;
    if (value.length > (key === 'search' ? 120 : key === 'group' ? 40 : 24) || /[\x00-\x1f]/.test(value)) throw new Error('INVALID_INPUT');
    filter[key] = value;
  }
  for (const [key, allowed] of Object.entries({status:['all','pending','confirmed','declined'],delivery:['all','pending','opened','marked','responded'],access:['all','inside','waiting'],sort:['name','recent','table']})) {
    if (!allowed.includes(filter[key as keyof RosterFilter] || '')) throw new Error('INVALID_INPUT');
  }
  const raw = params.get('page') ?? '1';
  if (!/^[1-9]\d{0,6}$/.test(raw) || Number(raw) > 1000000) throw new Error('INVALID_INPUT');
  const selected = params.getAll('selected');
  if (selected.length > 2 || selected.some(id => !isUuid(id))) throw new Error('INVALID_INPUT');
  return { filter, page: Number(raw), selected: [...new Set(selected)] };
}
export function rosterParams(query: RosterQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query.filter)) if (value && value !== DEFAULT_ROSTER_FILTER[key as keyof RosterFilter]) params.set(key, value);
  if (query.page !== 1) params.set('page', String(query.page));
  query.selected.forEach(id => params.append('selected', id));
  return params;
}

/** Internal endpoints only. Preserve flags such as CSV format without a second '?'. */
export function rosterRequestUrl(endpoint: string, params: URLSearchParams) {
  if (!endpoint.startsWith('/') || endpoint.startsWith('//') || endpoint.includes('\\')) throw new Error('INVALID_ROSTER_ENDPOINT');
  const url = new URL(endpoint, 'https://enkarta.invalid');
  for (const key of new Set(params.keys())) { url.searchParams.delete(key); params.getAll(key).forEach(value => url.searchParams.append(key, value)); }
  return url.pathname + (url.search ? url.search : '');
}
