// La preview de Twitter/X usa la misma imagen generada que Open Graph.
// Next exige que `runtime`/`dynamic` sean literales declarados aquí (no re-exports).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export { default, alt, size, contentType } from './opengraph-image';
