/**
 * Colección de música de fondo de Enkarta.
 *
 * Las pistas viven en `public/musica/` y se sirven como estáticos (`/musica/x.mp3`),
 * así que suenan sin depender de ningún CDN externo. Se usan en tres sitios:
 *   - las demos de `/muestra/[template]` (una pista fija por plantilla, ver DEMO_MUSIC),
 *   - el selector rápido del panel Media del builder,
 *   - y como pista por defecto de cualquier invitación con música y sin canción propia.
 *
 * Para añadir una canción: copia el mp3 a `public/musica/` y agrega una entrada aquí.
 */
export interface MusicTrack {
  /** Id corto y estable (se usa como key en el selector). */
  id: string;
  /** Nombre visible en el panel del builder. */
  label: string;
  /** Ruta pública del audio. */
  url: string;
}

export const MUSIC_LIBRARY: MusicTrack[] = [
  { id: 'pista1', label: 'Pista 1', url: '/musica/musica1.mp3' },
  { id: 'pista2', label: 'Pista 2', url: '/musica/musica2.mp3' },
  { id: 'pista3', label: 'Pista 3', url: '/musica/musica3.mp3' },
  { id: 'pista4', label: 'Pista 4', url: '/musica/musica4.mp3' },
  { id: 'pista5', label: 'Pista 5', url: '/musica/musica5.mp3' },
  { id: 'pista6', label: 'Pista 6', url: '/musica/musica6.mp3' },
];

/** Atajo por id para asignar pistas sin repetir rutas a mano. */
export const TRACK: Record<string, string> = Object.fromEntries(
  MUSIC_LIBRARY.map(t => [t.id, t.url]),
);

/**
 * Música de fondo por defecto: la usa toda invitación con música activada que
 * no eligió canción en el builder (config.musicUrl).
 */
export const DEFAULT_MUSIC_URL = MUSIC_LIBRARY[0].url;
