/** Existing unscoped libraries belong to the Enkarta team, never to a new partner. */
export function builderLibraryKey(key: string, scope = 'admin') {
  if (scope === 'admin') return key;
  if (!/^partner:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(scope)) throw new Error('Biblioteca sin propietario válido');
  return `${key}:${scope}`;
}
