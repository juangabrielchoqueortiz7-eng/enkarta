import type { CommercialCursor, CommercialDashboard, CommercialDashboardQuery } from './commercial-dashboard';

export type CommercialPageLocation = {
  query: CommercialDashboardQuery;
  index: number;
  previous: (CommercialCursor | null)[];
};

export type CommercialNavigationState = {
  data: CommercialDashboard | null;
  location: CommercialPageLocation;
  pending: CommercialPageLocation | null;
  failed: CommercialPageLocation | null;
  error: string;
  sequence: number;
};

export type CommercialNavigationAction =
  | { type: 'start'; sequence: number; target: CommercialPageLocation }
  | { type: 'loaded'; sequence: number; data: CommercialDashboard }
  | { type: 'failed'; sequence: number; message: string };

export function initialCommercialLocation(): CommercialPageLocation {
  return { query: { status: 'all', cursor: null }, index: 0, previous: [] };
}

const snapshotLocation = (location: CommercialPageLocation): CommercialPageLocation => ({
  query: { status: location.query.status, cursor: location.query.cursor ? { ...location.query.cursor } : null },
  index: location.index,
  previous: location.previous.map(cursor => cursor ? { ...cursor } : null),
});

export function createCommercialNavigation(): CommercialNavigationState {
  const location = initialCommercialLocation();
  return { data: null, location, pending: snapshotLocation(location), failed: null, error: '', sequence: 0 };
}

/** Keep the last successful page visible and retain the exact unsuccessful destination. */
export function commercialNavigationReducer(state: CommercialNavigationState, action: CommercialNavigationAction): CommercialNavigationState {
  if (action.type === 'start') {
    if (!Number.isSafeInteger(action.sequence) || action.sequence <= state.sequence) return state;
    return { ...state, sequence: action.sequence, pending: snapshotLocation(action.target), failed: null, error: '' };
  }
  if (action.sequence !== state.sequence || !state.pending) return state;
  if (action.type === 'failed') return { ...state, failed: state.pending, pending: null, error: action.message };
  return { ...state, data: action.data, location: state.pending, pending: null, failed: null, error: '' };
}

/** Explicit retries use the requested page; refreshes can still choose the first page. */
export function commercialRetryLocation(state: CommercialNavigationState): CommercialPageLocation {
  return state.failed ?? state.location;
}
